const prisma = require('../../config/database');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { emitToUser } = require('../../config/socket');

const getNotifications = async (query, actor) => {
  const { page, limit, skip, take } = getPagination(query);
  const where = { userId: actor.id };

  if (query.isRead !== undefined) where.isRead = query.isRead === 'true';
  if (query.type) where.type = query.type;

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: actor.id, isRead: false } }),
  ]);

  return {
    data,
    pagination: { ...paginationMeta(total, page, limit), unreadCount },
  };
};

const markAsRead = async (id, actor) => {
  return prisma.notification.updateMany({
    where: { id, userId: actor.id },
    data: { isRead: true, readAt: new Date() },
  });
};

const markAllAsRead = async (actor) => {
  return prisma.notification.updateMany({
    where: { userId: actor.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
};

// Used internally by other services to create + push notifications
const createAndSend = async ({ hospitalId, userId, type, title, message, entityType, entityId, metadata }) => {
  const notification = await prisma.notification.create({
    data: {
      hospitalId: hospitalId || null,
      userId,
      type,
      title,
      message,
      entityType: entityType || null,
      entityId: entityId || null,
      metadata: metadata || {},
    },
  });

  // Push via Socket.io
  emitToUser(userId, 'notification:new', {
    id: notification.id,
    type,
    title,
    message,
    entityType,
    entityId,
    createdAt: notification.createdAt,
  });

  return notification;
};

// ADMIN can create manual notifications
const createNotification = async (data, actor) => {
  return createAndSend({ ...data, hospitalId: actor.hospitalId });
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  createAndSend,
};
