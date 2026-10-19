'use strict';

/**
 * Payment Service — модели данных и чтение 
 */
const { openServiceDb } = require('../../common/db');

const db = openServiceDb('payment');

db.exec(`
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_wo ON payments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
`);

const queries = {
  listPaymentsByWorkOrder: db.prepare('SELECT * FROM payments WHERE work_order_id = ? ORDER BY created_at'),
  listPaymentsByClient: db.prepare('SELECT * FROM payments WHERE client_id = ? ORDER BY created_at DESC'),
  sumCompletedByWorkOrder: db.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE work_order_id = ? AND status = 'COMPLETED'"),
};

const paymentRepo = {
  listPaymentsByWorkOrder: (workOrderId) => queries.listPaymentsByWorkOrder.all(workOrderId),
  listPaymentsByClient: (clientId) => queries.listPaymentsByClient.all(clientId),
  sumCompletedByWorkOrder: (workOrderId) => queries.sumCompletedByWorkOrder.get(workOrderId).paid,
};

module.exports = { db, paymentRepo };
