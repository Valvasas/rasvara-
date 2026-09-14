async function createNotification(prisma, input = {}) {
  if (!prisma?.notification || !input.userId) return null;
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType || null,
      entityId: input.entityId || null
    }
  });
}

async function notifyVendorMembers(prisma, vendorId, input = {}) {
  if (!prisma?.vendorMember || !vendorId) return [];
  const members = await prisma.vendorMember.findMany({
    where: { vendorId },
    select: { userId: true }
  });
  if (!members.length) return [];
  return Promise.all(members.map((member) => createNotification(prisma, {
    ...input,
    userId: member.userId
  })));
}

module.exports = {
  createNotification,
  notifyVendorMembers
};
