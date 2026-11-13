'use strict';
const express = require('express');
const { z } = require('zod');
const { Message, LostObject, User } = require('../models');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { notFound, forbidden, badRequest } = require('../utils/problem');
const { business } = require('../middleware/metrics');

const router = express.Router();

const sendSchema = z.object({
  object_id: z.coerce.number().int().positive(),
  message: z.string().trim().min(1, 'Message is required').max(2000),
}).strict();

const toDTO = (m) => ({
  id: m.id,
  object_id: m.object_id,
  message: m.message,
  is_read: Boolean(m.is_read),
  created_at: m.created_at,
  sender_id: m.sender_id,
  sender_name: m.sender?.name,
  sender_email: m.sender?.email,
  object_name: m.object?.name,
  object_status: m.object?.status,
});

/** GET /api/v1/messages — inbox of the authenticated user (only their own messages) */
router.get('/', requireAuth('messages:read'), async (req, res, next) => {
  try {
    const rows = await Message.findAll({
      where: { receiver_id: req.user.id },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'email'] },
        { model: LostObject, as: 'object', attributes: ['id', 'name', 'status'] },
      ],
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      limit: 200,
    });
    res.json({ data: rows.map(toDTO), unread: rows.filter((r) => !r.is_read).length });
  } catch (err) { next(err); }
});

/** POST /api/v1/messages — contact the owner of an object */
router.post('/', requireAuth('messages:write'), validate(sendSchema), async (req, res, next) => {
  try {
    const { object_id: objectId, message } = req.valid.body;
    const obj = await LostObject.findByPk(objectId);
    if (!obj) throw notFound('Object not found.');
    if (obj.user_id === req.user.id) throw badRequest('You cannot message yourself.');
    const msg = await Message.create({ object_id: objectId, sender_id: req.user.id, receiver_id: obj.user_id, message });
    business.messagesSent.inc();
    res.status(201).location(`/api/v1/messages/${msg.id}`).json({ message: 'Message sent successfully!', data: { id: msg.id } });
  } catch (err) { next(err); }
});

/** POST /api/v1/messages/read — mark the whole inbox as read */
router.post('/read', requireAuth('messages:write'), async (req, res, next) => {
  try {
    const [updated] = await Message.update({ is_read: true }, { where: { receiver_id: req.user.id, is_read: false } });
    res.json({ updated });
  } catch (err) { next(err); }
});

/** PATCH /api/v1/messages/:id — mark one message read/unread (receiver only) */
router.patch('/:id(\\d+)', requireAuth('messages:write'),
  validate(z.object({ is_read: z.boolean() }).strict()), async (req, res, next) => {
    try {
      const msg = await Message.findByPk(req.params.id);
      if (!msg) throw notFound('Message not found');
      if (msg.receiver_id !== req.user.id) throw forbidden();
      await msg.update({ is_read: req.valid.body.is_read });
      res.json({ data: { id: msg.id, is_read: msg.is_read } });
    } catch (err) { next(err); }
  });

module.exports = router;
