'use strict';

/**
 * Базовая конфигурация приложений
 */
const path = require('path');

const ROOT = path.join(__dirname, '..');

module.exports = {
  gateway: {
    host: process.env.GATEWAY_HOST || '127.0.0.1',
    port: Number(process.env.GATEWAY_PORT || 4000),
    schemaPath: path.join(ROOT, 'contracts', 'schema.graphql'),
  },
  database: {
    // Отдельная файловая БД на каждый сервис: сервис пишет только в свою БД 
    dir: process.env.DB_DIR || path.join(ROOT, 'data'),
    files: {
      identity: 'identity.db',
      customer: 'customer.db',
      repair: 'repair.db',
      catalog: 'catalog.db',
      payment: 'payment.db',
      notification: 'notification.db',
      analytics: 'analytics.db',
    },
  },
  auth: {
    // Учебные токены вместо JWT
    demoTokens: {
      'jwt-client-1': { userId: 'u-client-1', role: 'CLIENT', clientId: 'c-1', employeeId: null },
      'jwt-client-2': { userId: 'u-client-2', role: 'CLIENT', clientId: 'c-2', employeeId: null },
      'jwt-employee-1': { userId: 'u-emp-1', role: 'EMPLOYEE', clientId: null, employeeId: 'e-1' },
      'jwt-admin-1': { userId: 'u-admin-1', role: 'ADMIN', clientId: null, employeeId: null },
    },
  },
};
