'use strict';

/**
 * GraphQL API Gateway — единая внешняя точка 
 * HTTP-сервер (без фреймворков) принимает POST /graphql с телом
 * { query, variables }
 */
const http = require('http');
const fs = require('fs');
const { buildSchema, graphql, getIntrospectionQuery } = require('graphql');
const config = require('../../config/app.config');
const { resolvers } = require('./resolvers');
const { buildContext } = require('./context');


function attachResolvers(schema, resolvers) {
  for (const [typeName, fields] of Object.entries(resolvers)) {
    const type = schema.getType(typeName);
    if (!type || typeof type.getFields !== 'function') continue;
    const typeFields = type.getFields();
    for (const [fieldName, resolver] of Object.entries(fields)) {
      if (typeFields[fieldName]) typeFields[fieldName].resolve = resolver;
    }
  }
  return schema;
}

function makeExecutableSchema(schemaPath, resolvers) {
  const sdl = fs.readFileSync(schemaPath, 'utf8');
  return attachResolvers(buildSchema(sdl), resolvers);
}

const schema = makeExecutableSchema(config.gateway.schemaPath, resolvers);

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(payload);
}

async function handleGraphql(req, res, body) {
  const { query, variables } = body || {};
  if (!query) return send(res, 400, { errors: [{ message: 'Поле query обязательно' }] });
  const context = await buildContext({ authorization: req.headers.authorization });
  const result = await graphql({
    schema,
    source: query,
    contextValue: context,
    variableValues: variables,
  });
  send(res, 200, result);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return send(res, 200, { status: 'ok', service: 'graphql-gateway' });
    }
    if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) {
      return send(res, 200, {
        service: 'appliance-repair GraphQL API (ЛР3)',
        endpoint: 'POST /graphql',
        demoTokens: ['jwt-client-1', 'jwt-employee-1', 'jwt-admin-1'],
      });
    }
    if (req.method === 'POST' && req.url === '/graphql') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      return await handleGraphql(req, res, JSON.parse(raw || '{}'));
    }
    send(res, 404, { errors: [{ message: 'Не найдено' }] });
  } catch (err) {
    send(res, 500, { errors: [{ message: 'Внутренняя ошибка шлюза', detail: String(err.message) }] });
  }
});

if (require.main === module) {
  server.listen(config.gateway.port, config.gateway.host, () => {
    console.log(`GraphQL API Gateway: http://${config.gateway.host}:${config.gateway.port}/graphql`);
    console.log(`Демо-токены: jwt-client-1 (клиент), jwt-employee-1 (сотрудник), jwt-admin-1 (админ)`);
  });
}

module.exports = { server, schema };
