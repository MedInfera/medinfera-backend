const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { generateAdmissionNumber } = require('../../utils/codeGenerator');
const { audit } = require('../../utils/auditLogger');
const { emitToHospital } = require('../../config/socket');

// ─── Service ─────────────────────────────────────────────────────────────────

const admit = async (data, actor) => {
  const hospitalId = actor.hospitalId;

  // Validate bed is available
  const bed = await prisma.bed.findFirst({ where: { id: data.bedId, hospitalId, status: 'AVAILABLE' } });
  if (!bed) throw AppError.badRequest('Bed is not available');

  // Validate doctor exists
  const doctor = await prisma.doctorProfile.findFirst({ where: { id: data.primaryDoctorId, hospitalId } });
  if (!doctor) throw AppError.notFound('Doctor not found');

  const admissionNumber = await generateAdmissionNumber(hospitalId);

  const [admission] = await prisma.$transaction([
    prisma.ipdAdmission.create({
      data: {
        ...data,
        hospitalId,
        wardId: bed.wardId,
        admissionNumber,
        admittedBy: actor.id,
        status: 'ADMITTED',
      },
      include: {
        patient: { select: { firstName: true, lastName: true, patientCode: true } },
        primaryDoctor: { include: { user: { select: { firstName: true, lastName: true } } } },
        bed: true,
        ward: true,
      },
    }),
    // Mark bed as occupied
    prisma.bed.update({ where: { id: data.bedId }, data: { status: 'OCCUPIED' } }),
  ]);

  emitToHospital(hospitalId, 'ipd:admitted', { admissionNumber, patientId: data.patientId, bedId: data.bedId });

  await audit({
    hospitalId, userId: actor.id,
    action: 'PATIENT_ADMITTED', entityType: 'ipd_admissions', entityId: admission.id,
    newValues: { admissionNumber, patientId: data.patientId },
  });

  return admission;
};

const findAll = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);
  const hospitalId = actor.hospitalId;

  const where = { hospitalId };
  if (query.status) where.status = query.status;
  if (query.wardId) where.wardId = query.wardId;
  if (query.doctorId) where.primaryDoctorId = query.doctorId;
  if (query.active === 'true') where.status = { notIn: ['DISCHARGED','DECEASED','TRANSFERRED'] };

  const [data, total] = await Promise.all([
    prisma.ipdAdmission.findMany({
      where, skip, take,
      orderBy: { admissionDate: 'desc' },
      include: {
        patient: { select: { id: true, patientCode: true, firstName: true, lastName: true, phone: true, bloodGroup: true } },
        primaryDoctor: { include: { user: { select: { firstName: true, lastName: true } } } },
        bed: { select: { bedNumber: true, bedType: true } },
        ward: { select: { name: true, wardType: true } },
      },
    }),
    prisma.ipdAdmission.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const findById = async (id, actor) => {
  const admission = await prisma.ipdAdmission.findFirst({
    where: { id, hospitalId: actor.hospitalId },
    include: {
      patient: true,
      primaryDoctor: { include: { user: { select: { firstName: true, lastName: true } } } },
      bed: true,
      ward: true,
      attendingDoctors: {
        where: { removedAt: null },
        include: { doctor: { include: { user: { select: { firstName: true, lastName: true } } } } },
      },
      bedTransfers: { orderBy: { transferredAt: 'desc' } },
      vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 5 },
      notes: { orderBy: { writtenAt: 'desc' }, take: 20 },
      prescriptions: { include: { items: { include: { medicine: true } } } },
      labOrders: { include: { items: { include: { labTest: true } } } },
    },
  });
  if (!admission) throw AppError.notFound('Admission not found');
  return admission;
};

const updateStatus = async (id, data, actor) => {
  const admission = await findById(id, actor);
  if (['DISCHARGED','DECEASED'].includes(admission.status)) {
    throw AppError.badRequest('Cannot update status of a closed admission');
  }
  return prisma.ipdAdmission.update({ where: { id }, data: { status: data.status } });
};

const discharge = async (id, data, actor, req) => {
  const admission = await findById(id, actor);
  if (['DISCHARGED','DECEASED','TRANSFERRED'].includes(admission.status)) {
    throw AppError.badRequest('Admission is already closed');
  }

  const [updated] = await prisma.$transaction([
    prisma.ipdAdmission.update({
      where: { id },
      data: {
        status: 'DISCHARGED',
        dischargeDate: new Date(),
        finalDiagnosis: data.finalDiagnosis,
        treatmentSummary: data.treatmentSummary,
        dischargeNotes: data.dischargeNotes,
        dischargedBy: actor.id,
      },
    }),
    // Free up the bed
    prisma.bed.update({ where: { id: admission.bedId }, data: { status: 'AVAILABLE' } }),
  ]);

  emitToHospital(actor.hospitalId, 'ipd:discharged', { admissionId: id, bedId: admission.bedId });

  await audit({
    hospitalId: actor.hospitalId, userId: actor.id,
    action: 'PATIENT_DISCHARGED', entityType: 'ipd_admissions', entityId: id, req,
  });

  return updated;
};

const transferBed = async (id, data, actor) => {
  const admission = await findById(id, actor);
  if (['DISCHARGED','DECEASED'].includes(admission.status)) {
    throw AppError.badRequest('Cannot transfer bed for a closed admission');
  }

  const newBed = await prisma.bed.findFirst({
    where: { id: data.toBedId, hospitalId: actor.hospitalId, status: 'AVAILABLE' },
  });
  if (!newBed) throw AppError.badRequest('Target bed is not available');

  await prisma.$transaction([
    // Free old bed
    prisma.bed.update({ where: { id: admission.bedId }, data: { status: 'AVAILABLE' } }),
    // Occupy new bed
    prisma.bed.update({ where: { id: data.toBedId }, data: { status: 'OCCUPIED' } }),
    // Update admission
    prisma.ipdAdmission.update({
      where: { id },
      data: { bedId: data.toBedId, wardId: newBed.wardId },
    }),
    // Log transfer
    prisma.ipdBedTransfer.create({
      data: {
        admissionId: id,
        hospitalId: actor.hospitalId,
        fromBedId: admission.bedId,
        toBedId: data.toBedId,
        fromWardId: admission.wardId,
        toWardId: newBed.wardId,
        reason: data.reason,
        transferredBy: actor.id,
      },
    }),
  ]);

  return findById(id, actor);
};

const addAttendingDoctor = async (id, data, actor) => {
  await findById(id, actor);
  return prisma.ipdAttendingDoctor.create({
    data: { admissionId: id, doctorId: data.doctorId, addedBy: actor.id },
  });
};

const addNote = async (id, data, actor) => {
  await findById(id, actor);
  return prisma.ipdNote.create({
    data: { ...data, admissionId: id, hospitalId: actor.hospitalId, writtenBy: actor.id },
  });
};

module.exports = { admit, findAll, findById, updateStatus, discharge, transferBed, addAttendingDoctor, addNote };
