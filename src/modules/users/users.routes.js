const router = require('express').Router();
const controller = require('./users.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { createUserSchema, updateUserSchema, resetPasswordSchema } = require('./users.validation');

router.use(protect);

router.get('/', authorize('SUPER_ADMIN', 'ADMIN'), controller.findAll);
router.post('/', authorize('SUPER_ADMIN', 'ADMIN'), validate(createUserSchema), controller.create);
router.get('/:id', authorize('SUPER_ADMIN', 'ADMIN'), controller.findById);
router.patch('/:id', authorize('SUPER_ADMIN', 'ADMIN'), validate(updateUserSchema), controller.update);
router.patch('/:id/reset-password', authorize('SUPER_ADMIN', 'ADMIN'), validate(resetPasswordSchema), controller.resetPassword);
router.delete('/:id', authorize('SUPER_ADMIN', 'ADMIN'), controller.remove);

module.exports = router;
