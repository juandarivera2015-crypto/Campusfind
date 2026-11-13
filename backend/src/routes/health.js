'use strict';
const express = require('express');
const { sequelize } = require('../models');

const router = express.Router();

/** Liveness: the process is up (Kubernetes livenessProbe). */
router.get('/live', (_req, res) => res.json({ status: 'ok' }));

/** Readiness: dependencies reachable (Kubernetes readinessProbe). */
router.get('/ready', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ready', db: 'up' });
  } catch (_err) {
    res.status(503).json({ status: 'unavailable', db: 'down' });
  }
});

module.exports = router;
