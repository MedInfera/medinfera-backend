const router = require('express').Router();
const c = require('./medicines.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const {
  createMedicineSchema,
  updateMedicineSchema,
  createSupplierSchema,
  updateSupplierSchema,
  createPurchaseOrderSchema,
  receivePurchaseOrderSchema,
} = require('./medicines.validation');

router.use(protect);

const PHARM_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PHARMACIST'];
const VIEW_ROLES  = [...PHARM_ROLES, 'DOCTOR', 'NURSE'];

// ─── Medicines ────────────────────────────────────────────────────────────────
router.get('/',              authorize(...VIEW_ROLES),  c.getMedicines);
router.post('/',             authorize(...PHARM_ROLES), validate(createMedicineSchema), c.createMedicine);
router.get('/low-stock',     authorize(...PHARM_ROLES), c.getLowStock);
router.get('/expiring',      authorize(...PHARM_ROLES), c.getExpiringBatches);
router.get('/:id',           authorize(...VIEW_ROLES),  c.getMedicineById);
router.patch('/:id',         authorize(...PHARM_ROLES), validate(updateMedicineSchema), c.updateMedicine);

// ─── Suppliers ────────────────────────────────────────────────────────────────
router.get('/suppliers',         authorize(...PHARM_ROLES), c.getSuppliers);
router.post('/suppliers',        authorize(...PHARM_ROLES), validate(createSupplierSchema), c.createSupplier);
router.get('/suppliers/:id',     authorize(...PHARM_ROLES), c.getSupplierById);
router.patch('/suppliers/:id',   authorize(...PHARM_ROLES), validate(updateSupplierSchema), c.updateSupplier);

// ─── Purchase Orders ──────────────────────────────────────────────────────────
router.get('/purchase-orders',              authorize(...PHARM_ROLES), c.getPurchaseOrders);
router.post('/purchase-orders',             authorize(...PHARM_ROLES), validate(createPurchaseOrderSchema), c.createPurchaseOrder);
router.get('/purchase-orders/:id',          authorize(...PHARM_ROLES), c.getPurchaseOrderById);
router.post('/purchase-orders/:id/receive', authorize(...PHARM_ROLES), validate(receivePurchaseOrderSchema), c.receivePurchaseOrder);

module.exports = router;
