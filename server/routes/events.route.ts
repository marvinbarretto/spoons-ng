import { Router } from 'express';
import { getRedisClient } from '../redis/redis.client';
import axios from 'axios';
import dotenv from 'dotenv';
import debug from 'debug';

import { STRAPI_HEADERS, STRAPI_ENDPOINTS } from '../config/strapi.config';
import { ENDPOINT_CACHE_CONFIG } from '../config/endpoint.config';
import { EventModel, StrapiEvent } from '../../src/app/events/utils/event.model';
import type { CachedPayload } from '../utils/cache.types';
import type { AppRedisClient } from '../redis/redis.client';

dotenv.config();
const log = debug('api:events');

const router = Router();
const EVENTS_CACHE_KEY = 'events:v1';
const TTL_MS = Number(ENDPOINT_CACHE_CONFIG.events.ttlSeconds) * 1000;
const LOCK_KEY = 'lock:events:v1';

function normaliseEvent(strapiEvent: StrapiEvent): EventModel {
  return {
    id: strapiEvent.id,
    title: strapiEvent.title,
    slug: strapiEvent.slug,
    date: strapiEvent.date,
    content: strapiEvent.content ?? [],
    eventStatus: strapiEvent.eventStatus,
    location: strapiEvent.location ?? '',
  };
}

async function fetchAndCacheAllEvents(redis: AppRedisClient) {
  const lock = await redis.set(LOCK_KEY, 'locked', { NX: true, PX: 10_000 });
  if (!lock) {
    log('⏳ Skipping refresh — already in progress');
    return;
  }

  try {
    const existing = await redis.get(EVENTS_CACHE_KEY);
    if (existing) {
      log('♻️ Cache was set by another process, skipping fetch');
      return JSON.parse(existing)?.data;
    }

    const { data } = await axios.get(STRAPI_ENDPOINTS.allEvents, {
      headers: STRAPI_HEADERS,
    });

    const events = data.data.map(normaliseEvent);
    const payload: CachedPayload<{ events: EventModel[] }> = {
      cachedAt: Date.now(),
      data: { events },
    };

    // ✅ Set with TTL — makes cache eventually expire as fallback
    await redis.setEx(
      EVENTS_CACHE_KEY,
      ENDPOINT_CACHE_CONFIG.events.ttlSeconds, // e.g. 86400 = 1 day
      JSON.stringify(payload)
    );

    log('📝 Writing to Redis:', JSON.stringify(payload, null, 2));
    log('✅ [Events] Cache updated');
    return payload.data;
  } catch (err) {
    log('❌ [Events] Refresh failed', err);
    throw err;
  } finally {
    await redis.del(LOCK_KEY); // Always release lock
  }
}

router.get('/api/events', async (req, res, next) => {
  const redis = await getRedisClient();
  if (!redis) return next();

  const force = req.query['force'] === 'true';

  try {
    const cachedRaw = await redis.get(EVENTS_CACHE_KEY);
    log('📦 Redis payload:', cachedRaw);

    if (cachedRaw) {
      const parsed: CachedPayload<{ events: EventModel[] }> = JSON.parse(cachedRaw);
      const isExpired = Date.now() - parsed.cachedAt > TTL_MS;

      if (!parsed?.data?.events?.length) {
        log('⚠️ Cache exists but no events found');
        return res.status(500).send('Cache is corrupted or empty');
      }

      if (isExpired) {
        const ageSec = Math.round((Date.now() - parsed.cachedAt) / 1000);
        log(`⚠️ Cache expired ${ageSec}s ago`);
      }

      res.set('X-Cache-Status', isExpired ? 'STALE' : 'HIT');
      res.json({ ...parsed.data, cachedAt: parsed.cachedAt }); // 🔥 immediate response

      if (isExpired || force) {
        log('♻️ Stale or forced — triggering background revalidation');
        fetchAndCacheAllEvents(redis).catch((err) =>
          log('❌ Background refresh failed:', err)
        );
      }

      return;
    }

    // 🚨 If we’re here, it's a cold start with no cache
    log('⚠️ No cache — triggering background cold fetch');
    const started = Date.now();

    fetchAndCacheAllEvents(redis)
      .then(() => {
        const duration = Date.now() - started;
        log(`🕒 Cold fetch took ${duration}ms`);
      })
      .catch((err) => {
        log('❌ Cold start refresh failed:', err);
      });

    // ✅ Serve fallback while warming cache
    res.set('X-Cache-Status', 'MISS');
    return res.json({ events: [], cachedAt: null });
  } catch (err) {
    log('❌ Error handling /api/events', err);
    return res.status(500).send('Server error');
  }
});

router.get('/api/events/:slug', async (req, res, next) => {
  if (req.params.slug.includes('.')) return res.status(400).send('Invalid slug');

  const redis = await getRedisClient();
  if (!redis) return next();

  const slug = req.params.slug;
  const key = `event:${slug}`;
  const lockKey = `lock:event:${slug}`;
  const force = req.query['force'] === 'true';

  try {
    const cachedRaw = await redis.get(key);
    const cached: CachedPayload<{ event: EventModel }> | null = cachedRaw ? JSON.parse(cachedRaw) : null;
    const isExpired = cached && Date.now() - cached.cachedAt > TTL_MS;

    if (cached?.data?.event) {
      res.set('X-Cache-Status', isExpired ? 'STALE' : 'HIT');
      res.json({ ...cached.data, cachedAt: cached.cachedAt });

      if (isExpired || force) {
        const lock = await redis.set(lockKey, '1', { NX: true, PX: 10_000 });
        if (lock) {
          axios.get(STRAPI_ENDPOINTS.eventBySlug(slug), { headers: STRAPI_HEADERS })
            .then(({ data }) => {
              const raw = data?.data?.[0];
              if (!raw) throw new Error('Event not found');
              const payload = {
                cachedAt: Date.now(),
                data: { event: normaliseEvent(raw) },
              };
              return redis.setEx(key, ENDPOINT_CACHE_CONFIG.events.ttlSeconds, JSON.stringify(payload));
            })
            .then(() => log(`✅ Refreshed cache for slug=${slug}`))
            .catch(err => log(`❌ Refresh failed for slug=${slug}`, err))
            .finally(() => redis.del(lockKey));
        }
      }
      return;
    }

    // Cold: no cache or empty/bad payload
    res.set('X-Cache-Status', 'MISS');
    res.json({ event: null, cachedAt: null });

    const lock = await redis.set(lockKey, '1', { NX: true, PX: 10_000 });
    if (lock) {
      axios.get(STRAPI_ENDPOINTS.eventBySlug(slug), { headers: STRAPI_HEADERS })
        .then(({ data }) => {
          const raw = data?.data?.[0];
          if (!raw) throw new Error('Event not found');
          const payload = {
            cachedAt: Date.now(),
            data: { event: normaliseEvent(raw) },
          };
          return redis.setEx(key, ENDPOINT_CACHE_CONFIG.events.ttlSeconds, JSON.stringify(payload));
        })
        .then(() => log(`✅ Filled cold cache for slug=${slug}`))
        .catch(err => log(`❌ Cold fill failed for slug=${slug}`, err))
        .finally(() => redis.del(lockKey));
    }
  } catch (err) {
    log(`❌ Error in slug handler`, err);
    return res.status(500).send('Server error');
  }
});

export default router;

// TODO:
// Abstract this into something more generic and reusable
// JSON endpoint for current cache metadata
