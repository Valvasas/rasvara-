const ORDER_TRANSITIONS = {
  WAITING_PAYMENT: new Set(['WAITING_VENDOR_CONFIRMATION', 'CANCELLED']),
  WAITING_VENDOR_CONFIRMATION: new Set(['CONFIRMED', 'CANCELLED', 'DISPUTED']),
  CONFIRMED: new Set(['BEING_PREPARED', 'CANCELLED', 'DISPUTED']),
  BEING_PREPARED: new Set(['READY', 'DISPUTED']),
  READY: new Set(['DELIVERING', 'COMPLETED', 'DISPUTED']),
  DELIVERING: new Set(['COMPLETED', 'DISPUTED']),
  COMPLETED: new Set(['DISPUTED']),
  CANCELLED: new Set([]),
  DISPUTED: new Set([])
};

function assertOrderTransition(currentStatus, nextStatus) {
  const allowed = ORDER_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.has(nextStatus)) {
    const error = new Error(`Transisi order ${currentStatus} ke ${nextStatus} tidak valid.`);
    error.code = 'INVALID_ORDER_STATUS_TRANSITION';
    error.status = 409;
    throw error;
  }
}

function listAllowedTransitions(status) {
  return [...(ORDER_TRANSITIONS[status] || [])];
}

module.exports = {
  assertOrderTransition,
  listAllowedTransitions,
  ORDER_TRANSITIONS
};
