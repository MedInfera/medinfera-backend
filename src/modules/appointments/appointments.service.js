const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { audit } = require('../../utils/auditLogger');
const { emitToHospital } = require('../../config/socket');

const apptInclude = {
  patient: { select: { id: true, patientCode: true, firstName: true, lastName: true, phone: true } },
  doctor: {
    select: {
      id: true, specialization: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
};

const checkSlotAvailability = async (doctorId, hospitalId, appointmentDate, appointmentTime, excludeId = null) => {
  const dayOfWeek = new Date(appointmentDate)
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toUpperCase();

  // Check doctor schedule for this day
  const schedule = await prisma.doctorSchedule.findFirst({
    where: { doctorId, hospitalId, dayOfWeek, isActive: true },
  });
  if (!schedule) throw AppError.badRequest(`Doctor is not available on ${dayOfWeek}`);

  // Check doctor is not on leave
  const leave = await prisma.doctorLeave.findFirst({
    where: { doctorId, leaveDate: new Date(appointmentDate) },
  });
  if (leave) throw AppError.badRequest('Doctor is on leave on this date');

  // Check time within schedule range
  if (appointmentTime < schedule.startTime || appointmentTime >= schedule.endTime) {
    throw AppError.badRequest(`Appointment time must be between ${schedule.startTime} and ${schedule.endTime}`);
  }

  // Check for conflicting appointment
  const conflict = await prisma.appointment.findFirst({
    where: {
      doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      ...(excludeId && { id: { not: excludeId } }),
    },
  });
  if (conflict) throw AppError.conflict('This time slot is already booked');
};

const generateToken = async (hospitalId, doctorId, appointmentDate) => {
  const count = await prisma.appointment.count({
    where: {
      hospitalId,
      doctorId,
      appointmentDate: new Date(appointmentDate),
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
  });
  return count + 1;
};

const create = async (data, actor) => {
  const hospitalId = actor.hospitalId;

  await checkSlotAvailability(data.doctorId, hospitalId, data.appointmentDate, data.appointmentTime);
  const tokenNumber = await generateToken(hospitalId, data.doctorId, data.appointmentDate);

  const appointment = await prisma.appointment.create({
    data: {
      ...data,
      hospitalId,
      appointmentDate: new Date(data.appointmentDate),
      tokenNumber,
      createdBy: actor.id,
    },
    include: apptInclude,
  });

  // Notify hospital in real-time
  emitToHospital(hospitalId, 'appointment:new', {
    id: appointment.id,
    patient: appointment.patient,
    doctor: appointment.doctor,
    appointmentDate: appointment.appointmentDate,
    appointmentTime: appointment.appointmentTime,
    tokenNumber,
  });

  await audit({
    hospitalId, userId: actor.id,
    action: 'APPOINTMENT_CREATED', entityType: 'appointments', entityId: appointment.id,
  });

  return appointment;
};

const findAll = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);
  const hospitalId = actor.hospitalId;

  const where = { hospitalId };
  if (query.doctorId) where.doctorId = query.doctorId;
  if (query.patientId) where.patientId = query.patientId;
  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;
  if (query.date) where.appointmentDate = new Date(query.date);
  if (query.fromDate && query.toDate) {
    where.appointmentDate = { gte: new Date(query.fromDate), lte: new Date(query.toDate) };
  }

  // Doctors can only see their own appointments
  if (actor.role === 'DOCTOR') {
    const dp = await prisma.doctorProfile.findFirst({ where: { userId: actor.id } });
    if (dp) where.doctorId = dp.id;
  }

  // Patients can only see their own appointments
  if (actor.role === 'PATIENT') {
    const pp = await prisma.patientProfile.findFirst({ where: { userId: actor.id, hospitalId } });
    if (pp) where.patientId = pp.id;
  }

  const [data, total] = await Promise.all([
    prisma.appointment.findMany({
      where, skip, take,
      orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
      include: apptInclude,
    }),
    prisma.appointment.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const findById = async (id, actor) => {
  const appt = await prisma.appointment.findFirst({
    where: { id, hospitalId: actor.hospitalId },
    include: {
      ...apptInclude,
      vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 1 },
      prescriptions: { include: { items: { include: { medicine: true } } } },
      labOrders: { include: { items: { include: { labTest: true } } } },
    },
  });
  if (!appt) throw AppError.notFound('Appointment not found');
  return appt;
};

const updateStatus = async (id, data, actor, req) => {
  const appt = await findById(id, actor);

  // State machine validation
  const validTransitions = {
    SCHEDULED: ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
    CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
    NO_SHOW: [],
    RESCHEDULED: ['SCHEDULED'],
  };

  if (!validTransitions[appt.status]?.includes(data.status)) {
    throw AppError.badRequest(`Cannot transition from ${appt.status} to ${data.status}`);
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: data.status,
      ...(data.doctorNotes && { doctorNotes: data.doctorNotes }),
      ...(data.cancellationReason && { cancellationReason: data.cancellationReason }),
      ...(data.status === 'CANCELLED' && { cancelledBy: actor.id }),
    },
    include: apptInclude,
  });

  emitToHospital(actor.hospitalId, 'appointment:status_update', {
    id, status: data.status, patientId: appt.patientId,
  });

  await audit({
    hospitalId: actor.hospitalId, userId: actor.id,
    action: `APPOINTMENT_${data.status}`, entityType: 'appointments', entityId: id,
    oldValues: { status: appt.status }, newValues: { status: data.status }, req,
  });

  return updated;
};

const reschedule = async (id, data, actor, req) => {
  const appt = await findById(id, actor);
  if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appt.status)) {
    throw AppError.badRequest('Cannot reschedule a completed/cancelled appointment');
  }

  await checkSlotAvailability(appt.doctorId, actor.hospitalId, data.appointmentDate, data.appointmentTime, id);

  // Cancel current, create new with rescheduledFrom reference
  await prisma.appointment.update({
    where: { id },
    data: { status: 'RESCHEDULED', cancellationReason: data.reason },
  });

  const tokenNumber = await generateToken(actor.hospitalId, appt.doctorId, data.appointmentDate);

  const newAppt = await prisma.appointment.create({
    data: {
      hospitalId: actor.hospitalId,
      patientId: appt.patientId,
      doctorId: appt.doctorId,
      appointmentDate: new Date(data.appointmentDate),
      appointmentTime: data.appointmentTime,
      type: appt.type,
      chiefComplaint: appt.chiefComplaint,
      isFollowUp: appt.isFollowUp,
      rescheduledFrom: id,
      tokenNumber,
      createdBy: actor.id,
      status: 'SCHEDULED',
    },
    include: apptInclude,
  });

  await audit({
    hospitalId: actor.hospitalId, userId: actor.id,
    action: 'APPOINTMENT_RESCHEDULED', entityType: 'appointments',
    entityId: id, newValues: { newAppointmentId: newAppt.id }, req,
  });

  return newAppt;
};

const getAvailableSlots = async (doctorId, date, actor) => {
  const hospitalId = actor.hospitalId;
  const dayOfWeek = new Date(date)
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toUpperCase();

  const schedule = await prisma.doctorSchedule.findFirst({
    where: { doctorId, hospitalId, dayOfWeek, isActive: true },
  });
  if (!schedule) return { available: false, slots: [] };

  const leave = await prisma.doctorLeave.findFirst({
    where: { doctorId, leaveDate: new Date(date) },
  });
  if (leave) return { available: false, slots: [], reason: 'Doctor on leave' };

  // Generate all slots
  const slots = [];
  const [startH, startM] = schedule.startTime.split(':').map(Number);
  const [endH, endM] = schedule.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  for (let m = startMinutes; m < endMinutes; m += schedule.slotDurationMinutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }

  // Get booked slots
  const booked = await prisma.appointment.findMany({
    where: {
      doctorId, hospitalId,
      appointmentDate: new Date(date),
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { appointmentTime: true },
  });

  const bookedTimes = new Set(booked.map((a) => a.appointmentTime));

  return {
    available: true,
    doctorId,
    date,
    schedule: { startTime: schedule.startTime, endTime: schedule.endTime, slotDurationMinutes: schedule.slotDurationMinutes },
    slots: slots.map((time) => ({ time, available: !bookedTimes.has(time) })),
  };
};

module.exports = { create, findAll, findById, updateStatus, reschedule, getAvailableSlots };
