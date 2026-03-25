const service = require('./medicines.service');
const response = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

// ─── Medicine Controllers ─────────────────────────────────────────────────────

const createMedicine = asyncHandler(async (req, res) => {
  const medicine = await service.createMedicine(req.body, req.user);
  response.created(res, medicine, 'Medicine created successfully');
});

const getMedicines = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.getMedicines(req.query, req.user);
  response.paginated(res, data, pagination);
});

const getMedicineById = asyncHandler(async (req, res) => {
  const medicine = await service.getMedicineById(req.params.id, req.user);
  response.success(res, medicine);
});

const updateMedicine = asyncHandler(async (req, res) => {
  const medicine = await service.updateMedicine(req.params.id, req.body, req.user);
  response.success(res, medicine, 'Medicine updated');
});

const getLowStock = asyncHandler(async (req, res) => {
  const medicines = await service.getLowStock(req.user);
  response.success(res, medicines);
});

const getExpiringBatches = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 90;
  const batches = await service.getExpiringBatches(req.user, days);
  response.success(res, batches);
});

// ─── Supplier Controllers ─────────────────────────────────────────────────────

const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await service.createSupplier(req.body, req.user);
  response.created(res, supplier, 'Supplier created successfully');
});

const getSuppliers = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.getSuppliers(req.query, req.user);
  response.paginated(res, data, pagination);
});

const getSupplierById = asyncHandler(async (req, res) => {
  const supplier = await service.getSupplierById(req.params.id, req.user);
  response.success(res, supplier);
});

const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await service.updateSupplier(req.params.id, req.body, req.user);
  response.success(res, supplier, 'Supplier updated');
});

// ─── Purchase Order Controllers ───────────────────────────────────────────────

const createPurchaseOrder = asyncHandler(async (req, res) => {
  const po = await service.createPurchaseOrder(req.body, req.user);
  response.created(res, po, 'Purchase order created');
});

const getPurchaseOrders = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.getPurchaseOrders(req.query, req.user);
  response.paginated(res, data, pagination);
});

const getPurchaseOrderById = asyncHandler(async (req, res) => {
  const po = await service.getPurchaseOrderById(req.params.id, req.user);
  response.success(res, po);
});

const receivePurchaseOrder = asyncHandler(async (req, res) => {
  const po = await service.receivePurchaseOrder(req.params.id, req.body, req.user);
  response.success(res, po, 'Stock received and inventory updated');
});

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
