const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { emitToHospital } = require('../../config/socket');

// ─── Ambulances ───────────────────────────────────────────────────────────────

const createAmbulance = async (data, actor) => {
  return prisma.ambulance.create({
    data: { ...data, hospitalId: actor.hospitalId },
  });
};

const getAmbulances = async (query, actor) => {
  const where = { hospitalId: actor.hospitalId, isActive: true };
  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;

  return prisma.ambulance.findMany({
    where,
    include: {
      dispatches: {
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        select: { id: true, status: true, pickupAddress: true, requestedAt: true },
        take: 1,
      },
    },
    orderBy: { vehicleNumber: 'asc' },
  });
};

const getAmbulanceById = async (id, actor) => {
  const amb = await prisma.ambulance.findFirst({
    where: { id, hospitalId: actor.hospitalId },
    include: {
      dispatches: { orderBy: { requestedAt: 'desc' }, take: 5 },
    },
  });
  if (!amb) throw AppError.notFound('Ambulance not found');
  return amb;
};

const updateAmbulance = async (id, data, actor) => {
  await getAmbulanceById(id, actor);
  return prisma.ambulance.update({ where: { id }, data });
};

// ─── Dispatches ───────────────────────────────────────────────────────────────

const STATUS_TRANSITIONS = {
  REQUESTED:        ['DISPATCHED', 'CANCELLED'],
  DISPATCHED:       ['ARRIVED_AT_SCENE', 'CANCELLED'],
  ARRIVED_AT_SCENE: ['PATIENT_PICKED', 'CANCELLED'],
  PATIENT_PICKED:   ['COMPLETED'],
  COMPLETED:        [],
  CANCELLED:        [],
};

const createDispatch = async (data, actor) => {
  const hospitalId = actor.hospitalId;

  const ambulance = await prisma.ambulance.findFirst({
    where: { id: data.ambulanceId, hospitalId, status: 'AVAILABLE', isActive: true },
  });
  if (!ambulance) throw AppError.badRequest('Ambulance is not available for dispatch');

  const [dispatch] = await prisma.$transaction([
    prisma.ambulanceDispatch.create({
      data: {
        ...data,
        hospitalId,
        status: 'DISPATCHED',
        dispatchedBy: actor.id,
        dispatchedAt: new Date(),
      },
      include: {
        ambulance: { select: { vehicleNumber: true, type: true } },
        patient: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.ambulance.update({
      where: { id: data.ambulanceId },
      data: { status: 'DISPATCHED' },
    }),
  ]);

  emitToHospital(hospitalId, 'ambulance:dispatched', {
    dispatchId: dispatch.id,
    ambulanceId: data.ambulanceId,
    vehicleNumber: ambulance.vehicleNumber,
    pickupAddress: data.pickupAddress,
  });

  return dispatch;
};

const getDispatches = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);
  const where = { hospitalId: actor.hospitalId };

  if (query.status) where.status = query.status;
  if (query.ambulanceId) where.ambulanceId = query.ambulanceId;
  if (query.active === 'true') where.status = { notIn: ['COMPLETED', 'CANCELLED'] };

  const [data, total] = await Promise.all([
    prisma.ambulanceDispatch.findMany({
      where,
      skip,
      take,
      include: {
        ambulance: { select: { vehicleNumber: true, type: true } },
        patient: { select: { firstName: true, lastName: true, patientCode: true } },
      },
      orderBy: { requestedAt: 'desc' },
    }),
    prisma.ambulanceDispatch.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const getDispatchById = async (id, actor) => {
  const dispatch = await prisma.ambulanceDispatch.findFirst({
    where: { id, hospitalId: actor.hospitalId },
    include: {
      ambulance: true,
      patient: { select: { firstName: true, lastName: true, patientCode: true, phone: true } },
    },
  });
  if (!dispatch) throw AppError.notFound('Dispatch not found');
  return dispatch;
};

const updateDispatchStatus = async (id, data, actor) => {
  const dispatch = await getDispatchById(id, actor);

  if (!STATUS_TRANSITIONS[dispatch.status]?.includes(data.status)) {
    throw AppError.badRequest(`Cannot transition from ${dispatch.status} to ${data.status}`);
  }

  const updateData = { status: data.status };
  if (data.status === 'ARRIVED_AT_SCENE') updateData.arrivedAt = new Date();
  if (data.status === 'PATIENT_PICKED') updateData.patientLoadedAt = new Date();
  if (data.status === 'COMPLETED') {
    updateData.completedAt = new Date();
    // Free ambulance
    await prisma.ambulance.update({
      where: { id: dispatch.ambulanceId },
      data: { status: 'AVAILABLE' },
    });
  }
  if (data.status === 'CANCELLED') {
    // Free ambulance
    await prisma.ambulance.update({
      where: { id: dispatch.ambulanceId },
      data: { status: 'AVAILABLE' },
    });
  }

  const updated = await prisma.ambulanceDispatch.update({
    where: { id },
    data: updateData,
  });

  emitToHospital(actor.hospitalId, 'ambulance:status_update', {
    dispatchId: id,
    ambulanceId: dispatch.ambulanceId,
    status: data.status,
  });

  return updated;
};

// ─── GPS Tracking ─────────────────────────────────────────────────────────────

const updateLocation = async (ambulanceId, data, actor) => {
  const ambulance = await prisma.ambulance.findFirst({
    where: { id: ambulanceId, hospitalId: actor.hospitalId },
  });
  if (!ambulance) throw AppError.notFound('Ambulance not found');

  await prisma.$transaction([
    prisma.ambulance.update({
      where: { id: ambulanceId },
      data: {
        gpsLatitude: data.latitude,
        gpsLongitude: data.longitude,
        lastLocationUpdate: new Date(),
      },
    }),
    prisma.ambulanceLocationTrail.create({
      data: {
        ambulanceId,
        dispatchId: data.dispatchId || null,
        latitude: data.latitude,
        longitude: data.longitude,
        speedKmh: data.speedKmh || null,
        recordedAt: new Date(),
      },
    }),
  ]);

  emitToHospital(actor.hospitalId, 'ambulance:location_update', {
    ambulanceId,
    latitude: data.latitude,
    longitude: data.longitude,
    speedKmh: data.speedKmh,
    timestamp: new Date(),
  });
};

const getLocationTrail = async (ambulanceId, query, actor) => {
  const ambulance = await prisma.ambulance.findFirst({
    where: { id: ambulanceId, hospitalId: actor.hospitalId },
  });
  if (!ambulance) throw AppError.notFound('Ambulance not found');

  const where = { ambulanceId };
  if (query.dispatchId) where.dispatchId = query.dispatchId;

  return prisma.ambulanceLocationTrail.findMany({
    where,
    orderBy: { recordedAt: 'asc' },
    take: 500,
  });
};

module.exports = {
  createAmbulance,
  getAmbulances,
  getAmbulanceById,
  updateAmbulance,
  createDispatch,
  getDispatches,
  getDispatchById,
  updateDispatchStatus,
  updateLocation,
  getLocationTrail,
};
