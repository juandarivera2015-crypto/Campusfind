'use strict';
/**
 * Entry point for Vercel (zero-configuration Express): exports the app instead of calling listen().
 * Local/Docker still start with `node src/server.js`.
 */
const { createApp } = require('./src/app');

module.exports = createApp();
