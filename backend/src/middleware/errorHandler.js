'use strict';
const { HttpError } = require('../utils/problem');
const config = require('../config');

function notFoundHandler(req, res) {
  res.status(404).type('application/problem+json').json({
    type: 'about:blank', title: 'Not Found', status: 404, detail: `No existe la ruta ${req.method} ${req.path}`,
  });
}

function errorHandler(err, req, res, _next) {
  let status = 500;
  let body = { type: 'about:blank', title: 'Internal Server Error', status, detail: 'Ocurrió un error inesperado. Inténtalo de nuevo.' };

  if (err instanceof HttpError) {
    status = err.status;
    body = { type: 'about:blank', title: err.title, status, detail: err.detail, ...err.extra };
  } else if (err.name === 'MulterError') {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    body = { type: 'about:blank', title: status === 413 ? 'Payload Too Large' : 'Bad Request', status,
      detail: status === 413 ? 'El archivo supera el tamaño máximo permitido.' : 'El archivo enviado no es válido.' };
  } else if (err.name === 'SequelizeValidationError') {
    status = 400;
    body = { type: 'about:blank', title: 'Bad Request', status, detail: 'Revisa los datos enviados',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })) };
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    status = 409;
    body = { type: 'about:blank', title: 'Conflict', status, detail: 'El recurso ya existe' };
  } else if (err.type === 'entity.too.large') {
    status = 413;
    body = { type: 'about:blank', title: 'Payload Too Large', status, detail: 'La solicitud es demasiado grande' };
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    body = { type: 'about:blank', title: 'Bad Request', status, detail: 'El cuerpo JSON no es válido' };
  } else if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    // e.g. express.static 404 / 403 (path traversal), body-parser errors
    status = err.status;
    body = { type: 'about:blank', title: status === 404 ? 'Not Found' : 'Bad Request', status, detail: status === 404 ? 'No encontrado' : 'Solicitud rechazada' };
  }

  if (status >= 500) {
    // Log full details server-side only; never leak stack traces or SQL to clients
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
    if (!config.isProd && !config.isTest) body.debug = err.message;
  }
  res.status(status).type('application/problem+json').json({ ...body, instance: req.originalUrl });
}

module.exports = { errorHandler, notFoundHandler };
