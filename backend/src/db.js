'use strict';
const { Sequelize } = require('sequelize');
const dbConfig = require('./config/database');

const env = process.env.NODE_ENV || 'development';
const cfg = dbConfig[env] || dbConfig.development;

let sequelize;
if (cfg.dialect === 'sqlite') {
  sequelize = new Sequelize({ dialect: 'sqlite', storage: cfg.storage, logging: cfg.logging });
} else if (cfg.use_env_variable) {
  sequelize = new Sequelize(process.env[cfg.use_env_variable], cfg); // DATABASE_URL (Neon, etc.)
} else {
  sequelize = new Sequelize(cfg.database, cfg.username, cfg.password, cfg);
}

module.exports = sequelize;
