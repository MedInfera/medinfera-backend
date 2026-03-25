const router = require('express').Router();
const c = require('./lab.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { createLabTestSchema, updateLabTestSchema, createLabOrderSchema, updateLabOrderStatusSchema, enterResultsSchema } = require('./lab.validation');

router.use(protect);

// Lab Test Catalog
router.get('/tests',        authorize('SUPER_ADMIN','ADMIN','DOCTOR','LAB_TECHNICIAN','RECEPTIONIST'), c.getLabTests);
router.post('/tests',       authorize('SUPER_ADMIN','ADMIN'), validate(createLabTestSchema), c.createLabTest);
router.patch('/tests/:id',  authorize('SUPER_ADMIN','ADMIN'), validate(updateLabTestSchema), c.updateLabTest);

// Lab Orders
router.get('/orders',             authorize('SUPER_ADMIN','ADMIN','DOCTOR','LAB_TECHNICIAN','NURSE','BILLING'), c.getLabOrders);
router.post('/orders',            authorize('DOCTOR','ADMIN','RECEPTIONIST'), validate(createLabOrderSchema), c.createLabOrder);
router.get('/orders/:id',         authorize('SUPER_ADMIN','ADMIN','DOCTOR','LAB_TECHNICIAN','NURSE','PATIENT'), c.getLabOrderById);
router.patch('/orders/:id/status',authorize('LAB_TECHNICIAN','ADMIN','DOCTOR'), validate(updateLabOrderStatusSchema), c.updateLabOrderStatus);
router.post('/orders/:id/results',authorize('LAB_TECHNICIAN','ADMIN'), validate(enterResultsSchema), c.enterResults);

module.exports = router;
