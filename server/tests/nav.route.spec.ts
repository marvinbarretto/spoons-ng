import request from 'supertest';
import { createTestServer } from '../utils/create-test-server';
import { Express } from 'express';
import { getRedisClient } from '../redis/redis.client';

describe('GET /api/getPrimaryNavLinks', () => {
  let app: Express;

  beforeAll(async () => {
    const redis = await getRedisClient();
    if (!redis) return;
    await redis.del('primaryNavLinks:v1'); // 👈 clear previous bad data

    await redis.set(
      'primaryNavLinks:v1',
      JSON.stringify({
        navigation: [
          { id: 1, documentId: '1', title: 'Test Page', slug: 'test-page' }
        ]
      })
    );

    app = await createTestServer();
  });

  it('returns 200 and a navigation array', async () => {
    const res = await request(app).get('/api/getPrimaryNavLinks');
    // ✅ Add console logs for debugging
    console.log('DEBUG response:', JSON.stringify(res.body, null, 2));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.navigation)).toBe(true);
    expect(res.body.navigation.length).toBeGreaterThan(0);
  });
});
