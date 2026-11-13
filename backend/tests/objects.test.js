const request = require('supertest');
const { createApp, sequelize, resetDb, register, login } = require('./helpers');

const app = createApp();
// Smallest valid PNG (1x1)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

let alice; let bob;
beforeEach(async () => {
  await resetDb();
  await register(app);
  await register(app, { name: 'Bob', email: 'bob@uni.edu' });
  alice = (await login(app)).accessToken;
  bob = (await login(app, { email: 'bob@uni.edu' })).accessToken;
});
afterAll(() => sequelize.close());

const create = (token, fields = {}, file) => {
  const req = request(app).post('/api/v1/objects').set('Authorization', `Bearer ${token}`);
  const data = { name: 'Blue backpack', description: 'Navy, with stickers', location: 'Library', category: 'Bags & Backpacks',
    date: '2026-11-01', status: 'lost', ...fields };
  Object.entries(data).forEach(([k, v]) => req.field(k, v));
  if (file) req.attach('image', file.buf, file.name);
  return req;
};

describe('Objects API', () => {
  test('create requires authentication', async () => {
    const res = await request(app).post('/api/v1/objects').field('name', 'x');
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(/problem\+json/);
  });

  test('create, list with filters, get', async () => {
    const c = await create(alice, {}, { buf: PNG, name: 'photo.png' });
    expect(c.status).toBe(201);
    expect(c.headers.location).toMatch(/\/api\/v1\/objects\/\d+/);
    expect(c.body.data.image).toMatch(/^uploads\/obj_[0-9a-f-]+\.png$/);
    expect(c.body.data.contact_email).toBe('alice@uni.edu');
    await create(alice, { name: 'Keys', status: 'found', category: 'Keys' });

    const all = await request(app).get('/api/v1/objects');
    expect(all.body.total).toBe(2);
    const found = await request(app).get('/api/v1/objects?status=found');
    expect(found.body.total).toBe(1);
    const kw = await request(app).get('/api/v1/objects?keyword=stickers');
    expect(kw.body.data[0].name).toBe('Blue backpack');
    expect(kw.body.data[0]).not.toHaveProperty('owner');

    const one = await request(app).get(`/api/v1/objects/${c.body.data.id}`);
    expect(one.body.data.user_name).toBe('Alice');
  });

  test('validates input and rejects unknown fields (mass assignment)', async () => {
    const res = await create(alice, { user_id: '999' });
    expect(res.status).toBe(400);
    const bad = await create(alice, { status: 'stolen' });
    expect(bad.status).toBe(400);
    expect(bad.body.errors[0].field).toBe('status');
  });

  test('rejects files that are not real images even with an image extension', async () => {
    const res = await create(alice, {}, { buf: Buffer.from('<script>alert(1)</script>'), name: 'evil.png' });
    expect(res.status).toBe(400);
  });

  test('pagination is bounded', async () => {
    const res = await request(app).get('/api/v1/objects?limit=100000');
    expect(res.status).toBe(400);
  });

  test('only the owner can update or delete (BOLA protection)', async () => {
    const { body } = await create(alice);
    const id = body.data.id;
    const patchByBob = await request(app).patch(`/api/v1/objects/${id}`).set('Authorization', `Bearer ${bob}`).send({ name: 'mine now' });
    expect(patchByBob.status).toBe(403);
    const delByBob = await request(app).delete(`/api/v1/objects/${id}`).set('Authorization', `Bearer ${bob}`);
    expect(delByBob.status).toBe(403);

    const patch = await request(app).patch(`/api/v1/objects/${id}`).set('Authorization', `Bearer ${alice}`).send({ status: 'found' });
    expect(patch.status).toBe(200);
    expect(patch.body.data.status).toBe('found');
    const del = await request(app).delete(`/api/v1/objects/${id}`).set('Authorization', `Bearer ${alice}`);
    expect(del.status).toBe(204);
    expect((await request(app).get(`/api/v1/objects/${id}`)).status).toBe(404);
  });
});
