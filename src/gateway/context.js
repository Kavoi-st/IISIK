'use strict';

/**
 * Контекст запроса: шлюз проверяет токен через mock ValidateToken (Identity)
 * и кладёт principal (userId, role, clientId, employeeId) в контекст GraphQL
 */
const { MockIdentityClient } = require('../clients');
const identityClient = new MockIdentityClient();

async function buildContext({ authorization }) {
  const token = (authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return { principal: null };
  try {
    const principal = await identityClient.validateToken(token);
    return { principal, token };
  } catch {
    return { principal: null };
  }
}

module.exports = { buildContext };
