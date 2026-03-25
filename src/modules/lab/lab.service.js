const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { generateLabOrderNumber } = require('../../utils/codeGenerator');
const { emitToHospital } = require('../../config/socket');

// ─── Lab Tests ────────────────────────────────────────────────────────────────

const createLabTest = async (data, actor) => {
  return prisma.labTest.create({
    data: { ...data, hospitalId: actor.hospitalId },
  });
};

const getLabTests = async (query, actor) => {
  const where = { hospitalId: actor.hospitalId, isActive: true };
  if (query.category) where.category = { contains: query.category, mode: 'insensitive' };
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { code: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  return prisma.labTest.findMany({ where, orderBy: { name: 'asc' } });
};

const updateLabTest = async (id, data, actor) => {
  const test = await prisma.labTest.findFirst({ where: { id, hospitalId: actor.hospitalId } });
  if (!test) throw AppError.notFound('Lab test not found');
  return prisma.labTest.update({ where: { id }, data });
};

// ─── Lab Orders ───────────────────────────────────────────────────────────────

const createLabOrder = async (data, actor) => {
  const hospitalId = actor.hospitalId;
  const orderNumber = await generateLabOrderNumber(hospitalId);

  // Get doctor profile
  const doctor = await prisma.doctorProfile.findFirst({ where: { userId: actor.id, hospitalId } });

  // Validate all tests exist and belong to hospital
  const tests = await prisma.labTest.findMany({
    where: { id: { in: data.testIds }, hospitalId, isActive: true },
  });
  if (tests.length !== data.testIds.length) {
    throw AppError.badRequest('One or more lab tests not found in this hospital');
  }

  return prisma.labOrder.create({
    data: {
      hospitalId,
      patientId: data.patientId,
      doctorId: doctor?.id || data.doctorId,
      appointmentId: data.appointmentId || null,
      admissionId: data.admissionId || null,
      orderNumber,
      priority: data.priority,
      clinicalInfo: data.clinicalInfo || null,
      orderedBy: actor.id,
      items: { create: data.testIds.map((testId) => ({ labTestId: testId })) },
    },
    include: {
      patient: { select: { firstName: true, lastName: true, patientCode: true } },
      items: { include: { labTest: { select: { name: true, code: true, sampleType: true } } } },
    },
  });
};

const getLabOrders = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);
  const where = { hospitalId: actor.hospitalId };

  if (query.status) where.status = query.status;
  if (query.patientId) where.patientId = query.patientId;
  if (query.priority) where.priority = query.priority;
  if (query.admissionId) where.admissionId = query.admissionId;

  const [data, total] = await Promise.all([
    prisma.labOrder.findMany({
      where,
      skip,
      take,
      include: {
        patient: { select: { firstName: true, lastName: true, patientCode: true } },
        items: { include: { labTest: { select: { name: true, code: true } } } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.labOrder.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const getLabOrderById = async (id, actor) => {
  const order = await prisma.labOrder.findFirst({
    where: { id, hospitalId: actor.hospitalId },
    include: {
      patient: { select: { firstName: true, lastName: true, patientCode: true, dateOfBirth: true, gender: true, bloodGroup: true } },
      items: { include: { labTest: true } },
    },
  });
  if (!order) throw AppError.notFound('Lab order not found');
  return order;
};

const STATUS_TRANSITIONS = {
  ORDERED:           ['SAMPLE_COLLECTED', 'CANCELLED'],
  SAMPLE_COLLECTED:  ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS:       ['COMPLETED'],
  COMPLETED:         [],
  CANCELLED:         [],
  REJECTED:          [],
};

const updateLabOrderStatus = async (id, status, actor) => {
  const order = await getLabOrderById(id, actor);

  if (!STATUS_TRANSITIONS[order.status]?.includes(status)) {
    throw AppError.badRequest(`Cannot transition from ${order.status} to ${status}`);
  }

  const updateData = { status };
  if (status === 'SAMPLE_COLLECTED') {
    updateData.sampleCollectedAt = new Date();
    updateData.collectedBy = actor.id;
  }
  if (status === 'IN_PROGRESS') {
    updateData.processedBy = actor.id;
  }
  if (status === 'COMPLETED') {
    updateData.completedAt = new Date();
  }

  return prisma.labOrder.update({ where: { id }, data: updateData });
};

const enterResults = async (id, data, actor) => {
  const order = await getLabOrderById(id, actor);

  if (!['IN_PROGRESS', 'SAMPLE_COLLECTED'].includes(order.status)) {
    throw AppError.badRequest('Can only enter results for orders IN_PROGRESS or SAMPLE_COLLECTED');
  }

  await prisma.$transaction(async (tx) => {
    for (const result of data.results) {
      await tx.labOrderItem.update({
        where: { id: result.itemId },
        data: {
          resultValue: result.resultValue,
          resultNotes: result.resultNotes || null,
          isAbnormal: result.isAbnormal ?? null,
          completedAt: new Date(),
        },
      });
    }

    // Check if all items have results
    const allItems = await tx.labOrderItem.findMany({ where: { labOrderId: id } });
    const allComplete = allItems.every((i) => i.resultValue !== null);

    if (allComplete) {
      await tx.labOrder.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          reportedAt: new Date(),
          reviewedBy: actor.id,
        },
      });

      const hasAbnormal = data.results.some((r) => r.isAbnormal === true);
      emitToHospital(actor.hospitalId, 'lab:results_ready', {
        orderId: id,
        patientId: order.patientId,
        orderNumber: order.orderNumber,
        hasAbnormal,
      });
    }
  });

  return getLabOrderById(id, actor);
};

module.exports = {
  createLabTest,
  getLabTests,
  updateLabTest,
  createLabOrder,
  getLabOrders,
  getLabOrderById,
  updateLabOrderStatus,
  enterResults,
};
