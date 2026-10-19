'use strict';

/**
 * Catalog Service — модели данных и чтение (
 *
 */
const { openServiceDb } = require('../../common/db');

const db = openServiceDb('catalog');

db.exec(`
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  is_active INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS spare_parts (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  stock_qty INTEGER NOT NULL,
  is_active INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
`);

const toBool = (row) => row && ({ ...row, is_active: !!row.is_active });

const queries = {
  listServices: db.prepare('SELECT * FROM services ORDER BY name'),
  findServiceById: db.prepare('SELECT * FROM services WHERE id = ?'),
  listParts: db.prepare('SELECT * FROM spare_parts ORDER BY name'),
  findPartById: db.prepare('SELECT * FROM spare_parts WHERE id = ?'),
};

const catalogRepo = {
  listServices: () => queries.listServices.all().map(toBool),
  findServiceById: (id) => toBool(queries.findServiceById.get(id)),
  listParts: () => queries.listParts.all().map(toBool),
  findPartById: (id) => toBool(queries.findPartById.get(id)),
};

module.exports = { db, catalogRepo };
