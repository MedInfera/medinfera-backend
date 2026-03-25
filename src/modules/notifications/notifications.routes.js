const router = require('express').Router();
const c = require('./notifications.controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { createNotificationSchema } = require('./notifications.validation');

router.use(protect);

router.get('/',             c.getNotifications);
router.post('/',            authorize('SUPER_ADMIN','ADMIN'), validate(createNotificationSchema), c.createNotification);
router.patch('/read-all',   c.markAllAsRead);
router.patch('/:id/read',   c.markAsRead);

module.exports = router;
