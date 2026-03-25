const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { getPagination, paginationMeta } = require('../../utils/pagination');

// ─── Medicine ─────────────────────────────────────────────────────────────────

const createMedicine = async (data, actor) => {
  return prisma.medicine.create({
    data: { ...data, hospitalId: actor.hospitalId },
  });
};

const getMedicines = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);
  const where = { hospitalId: actor.hospitalId };

  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  if (query.category) where.category = query.category;
  if (query.isControlled !== undefined) where.isControlled = query.isControlled === 'true';
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { genericName: { contains: query.search, mode: 'insensitive' } },
      { manufacturer: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.medicine.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: {
        batches: {
          where: { quantity: { gt: 0 }, expiryDate: { gt: new Date() } },
          orderBy: { expiryDate: 'asc' },
          select: { id: true, batchNumber: true, expiryDate: true, quantity: true, sellingPrice: true },
        },
      },
    }),
    prisma.medicine.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const getMedicineById = async (id, actor) => {
  const medicine = await prisma.medicine.findFirst({
    where: { id, hospitalId: actor.hospitalId },
    include: {
      batches: { orderBy: { expiryDate: 'asc' } },
    },
  });
  if (!medicine) throw AppError.notFound('Medicine not found');
  return medicine;
};

const updateMedicine = async (id, data, actor) => {
  await getMedicineById(id, actor);
  return prisma.medicine.update({ where: { id }, data });
};

const getLowStock = async (actor) => {
  return prisma.$queryRaw`
    SELECT id, name, generic_name, current_stock, reorder_level, category, unit_of_measure
    FROM medicines
    WHERE hospital_id = ${actor.hospitalId}::uuid
    AND is_active = true
    AND current_stock <= reorder_level
    ORDER BY (current_stock::float / NULLIF(reorder_level, 0)) ASC
  `;
};

const getExpiringBatches = async (actor, daysAhead = 90) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);

  return prisma.medicineBatch.findMany({
    where: {
      hospitalId: actor.hospitalId,
      quantity: { gt: 0 },
      expiryDate: { lte: cutoff },
    },
    include: {
      medicine: { select: { name: true, genericName: true, category: true } },
    },
    orderBy: { expiryDate: 'asc' },
  });
};

// ─── Suppliers ────────────────────────────────────────────────────────────────

const createSupplier = async (data, actor) => {
  return prisma.supplier.create({
    data: { ...data, hospitalId: actor.hospitalId },
  });
};

const getSuppliers = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);
  const where = { hospitalId: actor.hospitalId };

  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { contactPerson: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.supplier.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
    prisma.supplier.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const getSupplierById = async (id, actor) => {
  const supplier = await prisma.supplier.findFirst({
    where: { id, hospitalId: actor.hospitalId },
    include: {
      purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!supplier) throw AppError.notFound('Supplier not found');
  return supplier;
};

const updateSupplier = async (id, data, actor) => {
  await getSupplierById(id, actor);
  return prisma.supplier.update({ where: { id }, data });
};

// ─── Purchase Orders ──────────────────────────────────────────────────────────

const createPurchaseOrder = async (data, actor) => {
  const hospitalId = actor.hospitalId;

  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count({ where: { hospitalId } });
  const orderNumber = `PO-${year}-${String(count + 1).padStart(4, '0')}`;

  let subtotal = 0;
  let gstAmount = 0;

  const itemsData = data.items.map((item) => {
    const lineSubtotal = item.unitPrice * item.quantityOrdered;
    const lineGst = (lineSubtotal * item.gstRate) / 100;
    const lineTotal = lineSubtotal + lineGst;
    subtotal += lineSubtotal;
    gstAmount += lineGst;
    return { ...item, gstAmount: lineGst, totalPrice: lineTotal };
  });

  return prisma.purchaseOrder.create({
    data: {
      hospitalId,
      supplierId: data.supplierId,
      orderNumber,
      notes: data.notes,
      expectedDeliveryAt: data.expectedDeliveryAt,
      orderedBy: actor.id,
      subtotal,
      gstAmount,
      netAmount: subtotal + gstAmount,
      items: { create: itemsData },
    },
    include: {
      supplier: { select: { name: true, phone: true } },
      items: { include: { medicine: { select: { name: true, unitOfMeasure: true } } } },
    },
  });
};

const getPurchaseOrders = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);
  const where = { hospitalId: actor.hospitalId };

  if (query.status) where.status = query.status;
  if (query.supplierId) where.supplierId = query.supplierId;

  const [data, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take,
      include: {
        supplier: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return { data, pagination: paginationMeta(total, page, limit) };
};

const getPurchaseOrderById = async (id, actor) => {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, hospitalId: actor.hospitalId },
    include: {
      supplier: true,
      items: { include: { medicine: { select: { name: true, genericName: true, unitOfMeasure: true } } } },
    },
  });
  if (!po) throw AppError.notFound('Purchase order not found');
  return po;
};

const receivePurchaseOrder = async (id, data, actor) => {
  const order = await getPurchaseOrderById(id, actor);

  if (order.status === 'CANCELLED') {
    throw AppError.badRequest('Cannot receive a cancelled purchase order');
  }
  if (order.status === 'RECEIVED') {
    throw AppError.badRequest('Purchase order already fully received');
  }

  await prisma.$transaction(async (tx) => {
    for (const received of data.items) {
      const orderItem = order.items.find((i) => i.id === received.itemId);
      if (!orderItem) continue;
      if (received.quantityReceived === 0) continue;

      // Update item received quantity
      await tx.purchaseOrderItem.update({
        where: { id: received.itemId },
        data: { quantityReceived: { increment: received.quantityReceived } },
      });

      // Upsert batch
      await tx.medicineBatch.upsert({
        where: {
          batchNumber_medicineId: {
            batchNumber: received.batchNumber,
            medicineId: orderItem.medicineId,
          },
        },
        create: {
          medicineId: orderItem.medicineId,
          hospitalId: actor.hospitalId,
          batchNumber: received.batchNumber,
          expiryDate: new Date(received.expiryDate),
          manufactureDate: received.manufactureDate ? new Date(received.manufactureDate) : null,
          quantity: received.quantityReceived,
          purchasePrice: orderItem.unitPrice,
          sellingPrice: Number(orderItem.unitPrice) * 1.2,
        },
        update: {
          quantity: { increment: received.quantityReceived },
        },
      });

      // Update medicine stock
      await tx.medicine.update({
        where: { id: orderItem.medicineId },
        data: { currentStock: { increment: received.quantityReceived } },
      });
    }

    // Determine new PO status
    const updatedItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: id },
    });

    const allReceived = updatedItems.every((i) => i.quantityReceived >= i.quantityOrdered);
    const anyReceived = updatedItems.some((i) => i.quantityReceived > 0);

    await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : order.status,
        receivedAt: allReceived ? new Date() : null,
      },
    });
  });

  return getPurchaseOrderById(id, actor);
};

module.exports = {
  createMedicine,
  getMedicines,
  getMedicineById,
  updateMedicine,
  getLowStock,
  getExpiringBatches,
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  receivePurchaseOrder,
};
