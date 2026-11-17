'use strict';
/**
 * Errors are returned as RFC 9457 "Problem Details" (application/problem+json).
 */
class HttpError extends Error {
  constructor(status, title, detail, extra = {}) {
    super(detail || title);
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.extra = extra;
  }
}

const badRequest = (detail, extra) => new HttpError(400, 'Bad Request', detail, extra);
const unauthorized = (detail = 'Debes iniciar sesión') => new HttpError(401, 'Unauthorized', detail);
const forbidden = (detail = 'No tienes permiso para realizar esta acción') => new HttpError(403, 'Forbidden', detail);
const notFound = (detail = 'Recurso no encontrado') => new HttpError(404, 'Not Found', detail);
const conflict = (detail) => new HttpError(409, 'Conflict', detail);

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict };
