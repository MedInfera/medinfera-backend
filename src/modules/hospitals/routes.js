// Hospital routes — Super Admin only
const router = require('express').Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { roleGuard } = require('../../middleware/roleGuard');

// All hospital routes require login + SUPER_ADMIN role
router.use(authenticate, roleGuard('SUPER_ADMIN'));

router.get('/stats', controller.getStats);
router.get('/', controller.getAllHospitals);
router.get('/:id', controller.getHospital);
router.post('/', controller.createHospital);
router.put('/:id', controller.updateHospital);
router.delete('/:id', controller.deleteHospital);
router.patch('/:id/toggle-status', controller.toggleStatus);

module.exports = router;