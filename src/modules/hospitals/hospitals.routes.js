const router = require('express').Router();
const controller = require('./hospitals.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { createHospitalSchema, updateHospitalSchema } = require('./hospitals.validation');

router.use(protect);

router.get('/', authorize('SUPER_ADMIN'), controller.findAll);
router.post('/', authorize('SUPER_ADMIN'), validate(createHospitalSchema), controller.create);
router.get('/:id', authorize('SUPER_ADMIN', 'ADMIN'), controller.findById);
router.patch('/:id', authorize('SUPER_ADMIN'), validate(updateHospitalSchema), controller.update);
router.delete('/:id', authorize('SUPER_ADMIN'), controller.remove);
router.get('/:id/stats', authorize('SUPER_ADMIN', 'ADMIN'), controller.getStats);

module.exports = router;
