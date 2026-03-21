const router = require('express').Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { roleGuard } = require('../../middleware/roleGuard');
const { tenantScope } = require('../../middleware/tenantScope');

router.use(authenticate, tenantScope);

router.get('/trips/active', roleGuard('ADMIN','STAFF'), controller.getActiveTrips);
router.get('/drivers', roleGuard('ADMIN','STAFF'), controller.getAllDrivers);
router.get('/', roleGuard('ADMIN','STAFF'), controller.getAllAmbulances);
router.post('/', roleGuard('ADMIN'), controller.createAmbulance);
router.post('/drivers', roleGuard('ADMIN'), controller.createDriver);
router.post('/trips', roleGuard('ADMIN','STAFF'), controller.createTrip);
router.patch('/trips/:id/status', roleGuard('ADMIN','STAFF','DRIVER'), controller.updateTripStatus);

module.exports = router;