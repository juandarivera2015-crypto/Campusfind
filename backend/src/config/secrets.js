'use strict';
/**
 * Secret management helper.
 * Reads a value from VAR, or from the file pointed to by VAR_FILE
 * (Docker secrets, Kubernetes Secret volumes, AWS Secrets Manager CSI driver...).
 * File-based secrets take precedence and are never logged.
 */
const fs = require('fs');

function readSecret(name, fallback = undefined) {
  const filePath = process.env[`${name}_FILE`];
  if (filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8').trim();
    } catch (err) {
      throw new Error(`Unable to read secret file for ${name}: ${err.code || err.message}`);
    }
  }
  const value = process.env[name];
  return value !== undefined ? value : fallback;
}

module.exports = { readSecret };
