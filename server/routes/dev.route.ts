import { Router } from "express";
import debug from "debug";
import { getRedisClient } from "../redis/redis.client";

const router = Router();
const log = debug('api:dev');

router.get('/api/dev/cache', async (req, res) => {
  const redis = await getRedisClient();

  if (!redis) {
    res.status(500).send('Redis not available');
    return;
  }

  const KEYS_TO_CHECK = [
    'events:v1',
    'news:v1',
    // Add specific slug keys you care about
    'event:this-is-a-new-event',
    // You could also scan `event:*` but it’s slower
  ];

  const status = await Promise.all(
    KEYS_TO_CHECK.map(async (key) => {
      const raw = await redis.get(key);
      if (!raw) {
        return { key, exists: false };
      }

      let cachedAt: number | null = null;
      try {
        const parsed = JSON.parse(raw);
        cachedAt = parsed?.cachedAt ?? null;
      } catch {
        // Ignore bad JSON
      }

      const ttl = await redis.ttl(key); // seconds

      return {
        key,
        exists: true,
        cachedAt,
        ageSeconds: cachedAt ? Math.round((Date.now() - cachedAt) / 1000) : null,
        expiresIn: ttl,
      };
    })
  );

  res.json({
    now: Date.now(),
    status,

  });

});

export default router;
