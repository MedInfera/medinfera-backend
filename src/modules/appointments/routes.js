// Appointment routes — order matters, specific routes before param routes
const router = require('express').Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { roleGuard } = require('../../middleware/roleGuard');
const { tenantScope } = require('../../middleware/tenantScope');

router.use(authenticate, tenantScope);

// Specific routes FIRST — before /:id routes
router.get('/today', roleGuard('ADMIN', 'STAFF', 'DOCTOR'), controller.getTodayAppointments);
router.get('/', roleGuard('ADMIN', 'STAFF', 'DOCTOR'), controller.getAllAppointments);
router.post('/', roleGuard('ADMIN', 'STAFF', 'PATIENT'), controller.bookAppointment);

// Param routes AFTER
router.get('/:id', roleGuard('ADMIN', 'STAFF', 'DOCTOR', 'PATIENT'), controller.getAppointment);
router.patch('/:id/status', roleGuard('ADMIN', 'STAFF', 'DOCTOR'), controller.updateStatus);

module.exports = router;