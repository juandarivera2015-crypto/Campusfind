const request = require('supertest');
const { createApp, sequelize, resetDb, register, login } = require('./helpers');

const app = createApp();
let alice; let bob; let objectId;

beforeEach(async () => {
  await resetDb();
  await register(app);
  await register(app, { name: 'Bob', email: 'bob@uni.edu' });
  alice = (await login(app)).accessToken;
  bob = (await login(app, { email: 'bob@uni.edu' })).accessToken;
  const res = await request(app).post('/api/v1/objects').set('Authorization', `Bearer ${alice}`)
    .field('name', 'Wallet').field('description', 'Brown leather').field('location', 'Gym')
    .field('date', '2026-11-02').field('status', 'lost');
  objectId = res.body.data.id;
});
afterAll(() => sequelize.close());

test('Bob contacts Alice, Alice reads her inbox, Bob cannot see it', async () => {
  const send = await request(app).post('/api/v1/messages').set('Authorization', `Bearer ${bob}`)
    .send({ object_id: objectId, message: 'I think I found it!' });
  expect(send.status).toBe(201);

  const inbox = await request(app).get('/api/v1/messages').set('Authorization', `Bearer ${alice}`);
  expect(inbox.body.data).toHaveLength(1);
  expect(inbox.body.unread).toBe(1);
  expect(inbox.body.data[0]).toMatchObject({ sender_name: 'Bob', object_name: 'Wallet', object_status: 'lost' });

  const bobInbox = await request(app).get('/api/v1/messages').set('Authorization', `Bearer ${bob}`);
  expect(bobInbox.body.data).toHaveLength(0);

  const msgId = inbox.body.data[0].id;
  const bobMarks = await request(app).patch(`/api/v1/messages/${msgId}`).set('Authorization', `Bearer ${bob}`).send({ is_read: true });
  expect(bobMarks.status).toBe(403);

  const readAll = await request(app).post('/api/v1/messages/read').set('Authorization', `Bearer ${alice}`);
  expect(readAll.body.updated).toBe(1);
});

test('cannot message yourself or a missing object', async () => {
  const self = await request(app).post('/api/v1/messages').set('Authorization', `Bearer ${alice}`)
    .send({ object_id: objectId, message: 'hi' });
  expect(self.status).toBe(400);
  const missing = await request(app).post('/api/v1/messages').set('Authorization', `Bearer ${bob}`)
    .send({ object_id: 99999, message: 'hi' });
  expect(missing.status).toBe(404);
});
