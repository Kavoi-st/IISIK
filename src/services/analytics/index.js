'use strict';

/**
 * Analytics Service — модели данных и чтение 
 */
const { openServiceDb } = require('../../common/db');

const db = openServiceDb('analytics');

db.exec(`
CREATE TABLE IF NOT EXISTS request_metrics (
  day TEXT PRIMARY KEY,
  created_count INTEGER NOT NULL,
  ready_count INTEGER NOT NULL,
  closed_count INTEGER NOT NULL,
  cancelled_count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS service_demand (
  service_id TEXT PRIMARY KEY,
  service_name TEXT NOT NULL,
  items_count INTEGER NOT NULL,
  amount_sum REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS category_demand (
  category_id TEXT PRIMARY KEY,
  category_name TEXT NOT NULL,
  requests_count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS revenue_metrics (
  day TEXT PRIMARY KEY,
  payments_count INTEGER NOT NULL,
  revenue_sum REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS open_repairs_gauge (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  open_count INTEGER NOT NULL
);
`);

const queries = {
  sumRequestMetrics: db.prepare(`
    SELECT COALESCE(SUM(created_count),0) AS created, COALESCE(SUM(ready_count),0) AS ready,
           COALESCE(SUM(closed_count),0) AS closed, COALESCE(SUM(cancelled_count),0) AS cancelled
    FROM request_metrics WHERE day BETWEEN ? AND ?`),
  sumRevenue: db.prepare(`
    SELECT COALESCE(SUM(payments_count),0) AS payments_count, COALESCE(SUM(revenue_sum),0) AS revenue
    FROM revenue_metrics WHERE day BETWEEN ? AND ?`),
  topServices: db.prepare('SELECT * FROM service_demand ORDER BY amount_sum DESC LIMIT 5'),
  topCategories: db.prepare('SELECT * FROM category_demand ORDER BY requests_count DESC LIMIT 5'),
  gauge: db.prepare('SELECT open_count FROM open_repairs_gauge WHERE id = 1'),
};

const analyticsRepo = {
  summary(from, to) {
    const req = queries.sumRequestMetrics.get(from, to);
    const rev = queries.sumRevenue.get(from, to);
    const gauge = queries.gauge.get();
    return {
      requestsCreated: req.created,
      requestsReady: req.ready,
      requestsClosed: req.closed,
      requestsCancelled: req.cancelled,
      openRepairs: gauge ? gauge.open_count : 0,
      revenue: rev.revenue,
      paymentsCount: rev.payments_count,
      topServices: queries.topServices.all(),
      topCategories: queries.topCategories.all(),
    };
  },
};

module.exports = { db, analyticsRepo };
