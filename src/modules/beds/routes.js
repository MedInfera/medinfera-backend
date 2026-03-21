const router = require('express').Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { roleGuard } = require('../../middleware/roleGuard');
const { tenantScope } = require('../../middleware/tenantScope');

router.use(authenticate, tenantScope);

// Dashboard and availability — staff and doctors can view
router.get('/dashboard', roleGuard('ADMIN','STAFF','DOCTOR'), controller.getDashboard);
router.get('/available', roleGuard('ADMIN','STAFF','DOCTOR'), controller.getAvailableBeds);

// Structure management — admin only
router.get('/buildings', roleGuard('ADMIN','STAFF'), controller.getBuildings);
router.post('/buildings', roleGuard('ADMIN'), controller.createBuilding);
router.post('/floors', roleGuard('ADMIN'), controller.createFloor);
router.post('/wards', roleGuard('ADMIN'), controller.createWard);
router.post('/', roleGuard('ADMIN'), controller.createBed);

// Patient management
router.post('/admit', roleGuard('ADMIN','STAFF'), controller.admitPatient);
router.patch('/discharge/:allocationId', roleGuard('ADMIN','STAFF'), controller.dischargePatient);
router.patch('/:bedId/available', roleGuard('ADMIN','STAFF'), controller.markAvailable);

module.exports = router;