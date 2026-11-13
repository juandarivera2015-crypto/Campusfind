'use strict';
/* Sequelize connection settings (also consumed by sequelize-cli). */
require('dotenv').config();
const { readSecret } = require('./secrets');

const base = {
  dialect: process.env.DB_DIALECT || 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'campusfind',
  username: process.env.DB_USER || 'root',
  password: readSecret('DB_PASSWORD', ''),
  logging: false,
  define: { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
};

/**
 * TLS to the database. DB_SSL_CA = path to a CA bundle; otherwise mysql2's bundled
 * "Amazon RDS" certificate profile is used (RDS enforces require_secure_transport=1).
 */
function sslOptions() {
  if (process.env.DB_SSL !== 'true') return {};
  if (process.env.DB_SSL_CA) {
    return { ssl: { ca: require('fs').readFileSync(process.env.DB_SSL_CA, 'utf8'), rejectUnauthorized: true } };
  }
  return { ssl: 'Amazon RDS' };
}

module.exports = {
  development: { ...base, dialectOptions: sslOptions() },
  production: { ...base, dialectOptions: sslOptions() },
  test: { dialect: 'sqlite', storage: process.env.DB_STORAGE || ':memory:', logging: false },
};
