'use strict';

/** 
 *
 *   IdentityClient.validateToken(token)
 *       → user_id, role, client_id, employee_id, active        (ValidateToken)
 *   CustomerClient.getDevice(deviceId, clientId)
 *       → снимки категории/модели, owned_by_client              (GetDevice)
 *   CustomerClient.getClientContacts(clientId)
 *       → email, phone, full_name                               (GetClientContacts)
 *   CatalogClient.getService(serviceId)
 *       → name, price, is_active                                (GetService)
 *   CatalogClient.reservePart(partId, quantity)
 *       → sku, name, unit_price, stock_after                    (ReservePart)
 *   RepairClient.getAmountDue(workOrderId)
 *       → total_amount, client_id, request_id, work_order_status (GetAmountDue)
 *
 */
const { identityRepo } = require('../services/identity');
const { customerRepo } = require('../services/customer');
const { catalogRepo } = require('../services/catalog');
const { repairRepo } = require('../services/repair');
const { paymentRepo } = require('../services/payment');
const { notificationRepo } = require('../services/notification');
const { analyticsRepo } = require('../services/analytics');
const config = require('../../config/app.config');

class RpcError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // NOT_FOUND, INVALID_ARGUMENT, FAILED_PRECONDITION, UNAUTHENTICATED
  }
}

class MockIdentityClient {
  async validateToken(token) {
    const principal = config.auth.demoTokens[token];
    if (!principal) {
      throw new RpcError('UNAUTHENTICATED', 'Токен недействителен');
    }
    const user = identityRepo.findUserById(principal.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new RpcError('UNAUTHENTICATED', 'Пользователь неактивен');
    }
    return { ...principal, active: true };
  }
}

class MockCustomerClient {
  // GetDevice: подтверждение владельца устройства + снимок для заявки
  async getDevice(deviceId, clientId) {
    const device = customerRepo.findDeviceById(deviceId);
    if (!device) throw new RpcError('NOT_FOUND', `Устройство ${deviceId} не найдено`);
    const category = customerRepo.findCategoryById(device.category_id);
    return {
      deviceId: device.id,
      clientId: device.client_id,
      categoryId: device.category_id,
      categoryName: category ? category.name : null,
      deviceModel: device.model,
      ownedByClient: device.client_id === clientId,
    };
  }

  // GetClientContacts: для Notification (в ЛР3 читается через кэш/репозиторий)
  async getClientContacts(clientId) {
    const client = customerRepo.findClientById(clientId);
    if (!client) throw new RpcError('NOT_FOUND', `Клиент ${clientId} не найден`);
    return { clientId: client.id, email: client.email, phone: client.phone, fullName: client.full_name };
  }
}

class MockCatalogClient {
  // GetService: актуальная цена и активность до добавления позиции
  async getService(serviceId) {
    const service = catalogRepo.findServiceById(serviceId);
    if (!service) throw new RpcError('NOT_FOUND', `Услуга ${serviceId} не найдена`);
    return {
      serviceId: service.id,
      name: service.name,
      price: service.price,
      isActive: service.is_active,
    };
  }

  
  async reservePart(partId, quantity) {
    const part = catalogRepo.findPartById(partId);
    if (!part) throw new RpcError('NOT_FOUND', `Запчасть ${partId} не найдена`);
    if (!part.is_active) throw new RpcError('FAILED_PRECONDITION', 'Запчасть снята с продажи');
    if (part.stock_qty < quantity) {
      throw new RpcError('FAILED_PRECONDITION', `Недостаточно остатка: ${part.stock_qty} < ${quantity}`);
    }
    return {
      partId: part.id,
      sku: part.sku,
      name: part.name,
      unitPrice: part.price,
      stockAfter: part.stock_qty - quantity,
    };
  }
}

class MockRepairClient {
  // GetAmountDue: касса не придумывает сумму — Repair отдаёт total_amount и client_id,
  // Payment вычитает свои COMPLETED-платежи 
  async getAmountDue(workOrderId) {
    const order = repairRepo.findWorkOrderById(workOrderId);
    if (!order) throw new RpcError('NOT_FOUND', `Заказ-наряд ${workOrderId} не найден`);
    return {
      workOrderId: order.id,
      requestId: order.request_id,
      clientId: null, // client_id живёт в заявке; ниже подтягиваем через заявку
      totalAmount: order.total_amount,
      workOrderStatus: order.status,
    };
  }
}

class MockPaymentClient {
  // Чтение платежей наряда для агрегации на шлюзе 
  async listPaymentsByWorkOrder(workOrderId) {
    return paymentRepo.listPaymentsByWorkOrder(workOrderId);
  }
}

class MockNotificationClient {
  async listNotificationsByClient(clientId) {
    return notificationRepo.listNotificationsByClient(clientId);
  }
  async listNotificationsByRequest(requestId) {
    return notificationRepo.listNotificationsByRequest(requestId);
  }
}

class MockAnalyticsClient {
  async summary(from, to) {
    return analyticsRepo.summary(from, to);
  }
}

module.exports = {
  RpcError,
  MockIdentityClient,
  MockCustomerClient,
  MockCatalogClient,
  MockRepairClient,
  MockPaymentClient,
  MockNotificationClient,
  MockAnalyticsClient,
};
