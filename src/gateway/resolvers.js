'use strict';

/**
 * Резолверы GraphQL-шлюза (только Query + агрегирующие поля).
 * Шлюз не ходит в БД напрямую — только через mock-клиенты сервисов (абстракции gRPC).
 */
const { GraphQLError } = require('graphql');
const {
  MockCustomerClient, MockCatalogClient, MockRepairClient,
  MockPaymentClient, MockNotificationClient, MockAnalyticsClient,
} = require('../clients');
const { identityRepo } = require('../services/identity');
const { customerRepo } = require('../services/customer');

const customerClient = new MockCustomerClient();
const catalogClient = new MockCatalogClient();
const repairClient = new MockRepairClient();
const paymentClient = new MockPaymentClient();
const notificationClient = new MockNotificationClient();
const analyticsClient = new MockAnalyticsClient();

function notFound(message) {
  return new GraphQLError(message, { extensions: { code: 'NOT_FOUND' } });
}
function forbidden(message) {
  return new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
}
function unauthenticated() {
  return new GraphQLError('Требуется авторизация: передайте заголовок Authorization: Bearer <token>', {
    extensions: { code: 'UNAUTHENTICATED' },
  });
}

function requireAuth(context) {
  if (!context.principal) throw unauthenticated();
  return context.principal;
}
function requireRole(context, roles) {
  const principal = requireAuth(context);
  if (!roles.includes(principal.role)) {
    throw forbidden(`Операция доступна только ролям: ${roles.join(', ')}`);
  }
  return principal;
}

/** Проверка владения заявкой: клиент видит только свои заявки  */
function assertRequestVisible(request, principal) {
  if (principal.role === 'CLIENT' && request.client_id !== principal.clientId) {
    throw notFound(`Заявка не найдена`); // чужая заявка не существует для клиента
  }
}

// Преобразование snake_case строк БД → camelCase полей схемы.
const toUser = (r) => ({ id: r.id, login: r.login, status: r.status, role: r.role, createdAt: r.created_at });
const toClient = (r) => ({ id: r.id, userId: r.user_id, fullName: r.full_name, phone: r.phone, email: r.email, createdAt: r.created_at });
const toDevice = (r) => ({ id: r.id, clientId: r.client_id, categoryId: r.category_id, model: r.model, serialNumber: r.serial_number, note: r.note, createdAt: r.created_at, updatedAt: r.updated_at });
const toCategory = (r) => ({ id: r.id, name: r.name, isActive: r.is_active });
const toRequest = (r) => ({ id: r.id, clientId: r.client_id, deviceId: r.device_id, categoryId: r.category_id, categoryName: r.category_name, deviceModel: r.device_model, description: r.description, priority: r.priority, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at });
const toWorkOrder = (r) => ({ id: r.id, requestId: r.request_id, employeeId: r.employee_id, status: r.status, totalAmount: r.total_amount, paymentReceived: r.payment_received, createdAt: r.created_at, updatedAt: r.updated_at });
const toServiceItem = (r) => ({ id: r.id, workOrderId: r.work_order_id, serviceId: r.service_id, serviceName: r.service_name, quantity: r.quantity, unitPrice: r.unit_price, lineTotal: r.line_total });
const toPartItem = (r) => ({ id: r.id, workOrderId: r.work_order_id, partId: r.part_id, partSku: r.part_sku, partName: r.part_name, quantity: r.quantity, unitPrice: r.unit_price, lineTotal: r.line_total });
const toCatalogService = (r) => ({ id: r.id, name: r.name, price: r.price, isActive: r.is_active, updatedAt: r.updated_at });
const toPart = (r) => ({ id: r.id, sku: r.sku, name: r.name, price: r.price, stockQty: r.stock_qty, isActive: r.is_active, updatedAt: r.updated_at });
const toPayment = (r) => ({ id: r.id, workOrderId: r.work_order_id, clientId: r.client_id, amount: r.amount, method: r.method, status: r.status, createdAt: r.created_at });
const toNotification = (r) => ({ id: r.id, clientId: r.client_id, requestId: r.request_id, eventType: r.event_type, title: r.title, body: r.body, deliveryStatus: r.delivery_status, createdAt: r.created_at, sentAt: r.sent_at });

const mutationStub = (name) => () => {
  throw new GraphQLError(`Mutation "${name}" объявлена в контракте ЛР2 и будет реализована в ЛР4`, {
    extensions: { code: 'NOT_IMPLEMENTED' },
  });
};

const resolvers = {
  Query: {
    // Identity
    me(parent, args, context) {
      const principal = requireAuth(context);
      const user = identityRepo.findUserById(principal.userId);
      return user ? toUser(user) : null;
    },

    // Customer
    myDevices(parent, args, context) {
      const principal = requireRole(context, ['CLIENT']);
      return customerRepo.listDevicesByClient(principal.clientId).map(toDevice);
    },
    async device(parent, { id }, context) {
      const principal = requireAuth(context);
      const snapshot = await customerClient.getDevice(id, principal.clientId || '');
      if (principal.role === 'CLIENT' && !snapshot.ownedByClient) {
        throw notFound('Устройство не найдено'); 
      }
      const device = customerRepo.findDeviceById(id);
      return device ? toDevice(device) : null;
    },

    // Repair
    myRepairRequests(parent, args, context) {
      const principal = requireRole(context, ['CLIENT']);
      return repairClientRequestsByClient(principal.clientId).map(toRequest);
    },
    async repairRequest(parent, { id }, context) {
      const principal = requireAuth(context);
      const request = repairClientFindRequest(id);
      if (!request) throw notFound(`Заявка ${id} не найдена`);
      assertRequestVisible(request, principal);
      return toRequest(request);
    },
    repairQueue(parent, { filter, sort }, context) {
      requireRole(context, ['EMPLOYEE', 'ADMIN']);
      return repairClientQueue(filter || {}, sort || 'CREATED_AT').map(toRequest);
    },
    async workOrder(parent, { id }, context) {
      const principal = requireAuth(context);
      const order = repairClientFindWorkOrder(id);
      if (!order) throw notFound(`Заказ-наряд ${id} не найден`);
      const request = repairClientFindRequest(order.request_id);
      if (request) assertRequestVisible(request, principal);
      return toWorkOrder(order);
    },

    // Catalog
    catalogServices(parent, args, context) {
      requireRole(context, ['EMPLOYEE', 'ADMIN']);
      return catalogClientListServices().map(toCatalogService);
    },
    catalogParts(parent, args, context) {
      requireRole(context, ['EMPLOYEE', 'ADMIN']);
      return catalogClientListParts().map(toPart);
    },

    // Notification
    myNotifications(parent, args, context) {
      const principal = requireRole(context, ['CLIENT']);
      return notificationClient.listNotificationsByClient(principal.clientId).then((rows) => rows.map(toNotification));
    },

    // Analytics 
    async analyticsSummary(parent, { from, to }, context) {
      requireRole(context, ['ADMIN']);
      const s = await analyticsClient.summary(from, to);
      return {
        periodFrom: from,
        periodTo: to,
        requestsCreated: s.requestsCreated,
        requestsReady: s.requestsReady,
        requestsClosed: s.requestsClosed,
        requestsCancelled: s.requestsCancelled,
        openRepairs: s.openRepairs,
        revenue: s.revenue,
        paymentsCount: s.paymentsCount,
        topServices: s.topServices.map((r) => ({ serviceId: r.service_id, serviceName: r.service_name, itemsCount: r.items_count, amountSum: r.amount_sum })),
        topCategories: s.topCategories.map((r) => ({ categoryId: r.category_id, categoryName: r.category_name, requestsCount: r.requests_count })),
      };
    },
  },

  //Агрегация связанных данных на шлюзе 
  RepairRequest: {
    async workOrder(request) {
      const order = repairClientFindWorkOrderByRequest(request.id);
      return order ? toWorkOrder(order) : null;
    },
    async notifications(request, args, context) {
      // Клиент видит уведомления только своих заявок.
      if (context.principal && context.principal.role === 'CLIENT') {
        const req = repairClientFindRequest(request.id);
        if (!req || req.client_id !== context.principal.clientId) return [];
      }
      const rows = await notificationClient.listNotificationsByRequest(request.id);
      return rows.map(toNotification);
    },
  },
  WorkOrder: {
    serviceItems(order) { return repairClientServiceItems(order.id).map(toServiceItem); },
    partItems(order) { return repairClientPartItems(order.id).map(toPartItem); },
    async payments(order) {
      const rows = await paymentClient.listPaymentsByWorkOrder(order.id);
      return rows.map(toPayment);
    },
  },
  Device: {
    category(device) {
      const category = customerRepo.findCategoryById(device.categoryId);
      return category ? toCategory(category) : null;
    },
    client(device) {
      const client = customerRepo.findClientById(device.clientId);
      return client ? toClient(client) : null;
    },
  },
};

// Локальные обёртки над репозиториями Repair потом на стаб поменяются
const { repairRepo } = require('../services/repair');
const { catalogRepo } = require('../services/catalog');
function repairClientRequestsByClient(clientId) { return repairRepo.listRequestsByClient(clientId); }
function repairClientFindRequest(id) { return repairRepo.findRequestById(id); }
function repairClientFindWorkOrder(id) { return repairRepo.findWorkOrderById(id); }
function repairClientFindWorkOrderByRequest(requestId) { return repairRepo.findWorkOrderByRequestId(requestId); }
function repairClientQueue(filter, sort) { return repairRepo.queue(filter, sort); }
function repairClientServiceItems(workOrderId) { return repairRepo.listServiceItems(workOrderId); }
function repairClientPartItems(workOrderId) { return repairRepo.listPartItems(workOrderId); }
function catalogClientListServices() { return catalogRepo.listServices(); }
function catalogClientListParts() { return catalogRepo.listParts(); }

// Mutation
const mutationNames = [
  'registerUser', 'login', 'assignRole', 'registerDevice', 'updateDevice',
  'createRepairRequest', 'acceptRepairRequest', 'markDeviceReceived', 'startDiagnosis',
  'addWorkOrderService', 'addWorkOrderPart', 'calculateWorkOrderTotal',
  'approveRepairEstimate', 'rejectRepairEstimate', 'completeWorkOrder',
  'markDeviceReady', 'closeRepairRequest', 'cancelRepairRequest',
  'registerPayment', 'upsertService', 'upsertPart',
];
resolvers.Mutation = Object.fromEntries(mutationNames.map((n) => [n, mutationStub(n)]));

module.exports = { resolvers };
