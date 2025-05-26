import { createClient, RedisClientType } from 'redis';

export type AppRedisClient = RedisClientType;

let client: AppRedisClient | null = null;

export async function getRedisClient(): Promise<AppRedisClient | null> {
  if (client?.isOpen) return client;

  const redisUrl = process.env['REDIS_URL'] ||
    `redis://${process.env['REDIS_HOST'] || '127.0.0.1'}:${process.env['REDIS_PORT'] || 6379}`;

  try {
    client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 1000,
        reconnectStrategy: false,
      },
    });

    client.on('ready', () => console.log('🟢 Redis is ready'));
    client.on('error', (err) => console.error('🔴 Redis error:', err));
    client.on('end', () => console.log('🔌 Redis disconnected'));

    await client.connect();
    console.log('✅ Redis connected');
  } catch (err) {
    console.warn('⚠️ Redis unavailable — continuing without it');
    client = null;
  }

  return client;
}
