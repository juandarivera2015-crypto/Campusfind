'use strict';
const { badRequest } = require('../utils/problem');

/** Validates req[source] against a zod schema and replaces it with the parsed (whitelisted) value. */
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(badRequest('Validation failed', { errors }));
  }
  // Express 5 makes req.query read-only, so store parsed values separately
  req.valid = req.valid || {};
  req.valid[source] = result.data;
  return next();
};

module.exports = { validate };
