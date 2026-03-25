const router = require('express').Router();
const c = require('./payouts.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { createPayrollSchema, createPayoutSchema, markPaidSchema } = require('./payouts.validation');

router.use(protect);
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

// Payroll
router.get('/payroll',                    authorize(...ADMIN_ROLES), c.getPayrolls);
router.post('/payroll',                   authorize(...ADMIN_ROLES), validate(createPayrollSchema), c.createPayroll);
router.get('/payroll/:id',                authorize(...ADMIN_ROLES), c.getPayrollById);
router.patch('/payroll/:id/process',      authorize(...ADMIN_ROLES), c.processPayroll);

// Payouts
router.get('/payouts',                    authorize(...ADMIN_ROLES), c.getPayouts);
router.post('/payouts',                   authorize(...ADMIN_ROLES), validate(createPayoutSchema), c.createPayout);
router.get('/payouts/:id',                authorize(...ADMIN_ROLES), c.getPayoutById);
router.patch('/payouts/:id/mark-paid',    authorize(...ADMIN_ROLES), validate(markPaidSchema), c.markPayoutPaid);

module.exports = router;
