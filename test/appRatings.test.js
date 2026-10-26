const assert = require('node:assert/strict');
const http = require('node:http');
const { after, before, test } = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');

const authPath = require.resolve('../src/middleware/auth');
const userModelPath = require.resolve('../src/models/User');
const adminModelPath = require.resolve('../src/models/Admin');
const ratingModelPath = require.resolve('../src/models/AppRating');
const originalModules = new Map(
  [authPath, userModelPath, adminModelPath, ratingModelPath].map((path) => [path, require.cache[path]]),
);
const ratings = new Map();
let nextId = 1;
let tokenCount = 0;

function applyRequireMock(path, exports) {
  require.cache[path] = { id: path, filename: path, loaded: true, exports };
}

function matches(document, filter) {
  return Object.entries(filter).every(([key, value]) => document[key] === value);
}

class RatingQuery {
  constructor(filter) {
    this.filter = filter;
    this.offset = 0;
    this.maximum = Infinity;
    this.selectedFields = null;
  }

  select(fields) {
    this.selectedFields = fields.split(/\s+/);
    return this;
  }
  populate(path) {
    if (!this.selectedFields.includes(path)) this.selectedFields.push(path);
    return this;
  }
  sort() { return this; }
  skip(value) { this.offset = value; return this; }
  limit(value) { this.maximum = value; return this; }

  then(resolve, reject) {
    const result = [...ratings.values()]
      .filter((rating) => matches(rating, this.filter))
      .slice(this.offset, this.offset + this.maximum)
      .map((rating) => Object.fromEntries(
        ['_id', ...this.selectedFields].map((field) => [field, rating[field]]),
      ))
      .map((rating) => ({
        ...rating,
        user: {
          _id: rating.user,
          username: 'Test User',
          mobile: '1234567890',
          location: 'Gujarat',
          verified: true,
        },
      }));
    return Promise.resolve(result).then(resolve, reject);
  }
}

const fakeAppRating = {
  async findOneAndUpdate(filter, update, options) {
    let document = [...ratings.values()].find((rating) => matches(rating, filter));
    if (!document && !options.upsert) return null;

    const now = new Date();
    if (!document) {
      document = {
        _id: String(nextId++),
        user: filter.user,
        createdAt: now,
      };
    }
    Object.assign(document, update.$set, { updatedAt: now });
    for (const field of Object.keys(update.$unset || {})) delete document[field];
    ratings.set(document.user, document);
    return { ...document };
  },
  find(filter) {
    return new RatingQuery(filter);
  },
  async countDocuments(filter) {
    return [...ratings.values()].filter((rating) => matches(rating, filter)).length;
  },
};

let server;
let baseUrl;

before(async () => {
  process.env.JWT_SECRET = 'test-user-secret';
  process.env.ADMIN_JWT_SECRET = 'test-admin-secret';
  applyRequireMock(userModelPath, { findById: async (id) => ({ _id: id, status: 'active' }) });
  applyRequireMock(adminModelPath, { findById: async (id) => ({ _id: id }) });
  applyRequireMock(ratingModelPath, fakeAppRating);

  delete require.cache[authPath];
  const auth = require('../src/middleware/auth');
  applyRequireMock(authPath, auth);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', require('../src/routes/appRatingRoutes'));
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  for (const [path, original] of originalModules) {
    if (original) require.cache[path] = original;
    else delete require.cache[path];
  }
});

function userToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET);
}

async function postRating(body, token = userToken(`test-user-${tokenCount++}`)) {
  return fetch(`${baseUrl}/api/v1/app-ratings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('submits valid rating using the authenticated user', async () => {
  const response = await postRating({
    rating: 5,
    review: 'Very useful',
    language: 'gu',
    platform: 'android',
    appVersion: '1.0.0',
    userId: 'untrusted-user',
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.rating, 5);
  assert.ok(body.data.id);
  assert.ok(body.data.createdAt);
  assert.equal(ratings.get('test-user-0').user, 'test-user-0');
});

test('rejects ratings outside integer range 1 through 5', async () => {
  for (const rating of [0, 6, 2.5]) {
    const response = await postRating({ rating, language: 'en', platform: 'ios' });
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.ok(body.errors.length);
  }
});

test('rejects an array JSON request body', async () => {
  const response = await fetch(`${baseUrl}/api/v1/app-ratings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken('null-body-user')}`, 'Content-Type': 'application/json' },
    body: '[]',
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.ok(body.errors.includes('request body must be a JSON object'));
});

test('rejects unsupported language and platform values', async () => {
  for (const body of [
    { rating: 4, language: 'de', platform: 'android' },
    { rating: 4, language: 'en', platform: 'web' },
  ]) {
    const response = await postRating(body);
    const result = await response.json();
    assert.equal(response.status, 400);
    assert.ok(result.errors.length);
  }
});

test('rejects reviews longer than 2000 characters', async () => {
  const response = await postRating({
    rating: 4,
    review: 'x'.repeat(2001),
    language: 'en',
    platform: 'ios',
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.ok(body.errors.some((message) => message.includes('2000')));
});

test('accepts a review of exactly 2000 characters and optional metadata', async () => {
  const response = await postRating({ rating: 4, review: 'x'.repeat(2000) });

  assert.equal(response.status, 200);
});

test('requires a valid user token', async () => {
  const response = await postRating({ rating: 5, language: 'en', platform: 'android' }, 'invalid-token');
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
  assert.deepEqual(body.errors, []);
});

test('rate limits repeated submissions from the same user', async () => {
  const token = userToken('limited-user');
  let response;
  for (let index = 0; index < 6; index += 1) {
    response = await postRating({ rating: 5 }, token);
  }
  const body = await response.json();

  assert.equal(response.status, 429);
  assert.equal(body.success, false);
  assert.ok(response.headers.get('retry-after'));
});

test('upserts a user latest rating instead of creating a duplicate', async () => {
  const token = userToken('upsert-user');
  const first = await postRating({ rating: 3, language: 'hi', platform: 'android' }, token);
  const firstBody = await first.json();
  const second = await postRating({
    rating: 4,
    review: 'Updated',
    language: 'pa',
    platform: 'ios',
    appVersion: '2.0.0',
  }, token);
  const secondBody = await second.json();

  assert.equal(secondBody.data.id, firstBody.data.id);
  assert.equal(ratings.get('upsert-user').rating, 4);
  assert.equal(ratings.get('upsert-user').review, 'Updated');
  assert.equal([...ratings.values()].filter((rating) => rating.user === 'upsert-user').length, 1);
});

test('admin can retrieve paginated reviews with the submitting user details', async () => {
  const token = jwt.sign({ id: 'test-admin' }, process.env.ADMIN_JWT_SECRET);
  const response = await fetch(`${baseUrl}/api/v1/admin/app-ratings?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.data));
  assert.equal(body.pagination.total, ratings.size);
  assert.deepEqual(body.data[0].user, {
    _id: 'test-user-0',
    username: 'Test User',
    mobile: '1234567890',
    location: 'Gujarat',
    verified: true,
  });
  assert.equal(Object.hasOwn(body.data[0].user, 'password'), false);
});
