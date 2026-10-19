'use strict';

/**
 * Тестовые/начальные данные как по требованиям лр3
 * Сидер заполняет БД всех семи сервисов согласованным набором данных:
 * три роли, три пользователя, клиент, мастер, категории, устройства,
 * заявки во всех ключевых статусах, наряды с позициями и снимками цен,
 * платёж, уведомления и аналитические витрины.
 */
const { db: identityDb } = require('../services/identity');
const { db: customerDb } = require('../services/customer');
const { db: repairDb } = require('../services/repair');
const { db: catalogDb } = require('../services/catalog');
const { db: paymentDb } = require('../services/payment');
const { db: notificationDb } = require('../services/notification');
const { db: analyticsDb } = require('../services/analytics');

const T = (iso) => iso; // TIMESTAMP храним как ISO-строку (SQLite TEXT)

const SEED = {
  identity: {
    roles: [
      { id: 'r-client', code: 'CLIENT', name: 'Клиент' },
      { id: 'r-employee', code: 'EMPLOYEE', name: 'Сотрудник' },
      { id: 'r-admin', code: 'ADMIN', name: 'Администратор' },
    ],
    users: [
      { id: 'u-client-1', login: 'ivan.petrov', password_hash: 'hash:demo', status: 'ACTIVE', role_id: 'r-client', created_at: T('2026-09-01T09:00:00Z') },
      { id: 'u-client-2', login: 'marina.ivanova', password_hash: 'hash:demo', status: 'ACTIVE', role_id: 'r-client', created_at: T('2026-09-04T10:00:00Z') },
      { id: 'u-emp-1', login: 'sergey.master', password_hash: 'hash:demo', status: 'ACTIVE', role_id: 'r-employee', created_at: T('2026-09-01T09:05:00Z') },
      { id: 'u-admin-1', login: 'admin', password_hash: 'hash:demo', status: 'ACTIVE', role_id: 'r-admin', created_at: T('2026-09-01T09:10:00Z') },
    ],
    employees: [
      { id: 'e-1', user_id: 'u-emp-1', position: 'Инженер по ремонту', specialization: 'Холодильное оборудование' },
    ],
  },
  customer: {
    clients: [
      { id: 'c-1', user_id: 'u-client-1', full_name: 'Петров Иван Сергеевич', phone: '+7-900-111-22-33', email: 'ivan.petrov@example.com', created_at: T('2026-09-01T09:01:00Z') },
      { id: 'c-2', user_id: 'u-client-2', full_name: 'Иванова Марина Алексеевна', phone: '+7-900-444-55-66', email: 'marina.ivanova@example.com', created_at: T('2026-09-04T10:01:00Z') },
    ],
    device_categories: [
      { id: 'cat-fridge', name: 'Холодильник', is_active: 1 },
      { id: 'cat-washer', name: 'Стиральная машина', is_active: 1 },
      { id: 'cat-tv', name: 'Телевизор', is_active: 1 },
      { id: 'cat-vacuum', name: 'Пылесос', is_active: 0 },
    ],
    devices: [
      { id: 'd-1', client_id: 'c-1', category_id: 'cat-fridge', model: 'Atlant МХМ 6024', serial_number: 'SN-88001', note: 'Не морозит верхняя камера', created_at: T('2026-09-02T10:00:00Z'), updated_at: T('2026-09-02T10:00:00Z') },
      { id: 'd-2', client_id: 'c-1', category_id: 'cat-washer', model: 'LG F2J3HS2W', serial_number: 'SN-88002', note: 'Не отжимает', created_at: T('2026-09-03T11:00:00Z'), updated_at: T('2026-09-03T11:00:00Z') },
      { id: 'd-3', client_id: 'c-1', category_id: 'cat-tv', model: 'Samsung UE43AU7100', serial_number: null, note: 'Нет изображения, есть звук', created_at: T('2026-09-05T12:00:00Z'), updated_at: T('2026-09-05T12:00:00Z') },
      { id: 'd-4', client_id: 'c-2', category_id: 'cat-washer', model: 'Bosch WAJ20170ME', serial_number: 'SN-99001', note: 'Течёт со дна бака', created_at: T('2026-10-12T15:00:00Z'), updated_at: T('2026-10-12T15:00:00Z') },
    ],
  },
  catalog: {
    services: [
      { id: 's-diag', name: 'Диагностика', price: 800, is_active: 1, updated_at: T('2026-09-01T00:00:00Z') },
      { id: 's-comp', name: 'Замена компрессора', price: 4500, is_active: 1, updated_at: T('2026-09-01T00:00:00Z') },
      { id: 's-ten', name: 'Замена ТЭНа', price: 2200, is_active: 1, updated_at: T('2026-09-01T00:00:00Z') },
      { id: 's-clean', name: 'Профилактическая чистка', price: 1500, is_active: 1, updated_at: T('2026-09-01T00:00:00Z') },
      { id: 's-old', name: 'Регулировка механического таймера', price: 900, is_active: 0, updated_at: T('2026-08-15T00:00:00Z') },
    ],
    spare_parts: [
      { id: 'p-comp', sku: 'COMP-ATL-6024', name: 'Компрессор для Atlant МХМ', price: 6200, stock_qty: 4, is_active: 1, updated_at: T('2026-09-01T00:00:00Z') },
      { id: 'p-ten', sku: 'TEN-LG-1900', name: 'ТЭН 1900W для LG', price: 1750, stock_qty: 12, is_active: 1, updated_at: T('2026-09-01T00:00:00Z') },
      { id: 'p-belt', sku: 'BELT-UNI-1270', name: 'Ремень привода 1270 J5', price: 650, stock_qty: 25, is_active: 1, updated_at: T('2026-09-01T00:00:00Z') },
      { id: 'p-filter', sku: 'FILT-SAM-43', name: 'Шлейф T-con Samsung 43"', price: 3100, stock_qty: 0, is_active: 1, updated_at: T('2026-09-01T00:00:00Z') },
    ],
  },
  repair: {
    repair_requests: [
      { id: 'rq-1', client_id: 'c-1', device_id: 'd-1', category_id: 'cat-fridge', category_name: 'Холодильник', device_model: 'Atlant МХМ 6024', description: 'Не морозит верхняя камера', priority: 'HIGH', status: 'IN_REPAIR', created_at: T('2026-10-10T08:30:00Z'), updated_at: T('2026-10-12T09:00:00Z') },
      { id: 'rq-2', client_id: 'c-1', device_id: 'd-2', category_id: 'cat-washer', category_name: 'Стиральная машина', device_model: 'LG F2J3HS2W', description: 'Не отжимает, шум при полоскании', priority: 'NORMAL', status: 'READY', created_at: T('2026-10-02T09:15:00Z'), updated_at: T('2026-10-14T10:00:00Z') },
      { id: 'rq-3', client_id: 'c-1', device_id: 'd-3', category_id: 'cat-tv', category_name: 'Телевизор', device_model: 'Samsung UE43AU7100', description: 'Нет изображения, есть звук', priority: 'LOW', status: 'CLOSED', created_at: T('2026-09-20T13:40:00Z'), updated_at: T('2026-09-24T17:30:00Z') },
      { id: 'rq-4', client_id: 'c-1', device_id: 'd-1', category_id: 'cat-fridge', category_name: 'Холодильник', device_model: 'Atlant МХМ 6024', description: 'Замена уплотнителя двери', priority: 'LOW', status: 'CREATED', created_at: T('2026-10-15T14:20:00Z'), updated_at: T('2026-10-15T14:20:00Z') },
      { id: 'rq-5', client_id: 'c-2', device_id: 'd-4', category_id: 'cat-washer', category_name: 'Стиральная машина', device_model: 'Bosch WAJ20170ME', description: 'Течь со дна бака', priority: 'HIGH', status: 'ACCEPTED', created_at: T('2026-10-16T09:00:00Z'), updated_at: T('2026-10-16T09:30:00Z') },
    ],
    work_orders: [
      { id: 'wo-1', request_id: 'rq-1', employee_id: 'e-1', status: 'IN_PROGRESS', total_amount: 11500, payment_received: 0, created_at: T('2026-10-11T09:00:00Z'), updated_at: T('2026-10-12T09:00:00Z') },
      { id: 'wo-2', request_id: 'rq-2', employee_id: 'e-1', status: 'COMPLETED', total_amount: 3950, payment_received: 1, created_at: T('2026-10-02T11:00:00Z'), updated_at: T('2026-10-14T10:00:00Z') },
      { id: 'wo-3', request_id: 'rq-3', employee_id: 'e-1', status: 'COMPLETED', total_amount: 2400, payment_received: 1, created_at: T('2026-09-21T10:00:00Z'), updated_at: T('2026-09-24T17:00:00Z') },
    ],
    work_order_service_items: [
      { id: 'wi-s1', work_order_id: 'wo-1', service_id: 's-diag', service_name: 'Диагностика', quantity: 1, unit_price: 800, line_total: 800 },
      { id: 'wi-s2', work_order_id: 'wo-1', service_id: 's-comp', service_name: 'Замена компрессора', quantity: 1, unit_price: 4500, line_total: 4500 },
      { id: 'wi-s3', work_order_id: 'wo-2', service_id: 's-diag', service_name: 'Диагностика', quantity: 1, unit_price: 800, line_total: 800 },
      { id: 'wi-s4', work_order_id: 'wo-2', service_id: 's-ten', service_name: 'Замена ТЭНа', quantity: 1, unit_price: 2200, line_total: 2200 },
      { id: 'wi-s5', work_order_id: 'wo-3', service_id: 's-diag', service_name: 'Диагностика', quantity: 1, unit_price: 800, line_total: 800 },
      { id: 'wi-s6', work_order_id: 'wo-3', service_id: 's-clean', service_name: 'Профилактическая чистка', quantity: 1, unit_price: 1500, line_total: 1500 },
    ],
    work_order_part_items: [
      { id: 'wi-p1', work_order_id: 'wo-1', part_id: 'p-comp', part_sku: 'COMP-ATL-6024', part_name: 'Компрессор для Atlant МХМ', quantity: 1, unit_price: 6200, line_total: 6200 },
      { id: 'wi-p2', work_order_id: 'wo-2', part_id: 'p-ten', part_sku: 'TEN-LG-1900', part_name: 'ТЭН 1900W для LG', quantity: 1, unit_price: 1750, line_total: 1750 },
    ],
  },
  payment: {
    payments: [
      { id: 'pay-1', work_order_id: 'wo-2', client_id: 'c-1', amount: 3950, method: 'CARD', status: 'COMPLETED', created_at: T('2026-10-14T10:05:00Z') },
      { id: 'pay-2', work_order_id: 'wo-3', client_id: 'c-1', amount: 2400, method: 'CASH', status: 'COMPLETED', created_at: T('2026-09-24T17:05:00Z') },
    ],
  },
  notification: {
    notifications: [
      { id: 'n-1', client_id: 'c-1', request_id: 'rq-1', event_type: 'RepairRequestCreated', title: 'Заявка зарегистрирована', body: 'Заявка rq-1 зарегистрирована и ожидает приёма', delivery_status: 'SENT', created_at: T('2026-10-10T08:30:05Z'), sent_at: T('2026-10-10T08:30:06Z') },
      { id: 'n-2', client_id: 'c-1', request_id: 'rq-1', event_type: 'RepairStatusChanged', title: 'Заявка принята сервисом', body: 'Статус заявки rq-1: ACCEPTED', delivery_status: 'SENT', created_at: T('2026-10-10T12:00:00Z'), sent_at: T('2026-10-10T12:00:01Z') },
      { id: 'n-3', client_id: 'c-1', request_id: 'rq-2', event_type: 'WorkOrderPriced', title: 'Требуется согласование стоимости', body: 'Сумма по наряду wo-2: 3950 ₽', delivery_status: 'SENT', created_at: T('2026-10-03T10:00:00Z'), sent_at: T('2026-10-03T10:00:02Z') },
      { id: 'n-4', client_id: 'c-1', request_id: 'rq-2', event_type: 'DeviceReadyForPickup', title: 'Устройство готово к выдаче', body: 'Стиральная машина LG F2J3HS2W готова к выдаче', delivery_status: 'SENT', created_at: T('2026-10-14T10:00:00Z'), sent_at: T('2026-10-14T10:00:03Z') },
      { id: 'n-5', client_id: 'c-1', request_id: 'rq-3', event_type: 'PaymentCompleted', title: 'Платёж успешно зарегистрирован', body: 'Платёж pay-2 на сумму 2400 ₽', delivery_status: 'SENT', created_at: T('2026-09-24T17:05:05Z'), sent_at: T('2026-09-24T17:05:06Z') },
    ],
    client_contacts_cache: [
      { client_id: 'c-1', email: 'ivan.petrov@example.com', phone: '+7-900-111-22-33', updated_at: T('2026-10-10T08:30:10Z') },
    ],
  },
  analytics: {
    request_metrics: [
      { day: '2026-09-20', created_count: 1, ready_count: 0, closed_count: 0, cancelled_count: 0 },
      { day: '2026-09-24', created_count: 0, ready_count: 0, closed_count: 1, cancelled_count: 0 },
      { day: '2026-10-02', created_count: 1, ready_count: 0, closed_count: 0, cancelled_count: 0 },
      { day: '2026-10-10', created_count: 1, ready_count: 0, closed_count: 0, cancelled_count: 0 },
      { day: '2026-10-14', created_count: 0, ready_count: 1, closed_count: 0, cancelled_count: 0 },
      { day: '2026-10-15', created_count: 1, ready_count: 0, closed_count: 0, cancelled_count: 0 },
    ],
    service_demand: [
      { service_id: 's-diag', service_name: 'Диагностика', items_count: 3, amount_sum: 2400 },
      { service_id: 's-ten', service_name: 'Замена ТЭНа', items_count: 1, amount_sum: 2200 },
      { service_id: 's-comp', service_name: 'Замена компрессора', items_count: 1, amount_sum: 4500 },
      { service_id: 's-clean', service_name: 'Профилактическая чистка', items_count: 1, amount_sum: 1500 },
    ],
    category_demand: [
      { category_id: 'cat-fridge', category_name: 'Холодильник', requests_count: 2 },
      { category_id: 'cat-washer', category_name: 'Стиральная машина', requests_count: 1 },
      { category_id: 'cat-tv', category_name: 'Телевизор', requests_count: 1 },
    ],
    revenue_metrics: [
      { day: '2026-09-24', payments_count: 1, revenue_sum: 2400 },
      { day: '2026-10-14', payments_count: 1, revenue_sum: 3950 },
    ],
    open_repairs_gauge: [{ id: 1, open_count: 3 }],
  },
};

function seedTable(db, table, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`);
  const tx = db.transaction((items) => items.forEach((r) => stmt.run(r)));
  tx(rows);
}

function seed() {
  seedTable(identityDb, 'roles', SEED.identity.roles);
  seedTable(identityDb, 'users', SEED.identity.users);
  seedTable(identityDb, 'employees', SEED.identity.employees);

  seedTable(customerDb, 'clients', SEED.customer.clients);
  seedTable(customerDb, 'device_categories', SEED.customer.device_categories);
  seedTable(customerDb, 'devices', SEED.customer.devices);

  seedTable(catalogDb, 'services', SEED.catalog.services);
  seedTable(catalogDb, 'spare_parts', SEED.catalog.spare_parts);

  seedTable(repairDb, 'repair_requests', SEED.repair.repair_requests);
  seedTable(repairDb, 'work_orders', SEED.repair.work_orders);
  seedTable(repairDb, 'work_order_service_items', SEED.repair.work_order_service_items);
  seedTable(repairDb, 'work_order_part_items', SEED.repair.work_order_part_items);

  seedTable(paymentDb, 'payments', SEED.payment.payments);

  seedTable(notificationDb, 'notifications', SEED.notification.notifications);
  seedTable(notificationDb, 'client_contacts_cache', SEED.notification.client_contacts_cache);

  seedTable(analyticsDb, 'request_metrics', SEED.analytics.request_metrics);
  seedTable(analyticsDb, 'service_demand', SEED.analytics.service_demand);
  seedTable(analyticsDb, 'category_demand', SEED.analytics.category_demand);
  seedTable(analyticsDb, 'revenue_metrics', SEED.analytics.revenue_metrics);
  seedTable(analyticsDb, 'open_repairs_gauge', SEED.analytics.open_repairs_gauge);

  const counts = {
    identity: identityDb.prepare('SELECT (SELECT COUNT(*) FROM users) AS u, (SELECT COUNT(*) FROM employees) AS e').get(),
    customer: customerDb.prepare('SELECT (SELECT COUNT(*) FROM clients) AS c, (SELECT COUNT(*) FROM devices) AS d, (SELECT COUNT(*) FROM device_categories) AS cat').get(),
    repair: repairDb.prepare('SELECT (SELECT COUNT(*) FROM repair_requests) AS r, (SELECT COUNT(*) FROM work_orders) AS w').get(),
    catalog: catalogDb.prepare('SELECT (SELECT COUNT(*) FROM services) AS s, (SELECT COUNT(*) FROM spare_parts) AS p').get(),
    payment: paymentDb.prepare('SELECT COUNT(*) AS n FROM payments').get(),
    notification: notificationDb.prepare('SELECT COUNT(*) AS n FROM notifications').get(),
    analytics: analyticsDb.prepare('SELECT (SELECT COUNT(*) FROM request_metrics) AS m').get(),
  };
  console.log('БД заполнены начальными данными:', JSON.stringify(counts, null, 2));
}

if (require.main === module) seed();

module.exports = { seed, SEED };
