const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { generateInvoiceNumber } = require('../../utils/codeGenerator');
const { emitToHospital } = require('../../config/socket');

// ─── Invoices ─────────────────────────────────────────────────────────────────

const createInvoice = async (data, actor) => {
  const hospitalId = actor.hospitalId;
  const invoiceNumber = await generateInvoiceNumber(hospitalId, data.type);

  let subtotal = 0;
  let totalGst = 0;

  const items = data.items.map((item) => {
    const lineSubtotal = item.unitPrice * item.quantity - item.discount;
    const gstAmount = (lineSubtotal * item.gstRate) / 100;
    subtotal += lineSubtotal;
    totalGst += gstAmount;
    return { ...item, gstAmount, totalPrice: lineSubtotal + gstAmount };
  });

  const afterDiscount = subtotal - (data.discountAmount || 0);
  const rawTotal = afterDiscount + totalGst;
  const roundOff = Math.round(rawTotal) - rawTotal;
  const finalTotal = Math.round(rawTotal);

  return prisma.invoice.create({
    data: {
      hospitalId,
      patientId: data.patientId,
      invoiceNumber,
      type: data.type,
      status: 'DRAFT',
      appointmentId: data.appointmentId || null,
      admissionId: data.admissionId || null,
      subtotal,
      discountAmount: data.discountAmount || 0,
      discountReason: data.discountReason || null,
      gstAmount: totalGst,
      roundOff,
      totalAmount: finalTotal,
      dueAmount: finalTotal,
      dueDate: data.dueDate || null,
      notes: data.notes || null,
      issuedBy: actor.id,
      items: { create: items },
    },
    include: {
      patient: { select: { firstName: true, lastName: true, patientCode: true } },
      items: true,
    },
  });
};

const getInvoices = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);
  const where = { hospitalId: actor.hospitalId };

  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;
  if (query.patientId) where.patientId = query.patientId;
  if (query.admissionId) where.admissionId = query.admissionId;
  if (query.fromDate && query.toDate) {
    where.createdAt = { gte: new Date(query.fromDate), lte: new Date(query.toDate) };
  }

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take,
      include: {
        patient: { select: { firstName: true, lastName: true, patientCode: true } },
        _count: { select: { items: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const getInvoiceById = async (id, actor) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id, hospitalId: actor.hospitalId },
    include: {
      patient: true,
      items: true,
      payments: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!invoice) throw AppError.notFound('Invoice not found');
  return invoice;
};

const issueInvoice = async (id, actor) => {
  const invoice = await getInvoiceById(id, actor);
  if (invoice.status !== 'DRAFT') {
    throw AppError.badRequest('Only DRAFT invoices can be issued');
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: 'ISSUED', issuedAt: new Date() },
    include: {
      patient: { select: { firstName: true, lastName: true, patientCode: true } },
      items: true,
    },
  });

  emitToHospital(actor.hospitalId, 'invoice:issued', {
    invoiceId: id,
    invoiceNumber: updated.invoiceNumber,
    patientId: invoice.patientId,
    totalAmount: updated.totalAmount,
  });

  return updated;
};

const cancelInvoice = async (id, actor) => {
  const invoice = await getInvoiceById(id, actor);
  if (['PAID', 'CANCELLED'].includes(invoice.status)) {
    throw AppError.badRequest(`Cannot cancel a ${invoice.status} invoice`);
  }
  return prisma.invoice.update({ where: { id }, data: { status: 'CANCELLED' } });
};

// ─── Payments ─────────────────────────────────────────────────────────────────

const recordPayment = async (data, actor) => {
  const invoice = await getInvoiceById(data.invoiceId, actor);

  if (['PAID', 'CANCELLED', 'REFUNDED'].includes(invoice.status)) {
    throw AppError.badRequest(`Invoice is already ${invoice.status}`);
  }
  if (data.amount > Number(invoice.dueAmount)) {
    throw AppError.badRequest(
      `Payment amount ₹${data.amount} exceeds due amount ₹${invoice.dueAmount}`
    );
  }

  const payment = await prisma.$transaction(async (tx) => {
    const pmt = await tx.payment.create({
      data: {
        hospitalId: actor.hospitalId,
        invoiceId: data.invoiceId,
        patientId: invoice.patientId,
        paymentMode: data.paymentMode,
        amount: data.amount,
        status: 'SUCCESS',
        transactionReference: data.transactionReference || null,
        notes: data.notes || null,
        collectedBy: actor.id,
      },
    });

    const newPaid = Number(invoice.paidAmount) + data.amount;
    const newDue = Math.max(0, Number(invoice.totalAmount) - newPaid);
    const newStatus = newDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    await tx.invoice.update({
      where: { id: data.invoiceId },
      data: { paidAmount: newPaid, dueAmount: newDue, status: newStatus },
    });

    return pmt;
  });

  emitToHospital(actor.hospitalId, 'payment:received', {
    invoiceId: data.invoiceId,
    amount: data.amount,
    paymentMode: data.paymentMode,
    patientId: invoice.patientId,
  });

  return payment;
};

const getPaymentHistory = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);
  const where = { hospitalId: actor.hospitalId };

  if (query.invoiceId) where.invoiceId = query.invoiceId;
  if (query.patientId) where.patientId = query.patientId;
  if (query.paymentMode) where.paymentMode = query.paymentMode;
  if (query.status) where.status = query.status;

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take,
      include: {
        patient: { select: { firstName: true, lastName: true, patientCode: true } },
        invoice: { select: { invoiceNumber: true, type: true, totalAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const getRevenueStats = async (query, actor) => {
  const hospitalId = actor.hospitalId;
  const where = { hospitalId };

  if (query.fromDate) where.createdAt = { gte: new Date(query.fromDate) };
  if (query.toDate) {
    where.createdAt = {
      ...(where.createdAt || {}),
      lte: new Date(query.toDate),
    };
  }

  const [invoiceStats, paymentStats, byType] = await Promise.all([
    prisma.invoice.aggregate({
      where,
      _sum: { totalAmount: true, paidAmount: true, dueAmount: true, gstAmount: true },
      _count: true,
    }),
    prisma.payment.groupBy({
      by: ['paymentMode'],
      where: { ...where, status: 'SUCCESS' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.invoice.groupBy({
      by: ['type'],
      where,
      _sum: { totalAmount: true, paidAmount: true },
      _count: true,
    }),
  ]);

  return {
    totals: {
      invoices: invoiceStats._count,
      revenue: invoiceStats._sum.totalAmount || 0,
      collected: invoiceStats._sum.paidAmount || 0,
      outstanding: invoiceStats._sum.dueAmount || 0,
      gstCollected: invoiceStats._sum.gstAmount || 0,
    },
    byPaymentMode: paymentStats,
    byInvoiceType: byType,
  };
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  issueInvoice,
  cancelInvoice,
  recordPayment,
  getPaymentHistory,
  getRevenueStats,
};
