import request from 'supertest';
import { Express } from 'express';
import { getRedisClient } from '../redis/redis.client';
import { createTestServer } from '../utils/create-test-server';

describe('GET /api/events', () => {
  let app: Express;

  const testKey = 'events:v1';
  const mockPayload = {
    cachedAt: Date.now(),
    data: {
      events: [
        {
          id: 1,
          title: 'Test Event',
          slug: 'test-event',
          date: '2025-06-01T12:00:00.000Z',
          content: [],
          eventStatus: 'Approved',
          location: 'Test Location',
        }
      ]
    }
  };

  beforeAll(async () => {
    const redis = await getRedisClient();
    if (!redis) throw new Error('Redis not available');
    await redis.set(testKey, JSON.stringify(mockPayload));

    app = await createTestServer();
  });

  afterAll(async () => {
    const redis = await getRedisClient();
    if (redis) await redis.del(testKey);
  });

  it('returns 200 and cached events array', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body.events.length).toBe(1);
    expect(res.body.events[0].title).toBe('Test Event');
  });

  it('returns 500 for malformed cache payload', async () => {
    const redis = await getRedisClient();
    await redis!.set(testKey, JSON.stringify({ cachedAt: Date.now(), data: {} }));

    const res = await request(app).get('/api/events');
    expect(res.status).toBe(500);
    expect(res.text).toContain('Cache is corrupted or empty');
  });
});
