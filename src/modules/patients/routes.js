// Patient routes
const router = require('express').Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { roleGuard } = require('../../middleware/roleGuard');
const { tenantScope } = require('../../middleware/tenantScope');

router.use(authenticate, tenantScope);

router.get('/', roleGuard('ADMIN', 'STAFF', 'DOCTOR'), controller.getAllPatients);
router.get('/:id', roleGuard('ADMIN', 'STAFF', 'DOCTOR', 'PATIENT'), controller.getPatient);
router.get('/:id/history', roleGuard('ADMIN', 'STAFF', 'DOCTOR', 'PATIENT'), controller.getHistory);
router.post('/', roleGuard('ADMIN', 'STAFF'), controller.createPatient);

module.exports = router;