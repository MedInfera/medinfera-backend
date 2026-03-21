// Doctor routes
const router = require('express').Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { roleGuard } = require('../../middleware/roleGuard');
const { tenantScope } = require('../../middleware/tenantScope');

// All routes need authentication + hospital scope
router.use(authenticate, tenantScope);

// Admin and Staff can view doctors
router.get('/', roleGuard('ADMIN', 'STAFF', 'PATIENT'), controller.getAllDoctors);
router.get('/:id', roleGuard('ADMIN', 'STAFF', 'PATIENT', 'DOCTOR'), controller.getDoctor);

// Available slots — patients and staff can check
router.get('/:id/slots', roleGuard('ADMIN', 'STAFF', 'PATIENT'), controller.getAvailableSlots);

// Schedule — admin sets it, doctor views it
router.get('/:id/schedule', roleGuard('ADMIN', 'DOCTOR', 'STAFF'), controller.getSchedule);
router.post('/:id/schedule', roleGuard('ADMIN'), controller.setSchedule);

// Only admin can create/update doctors
router.post('/', roleGuard('ADMIN'), controller.createDoctor);
router.put('/:id', roleGuard('ADMIN'), controller.updateDoctor);

module.exports = router;