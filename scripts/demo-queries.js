'use strict';

/**
 * Демонстрационный прогон GraphQL-запросов (без поднятия HTTP-сервера):
 * выполняет схему напрямую и печатает запрос, ответ и ошибки.
 * Используется для проверки ЛР3 и как приложение к отчёту.
 */
const { graphql } = require('graphql');
const { seed } = require('../src/seed/seed');
const { schema } = require('../src/gateway/server');

const TOKENS = {
  client: 'jwt-client-1',
  employee: 'jwt-employee-1',
  admin: 'jwt-admin-1',
};

async function runCase(title, token, query, variables) {
  console.log('\n' + '='.repeat(78));
  console.log('### ' + title);
  console.log('='.repeat(78));
  const context = { principal: token ? require('../src/gateway/context') && await resolvePrincipal(token) : null };
  const result = await graphql({ schema, source: query, contextValue: context, variableValues: variables });
  console.log(JSON.stringify(result, null, 2));
}

const { MockIdentityClient } = require('../src/clients');
const identityClient = new MockIdentityClient();
async function resolvePrincipal(token) {
  try { return await identityClient.validateToken(token); } catch { return null; }
}

const CASES = [
  {
    title: '1. me — профиль текущего пользователя (клиент)',
    token: TOKENS.client,
    query: `{ me { id login status role createdAt } }`,
  },
  {
    title: '2. myDevices — устройства клиента со связанной категорией',
    token: TOKENS.client,
    query: `{
      myDevices {
        id model serialNumber note
        category { id name isActive }
        client { id fullName phone email }
      }
    }`,
  },
  {
    title: '3. myRepairRequests — заявки клиента с нарядом и платежами',
    token: TOKENS.client,
    query: `{
      myRepairRequests {
        id deviceModel categoryName description priority status createdAt
        workOrder { id status totalAmount paymentReceived
          serviceItems { serviceName quantity unitPrice lineTotal }
          partItems { partSku partName quantity unitPrice lineTotal }
          payments { id amount method status createdAt }
        }
        notifications { title deliveryStatus createdAt }
      }
    }`,
  },
  {
    title: '4. repairRequest(id) — заявка по идентификатору со связанными данными',
    token: TOKENS.client,
    variables: { id: 'rq-1' },
    query: `query($id: ID!) {
      repairRequest(id: $id) {
        id status priority description
        workOrder { id status totalAmount serviceItems { serviceName lineTotal } }
      }
    }`,
  },
  {
    title: '5. repairRequest(несуществующая) — обработка отсутствия данных',
    token: TOKENS.client,
    variables: { id: 'rq-999' },
    query: `query($id: ID!) { repairRequest(id: $id) { id status } }`,
  },
  {
    title: '6. repairQueue — очередь сотрудника с фильтром по статусу и сортировкой',
    token: TOKENS.employee,
    variables: { filter: { status: 'IN_REPAIR' } },
    query: `query($filter: RepairQueueFilter) {
      repairQueue(filter: $filter, sort: PRIORITY) {
        id deviceModel categoryName priority status createdAt
        workOrder { totalAmount }
      }
    }`,
  },
  {
    title: '7. catalogServices + catalogParts — справочники каталога',
    token: TOKENS.employee,
    query: `{
      catalogServices { id name price isActive }
      catalogParts { id sku name price stockQty isActive }
    }`,
  },
  {
    title: '8. workOrder(id) — заказ-наряд с позициями',
    token: TOKENS.employee,
    variables: { id: 'wo-1' },
    query: `query($id: ID!) {
      workOrder(id: $id) {
        id status totalAmount paymentReceived
        serviceItems { serviceName quantity lineTotal }
        partItems { partSku partName lineTotal }
      }
    }`,
  },
  {
    title: '9. myNotifications — уведомления клиента',
    token: TOKENS.client,
    query: `{ myNotifications { id title body deliveryStatus createdAt } }`,
  },
  {
    title: '10. analyticsSummary — агрегаты администратора',
    token: TOKENS.admin,
    variables: { from: '2026-09-01', to: '2026-10-31' },
    query: `query($from: String!, $to: String!) {
      analyticsSummary(from: $from, to: $to) {
        requestsCreated requestsReady requestsClosed openRepairs
        revenue paymentsCount
        topServices { serviceName itemsCount amountSum }
        topCategories { categoryName requestsCount }
      }
    }`,
  },
  {
    title: '11. Контроль доступа: клиент не видит заявку другого клиента (rq-5 принадлежит c-2)',
    token: TOKENS.client,
    variables: { id: 'rq-5' },
    query: `query($id: ID!) { repairRequest(id: $id) { id status } }`,
  },
  {
    title: '12. Контроль доступа: клиент не может читать аналитику',
    token: TOKENS.client,
    variables: { from: '2026-09-01', to: '2026-10-31' },
    query: `query($from: String!, $to: String!) { analyticsSummary(from: $from, to: $to) { revenue } }`,
  },
  {
    title: '13. Без токена — запрос отклонён',
    token: null,
    query: `{ myDevices { id } }`,
  },
];

(async () => {
  seed();
  for (const c of CASES) await runCase(c.title, c.token, c.query, c.variables);
})().catch((err) => { console.error(err); process.exit(1); });
