'use strict';
/**
 * Alternative entry point (exports the Express app without calling listen()).
 * Vercel uses src/app.js; local/Docker start with `node src/server.js`.
 */
module.exports = require('./src/app');
