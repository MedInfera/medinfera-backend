const medicineService = require('./service');
const { createMedicineSchema, createBatchSchema } = require('./validator');
const { success, paginated, error } = require('../../shared/response');

// GET /api/medicines/search?q=paracetamol
const searchMedicines = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return error(res, 'Search term must be at least 2 characters', 400);
    }
    const medicines = await medicineService.searchMedicines(req.hospitalId, q);
    return success(res, medicines, 'Medicines found');
  } catch (err) { next(err); }
};

// GET /api/medicines/low-stock
const getLowStock = async (req, res, next) => {
  try {
    const medicines = await medicineService.getLowStock(req.hospitalId);
    return success(res, medicines, 'Low stock medicines');
  } catch (err) { next(err); }
};

// GET /api/medicines/expiring
const getExpiringSoon = async (req, res, next) => {
  try {
    const medicines = await medicineService.getExpiringSoon(req.hospitalId);
    return success(res, medicines, 'Expiring soon medicines');
  } catch (err) { next(err); }
};

// GET /api/medicines
const getAllMedicines = async (req, res, next) => {
  try {
    const { medicines, total, page, limit } = await medicineService.getAllMedicines(
      req.hospitalId, req.query
    );
    return paginated(res, medicines, total, page, limit);
  } catch (err) { next(err); }
};

// GET /api/medicines/:id
const getMedicine = async (req, res, next) => {
  try {
    const medicine = await medicineService.getMedicineById(req.params.id, req.hospitalId);
    return success(res, medicine, 'Medicine fetched');
  } catch (err) { next(err); }
};

// POST /api/medicines
const createMedicine = async (req, res, next) => {
  try {
    const data = createMedicineSchema.parse(req.body);
    const medicine = await medicineService.createMedicine(req.hospitalId, data, req.user.id);
    return success(res, medicine, 'Medicine created successfully', 201);
  } catch (err) { next(err); }
};

// POST /api/medicines/batches
const addBatch = async (req, res, next) => {
  try {
    const data = createBatchSchema.parse(req.body);
    const batch = await medicineService.addBatch(req.hospitalId, data, req.user.id);
    return success(res, batch, 'Batch added successfully', 201);
  } catch (err) { next(err); }
};

module.exports = {
  searchMedicines, getLowStock, getExpiringSoon,
  getAllMedicines, getMedicine, createMedicine, addBatch
};