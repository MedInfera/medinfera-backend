const router = require('express').Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { roleGuard } = require('../../middleware/roleGuard');
const { tenantScope } = require('../../middleware/tenantScope');

router.use(authenticate, tenantScope);

// Revenue reports — admin only
router.get('/revenue', roleGuard('ADMIN'), controller.getRevenue);
router.get('/doctor-payout', roleGuard('ADMIN', 'DOCTOR'), controller.getDoctorPayout);

// Patient payment history
router.get('/patient/:patientId', roleGuard('ADMIN', 'STAFF', 'PATIENT'), controller.getPatientPayments);

// Payment actions
router.post('/order', roleGuard('ADMIN', 'STAFF', 'PATIENT'), controller.createOrder);
router.post('/verify', roleGuard('ADMIN', 'STAFF', 'PATIENT'), controller.verifyPayment);
router.post('/cash', roleGuard('ADMIN', 'STAFF'), controller.recordCash);

module.exports = router;