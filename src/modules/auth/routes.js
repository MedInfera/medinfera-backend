// Auth routes
// Public: /register, /login, /refresh
// Protected: /me, /logout (require valid JWT)
const router = require('express').Router();
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');

// Public routes — no token needed
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);

// Protected routes — must be logged in
router.get('/me', authenticate, controller.getMe);
router.post('/logout', authenticate, controller.logout);

module.exports = router;