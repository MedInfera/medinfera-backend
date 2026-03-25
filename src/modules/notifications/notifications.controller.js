const service = require('./notifications.service');
const response = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const getNotifications = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.getNotifications(req.query, req.user);
  response.paginated(res, data, pagination);
});

const markAsRead = asyncHandler(async (req, res) => {
  await service.markAsRead(req.params.id, req.user);
  response.success(res, null, 'Notification marked as read');
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await service.markAllAsRead(req.user);
  response.success(res, null, 'All notifications marked as read');
});

const createNotification = asyncHandler(async (req, res) => {
  const notification = await service.createNotification(req.body, req.user);
  response.created(res, notification, 'Notification sent');
});

module.exports = { getNotifications, markAsRead, markAllAsRead, createNotification };
