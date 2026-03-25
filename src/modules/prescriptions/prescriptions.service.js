const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { getPagination, paginationMeta } = require('../../utils/pagination');

const prescriptionInclude = {
  patient: { select: { firstName: true, lastName: true, patientCode: true } },
  doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
  items: { include: { medicine: { select: { name: true, category: true, unitOfMeasure: true } } } },
};

const createPrescription = async (data, actor) => {
  const hospitalId = actor.hospitalId;

  const doctor = await prisma.doctorProfile.findFirst({
    where: { userId: actor.id, hospitalId },
  });
  if (!doctor) throw AppError.forbidden('Only doctors with a profile can create prescriptions');

  return prisma.prescription.create({
    data: {
      hospitalId,
      patientId: data.patientId,
      doctorId: doctor.id,
      appointmentId: data.appointmentId || null,
      admissionId: data.admissionId || null,
      validUntil: data.validUntil || null,
      notes: data.notes || null,
      items: { create: data.items },
    },
    include: {
      ...prescriptionInclude,
      dispensings: true,
    },
  });
};

const getPrescriptions = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);
  const where = { hospitalId: actor.hospitalId };

  if (query.patientId) where.patientId = query.patientId;
  if (query.doctorId) where.doctorId = query.doctorId;
  if (query.status) where.status = query.status;
  if (query.admissionId) where.admissionId = query.admissionId;
  if (query.appointmentId) where.appointmentId = query.appointmentId;

  // Doctors only see their own prescriptions
  if (actor.role === 'DOCTOR') {
    const dp = await prisma.doctorProfile.findFirst({ where: { userId: actor.id, hospitalId: actor.hospitalId } });
    if (dp) where.doctorId = dp.id;
  }

  const [data, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      skip,
      take,
      include: prescriptionInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.prescription.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const getPrescriptionById = async (id, actor) => {
  const prescription = await prisma.prescription.findFirst({
    where: { id, hospitalId: actor.hospitalId },
    include: {
      ...prescriptionInclude,
      dispensings: {
        include: {
          items: {
            include: {
              medicine: { select: { name: true } },
              batch: { select: { batchNumber: true, expiryDate: true } },
            },
          },
        },
      },
    },
  });
  if (!prescription) throw AppError.notFound('Prescription not found');
  return prescription;
};

const dispensePrescription = async (data, actor) => {
  const hospitalId = actor.hospitalId;

  const prescription = await prisma.prescription.findFirst({
    where: { id: data.prescriptionId, hospitalId },
    include: { items: true },
  });
  if (!prescription) throw AppError.notFound('Prescription not found');
  if (['FULLY_DISPENSED', 'CANCELLED', 'EXPIRED'].includes(prescription.status)) {
    throw AppError.badRequest(`Prescription is ${prescription.status} and cannot be dispensed`);
  }

  return prisma.$transaction(async (tx) => {
    const dispensingItems = [];

    for (const item of data.items) {
      const batch = await tx.medicineBatch.findFirst({
        where: {
          id: item.batchId,
          medicineId: item.medicineId,
          quantity: { gte: item.quantity },
        },
      });
      if (!batch) {
        throw AppError.badRequest(`Insufficient stock in selected batch for medicine ${item.medicineId}`);
      }

      // Deduct batch
      await tx.medicineBatch.update({
        where: { id: item.batchId },
        data: { quantity: { decrement: item.quantity } },
      });

      // Deduct medicine stock
      await tx.medicine.update({
        where: { id: item.medicineId },
        data: { currentStock: { decrement: item.quantity } },
      });

      // Update dispensed quantity on prescription item
      await tx.prescriptionItem.update({
        where: { id: item.prescriptionItemId },
        data: { quantityDispensed: { increment: item.quantity } },
      });

      dispensingItems.push({
        prescriptionItemId: item.prescriptionItemId,
        medicineId: item.medicineId,
        batchId: item.batchId,
        quantity: item.quantity,
        unitPrice: batch.sellingPrice,
        totalPrice: Number(batch.sellingPrice) * item.quantity,
      });
    }

    // Create dispense record
    const dispensing = await tx.pharmacyDispensing.create({
      data: {
        hospitalId,
        prescriptionId: data.prescriptionId,
        patientId: prescription.patientId,
        dispensedBy: actor.id,
        notes: data.notes || null,
        items: { create: dispensingItems },
      },
      include: {
        items: { include: { medicine: { select: { name: true } } } },
      },
    });

    // Check and update prescription status
    const updatedItems = await tx.prescriptionItem.findMany({
      where: { prescriptionId: data.prescriptionId },
    });
    const allDone = updatedItems.every((i) => i.quantityDispensed >= i.quantityPrescribed);

    await tx.prescription.update({
      where: { id: data.prescriptionId },
      data: { status: allDone ? 'FULLY_DISPENSED' : 'PARTIALLY_DISPENSED' },
    });

    return dispensing;
  });
};

module.exports = {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  dispensePrescription,
};
