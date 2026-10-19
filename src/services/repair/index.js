'use strict';

/**
 * Repair Service — модели данных и чтени
 */
const { openServiceDb } = require('../../common/db');

const db = openServiceDb('repair');

db.exec(`
CREATE TABLE IF NOT EXISTS repair_requests (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  device_model TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE REFERENCES repair_requests(id),
  employee_id TEXT,
  status TEXT NOT NULL,
  total_amount REAL NOT NULL DEFAULT 0,
  payment_received INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS work_order_service_items (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id),
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  line_total REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS work_order_part_items (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id),
  part_id TEXT NOT NULL,
  part_sku TEXT NOT NULL,
  part_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  line_total REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_client ON repair_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON repair_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created ON repair_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_wo_request ON work_orders(request_id);
`);

const toBool = (row) => row && ({ ...row, payment_received: !!row.payment_received });

const queries = {
  listRequestsByClient: db.prepare('SELECT * FROM repair_requests WHERE client_id = ? ORDER BY created_at DESC'),
  findRequestById: db.prepare('SELECT * FROM repair_requests WHERE id = ?'),
  findWorkOrderById: db.prepare('SELECT * FROM work_orders WHERE id = ?'),
  findWorkOrderByRequestId: db.prepare('SELECT * FROM work_orders WHERE request_id = ?'),
  listServiceItems: db.prepare('SELECT * FROM work_order_service_items WHERE work_order_id = ?'),
  listPartItems: db.prepare('SELECT * FROM work_order_part_items WHERE work_order_id = ?'),
};

/** Очередь заявок с фильтром и сортировкой (ЛР2, п. 7.10). */
function queue(filter = {}, sort = 'CREATED_AT') {
  const where = [];
  const params = {};
  if (filter.status) { where.push('r.status = @status'); params.status = filter.status; }
  if (filter.categoryId) { where.push('r.category_id = @categoryId'); params.categoryId = filter.categoryId; }
  if (filter.from) { where.push('r.created_at >= @from'); params.from = filter.from; }
  if (filter.to) { where.push('r.created_at <= @to'); params.to = filter.to; }
  const orderBy = {
    CREATED_AT: 'r.created_at DESC',
    PRIORITY: "CASE r.priority WHEN 'HIGH' THEN 0 WHEN 'NORMAL' THEN 1 ELSE 2 END, r.created_at DESC",
    TOTAL_AMOUNT: 'COALESCE(w.total_amount, 0) DESC',
  }[sort] || 'r.created_at DESC';
  const sql = `
    SELECT r.*, COALESCE(w.total_amount, 0) AS queue_total
    FROM repair_requests r
    LEFT JOIN work_orders w ON w.request_id = r.id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ${orderBy}`;
  return db.prepare(sql).all(params);
}

const repairRepo = {
  listRequestsByClient: (clientId) => queries.listRequestsByClient.all(clientId),
  findRequestById: (id) => queries.findRequestById.get(id),
  findWorkOrderById: (id) => toBool(queries.findWorkOrderById.get(id)),
  findWorkOrderByRequestId: (requestId) => toBool(queries.findWorkOrderByRequestId.get(requestId)),
  listServiceItems: (workOrderId) => queries.listServiceItems.all(workOrderId),
  listPartItems: (workOrderId) => queries.listPartItems.all(workOrderId),
  queue,
};

module.exports = { db, repairRepo };
