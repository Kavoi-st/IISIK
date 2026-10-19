'use strict';

/**
 * Общий помощник открытия БД сервиса
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../../config/app.config');

function openServiceDb(serviceName) {
  const dir = config.database.dir;
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, config.database.files[serviceName]);
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON'); 
  return db;
}

module.exports = { openServiceDb };
