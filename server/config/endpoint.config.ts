export const ENDPOINT_CACHE_CONFIG = {
  newsFeed: {
    ttlSeconds: Number(process.env['NEWS_CACHE_TTL_DAYS'] || 1) * 86400,
    // ttlSeconds: Number(process.env['NEWS_CACHE_TTL_DAYS']) * 86400,
    redisKey: 'newsData',
    cacheEmpty: true,
  },
  events: {
    ttlSeconds: 60 * 60 * 24, // 86400
    // TODO: Get from .env ?
    // ttlSeconds: Number(process.env['EVENTS_CACHE_TTL_DAYS']) * 86400,
    redisKey: 'events:v1',
    cacheEmpty: true,
  },
};

console.log(`[DEBUG] Using TTL for events: ${ENDPOINT_CACHE_CONFIG.events.ttlSeconds}`);
console.log(`[DEBUG] Using TTL for news: ${ENDPOINT_CACHE_CONFIG.newsFeed.ttlSeconds}`);

Object.entries(ENDPOINT_CACHE_CONFIG).forEach(([key, config]) => {
  const valid = Number.isInteger(config.ttlSeconds) && config.ttlSeconds > 0;
  if (!valid) {
    console.warn(`⚠️ Invalid TTL for ${key}:`, config.ttlSeconds);
  }
});

