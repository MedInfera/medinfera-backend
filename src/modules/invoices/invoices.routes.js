const router = require('express').Router();
const c = require('./invoices.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { createInvoiceSchema, recordPaymentSchema } = require('./invoices.validation');

router.use(protect);

const BILLING = ['SUPER_ADMIN', 'ADMIN', 'BILLING', 'RECEPTIONIST'];

// Invoices
router.get('/',              authorize(...BILLING, 'DOCTOR'), c.getInvoices);
router.post('/',             authorize(...BILLING), validate(createInvoiceSchema), c.createInvoice);
router.get('/stats/revenue', authorize(...BILLING), c.getRevenueStats);
router.get('/:id',           authorize(...BILLING, 'DOCTOR', 'PATIENT'), c.getInvoiceById);
router.post('/:id/issue',    authorize(...BILLING), c.issueInvoice);
router.post('/:id/cancel',   authorize('SUPER_ADMIN', 'ADMIN', 'BILLING'), c.cancelInvoice);

// Payments
router.post('/payments',         authorize(...BILLING), validate(recordPaymentSchema), c.recordPayment);
router.get('/payments/history',  authorize(...BILLING), c.getPaymentHistory);

module.exports = router;
