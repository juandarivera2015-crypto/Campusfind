'use strict';
const express = require('express');
const { z } = require('zod');
const { Op } = require('sequelize');
const { LostObject, User } = require('../models');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { upload, persistImage, removeImage } = require('../middleware/upload');
const { escapeLike } = require('../utils/sql');
const { notFound, forbidden, badRequest } = require('../utils/problem');
const { business } = require('../middleware/metrics');

const router = express.Router();
const { CATEGORIES, STATUSES } = LostObject;
const emptyToUndef = (v) => (v === '' || v === null ? undefined : v);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'Invalid date');

const listSchema = z.object({
  keyword: z.preprocess(emptyToUndef, z.string().trim().max(100).optional()),
  category: z.preprocess(emptyToUndef, z.enum(CATEGORIES).optional()),
  status: z.preprocess(emptyToUndef, z.enum(STATUSES).optional()),
  location: z.preprocess(emptyToUndef, z.string().trim().max(100).optional()),
  date: z.preprocess(emptyToUndef, isoDate.optional()),
  mine: z.preprocess(emptyToUndef, z.enum(['true', 'false']).optional()),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});

const createSchema = z.object({
  name: z.string().trim().min(1, 'Object name is required').max(150),
  description: z.string().trim().min(1, 'Description is required').max(5000),
  location: z.string().trim().min(1, 'Location is required').max(200),
  category: z.preprocess(emptyToUndef, z.enum(CATEGORIES).default('Other')),
  date: isoDate,
  status: z.enum(STATUSES).default('lost'),
  contact_email: z.preprocess(emptyToUndef, z.string().trim().email('Invalid contact email').max(150).optional()),
}).strict();

const updateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(5000),
  location: z.string().trim().min(1).max(200),
  category: z.enum(CATEGORIES),
  date: isoDate,
  status: z.enum(STATUSES),
  contact_email: z.string().trim().email().max(150),
}).partial().strict();

/** Output DTO — explicit field list, never leaks the owner's account e-mail or password hash. */
const toDTO = (o) => ({
  id: o.id,
  name: o.name,
  description: o.description,
  image: o.image,
  location: o.location,
  category: o.category,
  date: o.date,
  status: o.status,
  contact_email: o.contact_email,
  created_at: o.created_at,
  user_id: o.user_id,
  user_name: o.owner ? o.owner.name : undefined,
});

const ownerInclude = { model: User, as: 'owner', attributes: ['id', 'name'] };

/** GET /api/v1/objects — search with filters + pagination */
router.get('/', validate(listSchema, 'query'), async (req, res, next) => {
  try {
    const q = req.valid.query;
    const where = {};
    if (q.keyword) {
      const kw = `%${escapeLike(q.keyword)}%`;
      where[Op.or] = [{ name: { [Op.like]: kw } }, { description: { [Op.like]: kw } }, { location: { [Op.like]: kw } }];
    }
    if (q.category) where.category = q.category;
    if (q.status) where.status = q.status;
    if (q.location) where.location = { [Op.like]: `%${escapeLike(q.location)}%` };
    if (q.date) where.date = q.date;

    const { rows, count } = await LostObject.findAndCountAll({
      where, include: [ownerInclude], order: [['created_at', 'DESC'], ['id', 'DESC']],
      limit: q.limit, offset: q.offset,
    });
    res.json({ data: rows.map(toDTO), total: count, limit: q.limit, offset: q.offset });
  } catch (err) { next(err); }
});

/** GET /api/v1/objects/:id */
router.get('/:id(\\d+)', async (req, res, next) => {
  try {
    const obj = await LostObject.findByPk(req.params.id, { include: [ownerInclude] });
    if (!obj) throw notFound('Object not found');
    res.json({ data: toDTO(obj) });
  } catch (err) { next(err); }
});

/** POST /api/v1/objects — report a lost/found object (multipart/form-data) */
router.post('/', requireAuth('objects:write'), upload.single('image'), validate(createSchema), async (req, res, next) => {
  let image = null;
  try {
    image = await persistImage(req.file);
    const data = req.valid.body;
    const obj = await LostObject.create({
      ...data,
      contact_email: data.contact_email || req.user.email,
      image,
      user_id: req.user.id, // owner always comes from the token, never from the body
    });
    business.objectsCreated.inc({ status: obj.status, category: obj.category });
    const fresh = await LostObject.findByPk(obj.id, { include: [ownerInclude] });
    res.status(201).location(`/api/v1/objects/${obj.id}`).json({
      message: `${obj.status === 'lost' ? 'Lost' : 'Found'} object reported successfully!`,
      data: toDTO(fresh),
    });
  } catch (err) {
    await removeImage(image);
    next(err);
  }
});

/** Loads an object and enforces object-level authorization (OWASP API1:2023 BOLA). */
async function loadOwned(req) {
  const obj = await LostObject.findByPk(req.params.id);
  if (!obj) throw notFound('Object not found');
  if (obj.user_id !== req.user.id) throw forbidden('You can only modify your own reports');
  return obj;
}

/** PATCH /api/v1/objects/:id — owner only */
router.patch('/:id(\\d+)', requireAuth('objects:write'), upload.single('image'), validate(updateSchema), async (req, res, next) => {
  try {
    const obj = await loadOwned(req);
    const changes = req.valid.body;
    if (!Object.keys(changes).length && !req.file) throw badRequest('No changes supplied');
    if (req.file) {
      const newImage = await persistImage(req.file);
      await removeImage(obj.image);
      changes.image = newImage;
    }
    await obj.update(changes);
    const fresh = await LostObject.findByPk(obj.id, { include: [ownerInclude] });
    res.json({ data: toDTO(fresh) });
  } catch (err) { next(err); }
});

/** DELETE /api/v1/objects/:id — owner only */
router.delete('/:id(\\d+)', requireAuth('objects:write'), async (req, res, next) => {
  try {
    const obj = await loadOwned(req);
    await obj.destroy();
    await removeImage(obj.image);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
