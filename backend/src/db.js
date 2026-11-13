'use strict';
const { Sequelize } = require('sequelize');
const dbConfig = require('./config/database');

const env = process.env.NODE_ENV || 'development';
const cfg = dbConfig[env] || dbConfig.development;

const sequelize = cfg.dialect === 'sqlite'
  ? new Sequelize({ dialect: 'sqlite', storage: cfg.storage, logging: cfg.logging })
  : new Sequelize(cfg.database, cfg.username, cfg.password, cfg);

module.exports = sequelize;
