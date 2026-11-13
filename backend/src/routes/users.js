'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { User } = require('../models');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { conflict, notFound } = require('../utils/problem');
const { business } = require('../middleware/metrics');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email format').max(150),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  confirm_password: z.string().optional(),
}).strict() // unknown properties are rejected -> no mass assignment (API3:2023)
  .refine((d) => d.confirm_password === undefined || d.confirm_password === d.password, {
    message: 'Passwords do not match', path: ['confirm_password'],
  });

/** POST /api/v1/users — register a new account */
router.post('/', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.valid.body;
    if (await User.findOne({ where: { email } })) throw conflict('This email is already registered.');
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
    business.usersRegistered.inc();
    res.status(201).location(`/api/v1/users/${user.id}`).json({
      message: 'Account created successfully! You can now log in.', data: user.toPublic(),
    });
  } catch (err) { next(err); }
});

/** GET /api/v1/users/me — current user profile */
router.get('/me', requireAuth('profile'), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw notFound('User not found');
    res.json({ data: user.toPublic() });
  } catch (err) { next(err); }
});

module.exports = router;
