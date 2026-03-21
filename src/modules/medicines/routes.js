// Medicine routes — managed by Priyanshi
const router = require('express').Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { roleGuard } = require('../../middleware/roleGuard');
const { tenantScope } = require('../../middleware/tenantScope');

router.use(authenticate, tenantScope);

// Specific routes before param routes
router.get('/search', roleGuard('ADMIN', 'STAFF', 'DOCTOR'), controller.searchMedicines);
router.get('/low-stock', roleGuard('ADMIN', 'STAFF'), controller.getLowStock);
router.get('/expiring', roleGuard('ADMIN', 'STAFF'), controller.getExpiringSoon);
router.get('/', roleGuard('ADMIN', 'STAFF', 'DOCTOR'), controller.getAllMedicines);
router.get('/:id', roleGuard('ADMIN', 'STAFF', 'DOCTOR'), controller.getMedicine);
router.post('/', roleGuard('ADMIN', 'STAFF'), controller.createMedicine);
router.post('/batches', roleGuard('ADMIN', 'STAFF'), controller.addBatch);

module.exports = router;