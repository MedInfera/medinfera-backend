// Prescription routes — managed by Priyanshi
const router = require('express').Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { roleGuard } = require('../../middleware/roleGuard');
const { tenantScope } = require('../../middleware/tenantScope');

router.use(authenticate, tenantScope);

// Specific routes before param routes
router.get('/patient/:patientId', roleGuard('ADMIN', 'STAFF', 'DOCTOR', 'PATIENT'), controller.getPatientPrescriptions);
router.get('/verify/:prescriptionNumber', roleGuard('ADMIN', 'STAFF', 'DOCTOR', 'PATIENT'), controller.verifyPrescription);
router.get('/:id', roleGuard('ADMIN', 'STAFF', 'DOCTOR', 'PATIENT'), controller.getPrescription);
router.post('/', roleGuard('DOCTOR'), controller.createPrescription);

module.exports = router;