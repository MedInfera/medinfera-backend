const router = require('express').Router();
const controller = require('./auth.controller');
const { protect } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { loginSchema, refreshSchema, changePasswordSchema } = require('./auth.validation');

router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', protect, controller.getMe);
router.patch('/change-password', protect, validate(changePasswordSchema), controller.changePassword);

module.exports = router;
