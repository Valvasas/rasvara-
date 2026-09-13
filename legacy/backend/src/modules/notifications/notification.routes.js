const express = require('express');
const { requireCustomer } = require('../auth/customerAuth.routes');
const { fail, ok } = require('../../utils/http');

const router = express.Router();

function serializeNotification(notification = {}) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    entityType: notification.entityType,
    entityId: notification.entityId,
    readAt: notification.readAt,
    createdAt: notification.createdAt
  };
}

router.get('/', requireCustomer, async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 30)));
    const notifications = await req.prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    const unreadCount = await req.prisma.notification.count({
      where: { userId: req.user.id, readAt: null }
    });
    return ok(res, {
      notifications: notifications.map(serializeNotification),
      unreadCount
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/read-all', requireCustomer, async (req, res, next) => {
  try {
    await req.prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() }
    });
    return ok(res);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', requireCustomer, async (req, res, next) => {
  try {
    const notification = await req.prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!notification) return fail(res, 404, 'NOTIFICATION_NOT_FOUND', 'Notifikasi tidak ditemukan.');
    const updated = await req.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: notification.readAt || new Date() }
    });
    return ok(res, { notification: serializeNotification(updated) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
