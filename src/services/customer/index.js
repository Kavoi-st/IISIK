'use strict';

/**
 * Customer Service — модели данных и чтение 
 */
const { openServiceDb } = require('../../common/db');

const db = openServiceDb('customer');

db.exec(`
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS device_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  category_id TEXT NOT NULL REFERENCES device_categories(id),
  model TEXT NOT NULL,
  serial_number TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

const queries = {
  findClientById: db.prepare('SELECT * FROM clients WHERE id = ?'),
  findClientByUserId: db.prepare('SELECT * FROM clients WHERE user_id = ?'),
  listDevicesByClient: db.prepare('SELECT * FROM devices WHERE client_id = ? ORDER BY created_at DESC'),
  findDeviceById: db.prepare('SELECT * FROM devices WHERE id = ?'),
  findCategoryById: db.prepare('SELECT * FROM device_categories WHERE id = ?'),
  listCategories: db.prepare('SELECT * FROM device_categories ORDER BY name'),
};

const toBool = (row) => row && ({ ...row, is_active: !!row.is_active });

const customerRepo = {
  findClientById: (id) => queries.findClientById.get(id),
  findClientByUserId: (userId) => queries.findClientByUserId.get(userId),
  listDevicesByClient: (clientId) => queries.listDevicesByClient.all(clientId),
  findDeviceById: (id) => queries.findDeviceById.get(id),
  findCategoryById: (id) => toBool(queries.findCategoryById.get(id)),
  listCategories: () => queries.listCategories.all().map(toBool),
};

module.exports = { db, customerRepo };
