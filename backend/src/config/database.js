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

/**
 * DATABASE_URL (e.g. Neon serverless Postgres on Vercel) takes precedence over the DB_* variables:
 *   postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
 * TLS is enabled when the URL asks for it (sslmode=require/verify-*) or DB_SSL=true.
 */
function fromUrl() {
  const url = process.env.DATABASE_URL;
  const dialect = url.startsWith('mysql') ? 'mysql' : 'postgres';
  const wantsTls = /sslmode=(require|verify-ca|verify-full)/.test(url) || process.env.DB_SSL === 'true';
  return {
    use_env_variable: 'DATABASE_URL', // read by sequelize-cli
    dialect,
    logging: false,
    // Serverless functions: keep very few connections per instance (use Neon's *-pooler* host)
    pool: { max: parseInt(process.env.DB_POOL_MAX || '3', 10), min: 0, acquire: 30000, idle: 5000, evict: 5000 },
    dialectOptions: wantsTls ? { ssl: { require: true, rejectUnauthorized: true } } : {},
  };
}

const runtime = () => (process.env.DATABASE_URL ? fromUrl() : { ...base, dialectOptions: sslOptions() });

module.exports = {
  development: runtime(),
  production: runtime(),
  test: { dialect: 'sqlite', storage: process.env.DB_STORAGE || ':memory:', logging: false },
};
