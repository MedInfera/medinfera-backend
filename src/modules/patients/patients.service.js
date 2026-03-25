const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { generatePatientCode } = require('../../utils/codeGenerator');
const { audit } = require('../../utils/auditLogger');

const patientSelect = {
  id: true, patientCode: true, firstName: true, lastName: true,
  gender: true, dateOfBirth: true, bloodGroup: true,
  phone: true, email: true, address: true, city: true, state: true,
  allergies: true, chronicConditions: true,
  emergencyContactName: true, emergencyContactPhone: true, emergencyContactRelation: true,
  insuranceProvider: true, insurancePolicyNumber: true, insuranceValidUntil: true,
  isActive: true, notes: true, createdAt: true,
};

const create = async (data, actor) => {
  const hospitalId = actor.hospitalId;
  const patientCode = await generatePatientCode(hospitalId);

  const patient = await prisma.patientProfile.create({
    data: { ...data, hospitalId, patientCode, registeredBy: actor.id },
    select: patientSelect,
  });

  await audit({
    hospitalId, userId: actor.id,
    action: 'PATIENT_REGISTERED', entityType: 'patient_profiles', entityId: patient.id,
    newValues: { patientCode: patient.patientCode, name: `${patient.firstName} ${patient.lastName}` },
  });

  return patient;
};

const findAll = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);
  const hospitalId = actor.hospitalId;

  const where = { hospitalId, deletedAt: null };
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  if (query.gender) where.gender = query.gender;
  if (query.bloodGroup) where.bloodGroup = query.bloodGroup;
  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
      { phone: { contains: query.search } },
      { patientCode: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.patientProfile.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, patientCode: true, firstName: true, lastName: true,
        gender: true, dateOfBirth: true, bloodGroup: true, phone: true,
        email: true, city: true, isActive: true, createdAt: true,
      },
    }),
    prisma.patientProfile.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const findById = async (id, actor) => {
  const patient = await prisma.patientProfile.findFirst({
    where: { id, hospitalId: actor.hospitalId, deletedAt: null },
    select: patientSelect,
  });
  if (!patient) throw AppError.notFound('Patient not found');
  return patient;
};

const update = async (id, data, actor, req) => {
  await findById(id, actor);
  const updated = await prisma.patientProfile.update({
    where: { id },
    data,
    select: patientSelect,
  });
  await audit({
    hospitalId: actor.hospitalId, userId: actor.id,
    action: 'PATIENT_UPDATED', entityType: 'patient_profiles', entityId: id,
    newValues: data, req,
  });
  return updated;
};

const softDelete = async (id, actor, req) => {
  await findById(id, actor);
  await prisma.patientProfile.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  await audit({
    hospitalId: actor.hospitalId, userId: actor.id,
    action: 'PATIENT_DELETED', entityType: 'patient_profiles', entityId: id, req,
  });
};

const addVitalSigns = async (patientId, data, actor) => {
  await findById(patientId, actor);

  // Auto-calculate BMI
  let bmi = undefined;
  if (data.weightKg && data.heightCm) {
    const heightM = data.heightCm / 100;
    bmi = parseFloat((data.weightKg / (heightM * heightM)).toFixed(1));
  }

  return prisma.vitalSign.create({
    data: {
      ...data,
      bmi,
      patientId,
      hospitalId: actor.hospitalId,
      recordedBy: actor.id,
    },
  });
};

const getVitalHistory = async (patientId, query, actor) => {
  await findById(patientId, actor);
  const { skip, take } = getPagination(query);

  return prisma.vitalSign.findMany({
    where: { patientId, hospitalId: actor.hospitalId },
    orderBy: { recordedAt: 'desc' },
    skip,
    take,
  });
};

const getMedicalHistory = async (patientId, actor) => {
  await findById(patientId, actor);
  const hospitalId = actor.hospitalId;

  const [appointments, admissions, prescriptions, labOrders, invoices] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId, hospitalId },
      orderBy: { appointmentDate: 'desc' },
      take: 10,
      include: { doctor: { include: { user: { select: { firstName: true, lastName: true } } } } },
    }),
    prisma.ipdAdmission.findMany({
      where: { patientId, hospitalId },
      orderBy: { admissionDate: 'desc' },
      take: 5,
      include: { ward: true, bed: true },
    }),
    prisma.prescription.findMany({
      where: { patientId, hospitalId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { items: { include: { medicine: true } } },
    }),
    prisma.labOrder.findMany({
      where: { patientId, hospitalId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { items: { include: { labTest: true } } },
    }),
    prisma.invoice.aggregate({
      where: { patientId, hospitalId },
      _sum: { totalAmount: true, paidAmount: true, dueAmount: true },
    }),
  ]);

  return { appointments, admissions, prescriptions, labOrders, billing: invoices._sum };
};

module.exports = { create, findAll, findById, update, softDelete, addVitalSigns, getVitalHistory, getMedicalHistory };
