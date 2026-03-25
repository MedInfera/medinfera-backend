const cron = require('node-cron');
const prisma = require('../config/database');
const logger = require('../config/logger');
const { emitToHospital } = require('../config/socket');

/**
 * Run a job safely with logging and error isolation
 */
const runJob = async (name, fn) => {
  logger.info(`[JOB] Starting: ${name}`);
  const start = Date.now();
  try {
    await fn();
    logger.info(`[JOB] Completed: ${name} in ${Date.now() - start}ms`);
  } catch (err) {
    logger.error(`[JOB] Failed: ${name}`, { error: err.message, stack: err.stack });
  }
};

// ─── Job: Medicine Expiry Check ───────────────────────────────────────────────
// Runs daily at 7:00 AM
// Notifies admins of batches expiring in ≤30 days
const medicineExpiryCheck = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);

  const expiringBatches = await prisma.medicineBatch.findMany({
    where: { expiryDate: { lte: cutoff }, quantity: { gt: 0 } },
    include: {
      medicine: { select: { name: true, hospitalId: true } },
    },
  });

  const byHospital = {};
  for (const batch of expiringBatches) {
    const hId = batch.medicine.hospitalId;
    if (!byHospital[hId]) byHospital[hId] = [];
    byHospital[hId].push(batch);
  }

  for (const [hospitalId, batches] of Object.entries(byHospital)) {
    // Get admins/pharmacists for this hospital
    const admins = await prisma.user.findMany({
      where: { hospitalId, role: { in: ['ADMIN', 'PHARMACIST'] }, isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          hospitalId,
          userId: admin.id,
          type: 'MEDICINE_EXPIRY',
          title: 'Medicines Expiring Soon',
          message: `${batches.length} medicine batch(es) are expiring within 30 days`,
          metadata: { count: batches.length, batches: batches.map(b => ({ name: b.medicine.name, expiry: b.expiryDate })) },
        },
      });
    }

    emitToHospital(hospitalId, 'alert:medicine_expiry', { count: batches.length });
    logger.info(`[JOB] Expiry check: ${batches.length} batches expiring in hospital ${hospitalId}`);
  }
};

// ─── Job: Low Stock Check ─────────────────────────────────────────────────────
// Runs daily at 8:00 AM
const lowStockCheck = async () => {
  const lowStockMedicines = await prisma.$queryRaw`
    SELECT m.id, m.name, m.current_stock, m.reorder_level, m.hospital_id
    FROM medicines m
    WHERE m.is_active = true
    AND m.current_stock <= m.reorder_level
  `;

  const byHospital = {};
  for (const med of lowStockMedicines) {
    const hId = med.hospital_id;
    if (!byHospital[hId]) byHospital[hId] = [];
    byHospital[hId].push(med);
  }

  for (const [hospitalId, meds] of Object.entries(byHospital)) {
    const admins = await prisma.user.findMany({
      where: { hospitalId, role: { in: ['ADMIN', 'PHARMACIST'] }, isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          hospitalId,
          userId: admin.id,
          type: 'MEDICINE_LOW_STOCK',
          title: 'Low Stock Alert',
          message: `${meds.length} medicine(s) have reached reorder level`,
          metadata: { medicines: meds.map(m => ({ name: m.name, stock: m.current_stock, reorderLevel: m.reorder_level })) },
        },
      });
    }

    emitToHospital(hospitalId, 'alert:low_stock', { count: meds.length });
  }
};

// ─── Job: Appointment Reminders ───────────────────────────────────────────────
// Runs every hour
const appointmentReminders = async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: tomorrow, lt: dayAfter },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    },
    include: {
      patient: { select: { userId: true, firstName: true } },
      doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });

  for (const appt of appointments) {
    if (!appt.patient.userId) continue;

    await prisma.notification.create({
      data: {
        hospitalId: appt.hospitalId,
        userId: appt.patient.userId,
        type: 'APPOINTMENT_REMINDER',
        title: 'Appointment Reminder',
        message: `You have an appointment tomorrow with Dr. ${appt.doctor.user.firstName} ${appt.doctor.user.lastName} at ${appt.appointmentTime}`,
        entityType: 'appointments',
        entityId: appt.id,
      },
    });
  }

  logger.info(`[JOB] Appointment reminders sent for ${appointments.length} appointments`);
};

// ─── Job: Invoice Overdue Check ───────────────────────────────────────────────
// Runs daily at 9:00 AM
const invoiceOverdueCheck = async () => {
  const now = new Date();
  const updated = await prisma.invoice.updateMany({
    where: {
      status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
      dueDate: { lt: now },
    },
    data: { status: 'OVERDUE' },
  });
  logger.info(`[JOB] Marked ${updated.count} invoices as overdue`);
};

// ─── Job: Bed Auto-Release Check ──────────────────────────────────────────────
// Runs every 30 minutes
// Beds that are RESERVED but no admission exists after 2h → auto-release
const bedAutoRelease = async () => {
  const twoHoursAgo = new Date();
  twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

  // Find reserved beds with no active admission
  const reservedBeds = await prisma.bed.findMany({
    where: { status: 'RESERVED', updatedAt: { lt: twoHoursAgo } },
    include: {
      ipdAdmissions: {
        where: { status: { notIn: ['DISCHARGED','DECEASED','TRANSFERRED'] } },
        take: 1,
      },
    },
  });

  const toRelease = reservedBeds.filter(bed => bed.ipdAdmissions.length === 0);

  if (toRelease.length > 0) {
    await prisma.bed.updateMany({
      where: { id: { in: toRelease.map(b => b.id) } },
      data: { status: 'AVAILABLE' },
    });
    logger.info(`[JOB] Auto-released ${toRelease.length} reserved beds`);
  }
};

// ─── Scheduler ────────────────────────────────────────────────────────────────

const initJobs = () => {
  // Daily at 7:00 AM — medicine expiry
  cron.schedule('0 7 * * *', () => runJob('medicine_expiry_check', medicineExpiryCheck));

  // Daily at 8:00 AM — low stock
  cron.schedule('0 8 * * *', () => runJob('low_stock_check', lowStockCheck));

  // Every hour — appointment reminders
  cron.schedule('0 * * * *', () => runJob('appointment_reminders', appointmentReminders));

  // Daily at 9:00 AM — invoice overdue
  cron.schedule('0 9 * * *', () => runJob('invoice_overdue_check', invoiceOverdueCheck));

  // Every 30 min — bed auto-release
  cron.schedule('*/30 * * * *', () => runJob('bed_auto_release', bedAutoRelease));

  logger.info('Background jobs initialized');
};

module.exports = { initJobs };
