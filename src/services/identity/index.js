'use strict';

/**
 * Identity Service — модели данных и чтение 
 */
const { openServiceDb } = require('../../common/db');

const db = openServiceDb('identity');

db.exec(`
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  login TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles(id),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  position TEXT NOT NULL,
  specialization TEXT
);
`);

const queries = {
  findRoleByCode: db.prepare('SELECT * FROM roles WHERE code = ?'),
  findUserById: db.prepare(`
    SELECT u.id, u.login, u.status, u.created_at, r.code AS role
    FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`),
  findUserByLogin: db.prepare(`
    SELECT u.id, u.login, u.password_hash, u.status, u.created_at, r.code AS role
    FROM users u JOIN roles r ON r.id = u.role_id WHERE u.login = ?`),
  findEmployeeByUserId: db.prepare('SELECT * FROM employees WHERE user_id = ?'),
  findEmployeeById: db.prepare('SELECT * FROM employees WHERE id = ?'),
};

const identityRepo = {
  findRoleByCode: (code) => queries.findRoleByCode.get(code),
  findUserById: (id) => queries.findUserById.get(id),
  findUserByLogin: (login) => queries.findUserByLogin.get(login),
  findEmployeeByUserId: (userId) => queries.findEmployeeByUserId.get(userId),
  findEmployeeById: (id) => queries.findEmployeeById.get(id),
};

module.exports = { db, identityRepo };
