function feeSnapshotValue(order, key, fallback = 0) {
  const snapshot = order?.feeSnapshot || {};
  const value = Number(snapshot[key] ?? fallback);
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback;
}

const BALANCE_TRANSACTION_TYPES = [
  'ORDER_CREDIT',
  'COMMISSION_DEBIT',
  'PAYMENT_FEE_DEBIT',
  'REFUND_DEBIT',
  'ADJUSTMENT_CREDIT',
  'ADJUSTMENT_DEBIT',
  'PAYOUT_DEBIT'
];

function serializeBalance(balance, currency = 'IDR') {
  return {
    currency,
    pending: balance?.pending || 0,
    available: balance?.available || 0,
    held: balance?.held || 0
  };
}

function serializeLedgerTransaction(transaction) {
  return {
    id: transaction.id,
    orderId: transaction.orderId,
    payoutId: transaction.payoutId,
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    description: transaction.description,
    metadata: transaction.metadata,
    createdAt: transaction.createdAt
  };
}

function groupTotalsByType(rows) {
  const totals = Object.fromEntries(
    BALANCE_TRANSACTION_TYPES.map((type) => [type, { amount: 0, count: 0 }])
  );

  for (const row of rows) {
    totals[row.type] = {
      amount: row._sum.amount || 0,
      count: row._count._all || 0
    };
  }

  return totals;
}

async function getVendorFinanceSnapshot(prisma, vendorId, options = {}) {
  const currency = options.currency || 'IDR';
  const limit = options.limit || 25;
  const type = options.type;
  const cursor = options.cursor;
  const where = {
    vendorId,
    currency,
    ...(type ? { type } : {})
  };

  const [balance, totalsByType, transactionCount, transactions] = await Promise.all([
    prisma.vendorBalance.findUnique({
      where: {
        vendorId_currency: {
          vendorId,
          currency
        }
      }
    }),
    prisma.vendorBalanceTransaction.groupBy({
      by: ['type'],
      where: { vendorId, currency },
      _sum: { amount: true },
      _count: { _all: true }
    }),
    prisma.vendorBalanceTransaction.count({ where }),
    prisma.vendorBalanceTransaction.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    })
  ]);

  const page = transactions.slice(0, limit);
  const hasMore = transactions.length > limit;
  const groupedTotals = groupTotalsByType(totalsByType);

  return {
    balance: serializeBalance(balance, currency),
    totals: {
      grossCredits: groupedTotals.ORDER_CREDIT.amount,
      platformCommissions: groupedTotals.COMMISSION_DEBIT.amount,
      paymentFees: groupedTotals.PAYMENT_FEE_DEBIT.amount,
      refunds: groupedTotals.REFUND_DEBIT.amount,
      adjustmentCredits: groupedTotals.ADJUSTMENT_CREDIT.amount,
      adjustmentDebits: groupedTotals.ADJUSTMENT_DEBIT.amount,
      payouts: groupedTotals.PAYOUT_DEBIT.amount,
      byType: groupedTotals
    },
    transactions: page.map(serializeLedgerTransaction),
    pagination: {
      limit,
      count: page.length,
      total: transactionCount,
      hasMore,
      nextCursor: hasMore ? page[page.length - 1].id : null
    }
  };
}

async function recordVendorPendingSettlement(prisma, order) {
  const netAmount = feeSnapshotValue(order, 'vendorNetAmount', order.subtotal);
  const commissionAmount = feeSnapshotValue(order, 'commissionAmount', 0);
  const orderCreditKey = `order-credit:${order.id}`;
  const commissionKey = `commission-debit:${order.id}`;

  const existing = await prisma.vendorBalanceTransaction.findUnique({
    where: { idempotencyKey: orderCreditKey }
  });
  if (existing) {
    return { created: false };
  }

  await prisma.vendorBalance.upsert({
    where: {
      vendorId_currency: {
        vendorId: order.vendorId,
        currency: 'IDR'
      }
    },
    update: {
      pending: { increment: netAmount }
    },
    create: {
      vendorId: order.vendorId,
      currency: 'IDR',
      pending: netAmount,
      available: 0,
      held: 0
    }
  });

  await prisma.vendorBalanceTransaction.create({
    data: {
      vendorId: order.vendorId,
      orderId: order.id,
      type: 'ORDER_CREDIT',
      amount: order.subtotal,
      description: `Gross order credit ${order.orderNumber}`,
      metadata: {
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus
      },
      idempotencyKey: orderCreditKey
    }
  });

  if (commissionAmount > 0) {
    await prisma.vendorBalanceTransaction.create({
      data: {
        vendorId: order.vendorId,
        orderId: order.id,
        type: 'COMMISSION_DEBIT',
        amount: commissionAmount,
        description: `Platform commission ${order.orderNumber}`,
        metadata: {
          orderNumber: order.orderNumber,
          commissionRateBps: feeSnapshotValue(order, 'commissionRateBps', 0)
        },
        idempotencyKey: commissionKey
      }
    });
  }

  return { created: true, netAmount, commissionAmount };
}

async function releaseVendorAvailableSettlement(prisma, order) {
  const netAmount = feeSnapshotValue(order, 'vendorNetAmount', order.subtotal);
  const releaseKey = `available-release:${order.id}`;

  const existing = await prisma.vendorBalanceTransaction.findUnique({
    where: { idempotencyKey: releaseKey }
  });
  if (existing) {
    return { created: false };
  }

  const balance = await prisma.vendorBalance.findUnique({
    where: {
      vendorId_currency: {
        vendorId: order.vendorId,
        currency: 'IDR'
      }
    }
  });

  if (!balance || balance.pending < netAmount) {
    const error = new Error('Saldo pending vendor tidak cukup untuk release.');
    error.code = 'VENDOR_PENDING_BALANCE_INSUFFICIENT';
    error.status = 409;
    throw error;
  }

  await prisma.vendorBalance.update({
    where: {
      vendorId_currency: {
        vendorId: order.vendorId,
        currency: 'IDR'
      }
    },
    data: {
      pending: { decrement: netAmount },
      available: { increment: netAmount }
    }
  });

  await prisma.vendorBalanceTransaction.create({
    data: {
      vendorId: order.vendorId,
      orderId: order.id,
      type: 'ADJUSTMENT_CREDIT',
      amount: netAmount,
      description: `Release pending balance to available ${order.orderNumber}`,
      metadata: {
        movement: 'PENDING_TO_AVAILABLE',
        orderNumber: order.orderNumber
      },
      idempotencyKey: releaseKey
    }
  });

  return { created: true, netAmount };
}

async function holdVendorSettlementForDispute(prisma, order) {
  const netAmount = feeSnapshotValue(order, 'vendorNetAmount', order.subtotal);
  const holdKey = `dispute-hold:${order.id}`;

  const existing = await prisma.vendorBalanceTransaction.findUnique({
    where: { idempotencyKey: holdKey }
  });
  if (existing) {
    return { created: false };
  }

  const balance = await prisma.vendorBalance.findUnique({
    where: {
      vendorId_currency: {
        vendorId: order.vendorId,
        currency: 'IDR'
      }
    }
  });

  if (!balance || balance.available < netAmount) {
    return {
      created: false,
      skipped: true,
      reason: 'AVAILABLE_BALANCE_INSUFFICIENT'
    };
  }

  await prisma.vendorBalance.update({
    where: {
      vendorId_currency: {
        vendorId: order.vendorId,
        currency: 'IDR'
      }
    },
    data: {
      available: { decrement: netAmount },
      held: { increment: netAmount }
    }
  });

  await prisma.vendorBalanceTransaction.create({
    data: {
      vendorId: order.vendorId,
      orderId: order.id,
      type: 'ADJUSTMENT_DEBIT',
      amount: netAmount,
      description: `Hold available balance for dispute ${order.orderNumber}`,
      metadata: {
        movement: 'AVAILABLE_TO_HELD',
        orderNumber: order.orderNumber
      },
      idempotencyKey: holdKey
    }
  });

  return { created: true, netAmount };
}

async function createRefundRequestForOrder(prisma, order, reason, amount = order.grandTotal) {
  const payment = await prisma.payment.findFirst({
    where: {
      orderId: order.id,
      status: 'PAID'
    },
    orderBy: { paidAt: 'desc' }
  });

  const existing = await prisma.refund.findFirst({
    where: {
      orderId: order.id,
      status: { in: ['REQUESTED', 'PROCESSING', 'SUCCEEDED'] }
    },
    orderBy: { createdAt: 'desc' }
  });
  if (existing) {
    return { created: false, refund: existing };
  }

  const refund = await prisma.refund.create({
    data: {
      orderId: order.id,
      paymentId: payment?.id || null,
      amount: Math.min(Math.max(0, Math.round(Number(amount) || 0)), order.grandTotal),
      reason,
      status: 'REQUESTED',
      metadata: {
        skeleton: true,
        notice: 'Refund request dibuat, tetapi provider refund nyata belum diproses.'
      }
    }
  });

  return { created: true, refund };
}

module.exports = {
  BALANCE_TRANSACTION_TYPES,
  createRefundRequestForOrder,
  getVendorFinanceSnapshot,
  holdVendorSettlementForDispute,
  recordVendorPendingSettlement,
  releaseVendorAvailableSettlement
};
