import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../redis/redis.client';

export async function checkCache(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const redis = await getRedisClient();
    if (!redis) return next();
    const data = await redis.get('newsData');
    if (data) {
      console.log('✅ Served from Redis cache');
      res.send(JSON.parse(data));
    } else {
      next();
    }
  } catch (err) {
    console.error('Redis middleware error:', err);
    res.status(500).send('Redis error');
  }
}
