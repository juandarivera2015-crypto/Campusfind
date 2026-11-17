'use strict';
const { z } = require('zod');
const { badRequest } = require('../utils/problem');

/** Spanish messages for zod's built-in validations (schemas with their own message keep it). */
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case 'invalid_type':
      return { message: issue.received === 'undefined' ? 'Este campo es obligatorio' : 'Tipo de dato no válido' };
    case 'too_small':
      return { message: issue.type === 'string' ? `Debe tener al menos ${issue.minimum} caracteres` : `Debe ser mayor o igual a ${issue.minimum}` };
    case 'too_big':
      return { message: issue.type === 'string' ? `Debe tener como máximo ${issue.maximum} caracteres` : `Debe ser menor o igual a ${issue.maximum}` };
    case 'invalid_enum_value':
      return { message: `Valor no válido. Opciones: ${issue.options.join(', ')}` };
    case 'invalid_literal':
      return { message: `Debe ser "${issue.expected}"` };
    case 'invalid_string':
      return { message: issue.validation === 'email' ? 'El correo electrónico no es válido' : 'Formato no válido' };
    case 'unrecognized_keys':
      return { message: `Campos no permitidos: ${issue.keys.join(', ')}` };
    default:
      return { message: ctx.defaultError };
  }
});

/** Validates req[source] against a zod schema and replaces it with the parsed (whitelisted) value. */
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(badRequest('Revisa los datos enviados', { errors }));
  }
  // Express 5 makes req.query read-only, so store parsed values separately
  req.valid = req.valid || {};
  req.valid[source] = result.data;
  return next();
};

module.exports = { validate };
