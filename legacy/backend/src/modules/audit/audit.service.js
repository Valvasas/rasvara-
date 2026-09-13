async function writeAuditLog(prisma, req, entry = {}) {
  if (!prisma?.auditLog) return null;

  return prisma.auditLog.create({
    data: {
      actorId: entry.actorId || null,
      actorRole: entry.actorRole || null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId || null,
      oldValue: entry.oldValue || undefined,
      newValue: entry.newValue || undefined,
      ipAddress: req?.ip || req?.socket?.remoteAddress || null,
      userAgent: req?.get?.('user-agent') || null,
      metadata: entry.metadata || undefined
    }
  });
}

module.exports = {
  writeAuditLog
};
