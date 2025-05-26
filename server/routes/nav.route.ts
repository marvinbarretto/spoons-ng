import { Router } from 'express';
import axios from 'axios';
import { getRedisClient } from '../redis/redis.client';
import dotenv from 'dotenv';
import { ENDPOINT_CACHE_CONFIG } from '../config/endpoint.config';

dotenv.config();

const router = Router();
const cacheKey = 'primaryNavLinks:v1';

router.get('/api/getPrimaryNavLinks', async (req, res, next) => {
  const redis = await getRedisClient();

  if (!redis) return next();


  try {
    const force = req.query['force'] === 'true';
    const cachedData = await redis.get(cacheKey);

    if (!force && cachedData) {
      console.log('✅ [PrimaryNavLinks] Served from Redis cache');
      return res.json(JSON.parse(cachedData));
    }


    console.log('!!! [PrimaryNavLinks] Fetching from Strapi');

    const url = `${process.env['STRAPI_URL']}/api/pages?filters[primaryNavigation][$eq]=true&fields[0]=title&fields[1]=slug`;
    // const url = `${process.env['STRAPI_URL']}/api/pages?fields[0]=title&fields[1]=slug`;

    const headers = {
      Authorization: `Bearer ${process.env['STRAPI_TOKEN']}`,
    }

    const { data } = await axios.get(url, { headers });

    console.log('✅ [PrimaryNavLinks] Fetched from Strapi');
    console.log('[DEBUG] Raw Strapi data:', JSON.stringify(data, null, 2));
    console.log('[DEBUG] First page item:', JSON.stringify(data.data[0], null, 2));


    if (!data || !Array.isArray(data.data)) {
      console.error('❌ [PrimaryNavLinks] Invalid data from Strapi');
      return res.status(500).send('Invalid data from Strapi');
    }

    const formatted = data.data.map((page: any) => {
      const attrs = page.attributes ?? page; // fallback to flattened
      return {
        id: page.id,
        documentId: page.id.toString(),
        title: attrs.title,
        slug: attrs.slug,
      };
    });


    console.log('[DEBUG] Formatted data:', JSON.stringify(formatted, null, 2));

    const config = ENDPOINT_CACHE_CONFIG.primaryNavLinks;
    const payload = { navigation: formatted };

    if (formatted.length > 0) {
      await redis.setEx(cacheKey, config.ttlSeconds, JSON.stringify(payload)); // ✅ full object
      console.log('✅ [PrimaryNavLinks] Cached new data in Redis');
    } else {
      console.log('❌ [PrimaryNavLinks] No data to cache');
    }

    console.log('✅ [PrimaryNavLinks] Final payload:', JSON.stringify(payload, null, 2));
    return res.json(payload);

  } catch (error) {
    console.error('❌ [PrimaryNavLinks] Error fetching from Strapi:', error);
    return res.status(500).send('Error fetching from Strapi');
  }
});

export default router;
