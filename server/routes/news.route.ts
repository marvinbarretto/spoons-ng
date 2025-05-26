import { Router } from 'express';
import axios from 'axios';
import { getRedisClient } from '../redis/redis.client';
import { checkCache } from '../middleware/check-cache.middleware';
import { XMLParser } from 'fast-xml-parser';

const router = Router();
const NEWS_CACHE_TTL = Number(process.env['NEWS_CACHE_TTL_DAYS'] || 1) * 86400;
const rssUrl = `https://news.google.com/rss/search?q=prostate+cancer&hl=en-GB&gl=GB&ceid=GB:en`;

router.get('/api/news', checkCache, async (req, res, next) => {
  const redis = await getRedisClient();
  if (!redis) return next();

  const cachedData = await redis.get('newsData');

  if (cachedData) {
    console.log('✅ Served from Redis cache');
    return res.json(JSON.parse(cachedData));
  }

  try {
    const xmlResponse = await axios.get(rssUrl);
    const parser = new XMLParser({ ignoreAttributes: false });
    const json = parser.parse(xmlResponse.data);
    const items = json.rss?.channel?.item ?? [];

    const parsed = items.map((item: any) => {
      const rawTitle = item.title ?? '';
      const seperator = ' - ';
      const lastIndex = rawTitle.lastIndexOf(seperator);

      let title = rawTitle;
      let source = null;

      if (lastIndex > -1) {
        title = rawTitle.substring(0, lastIndex).trim();
        source = rawTitle.substring(lastIndex + seperator.length).trim();
      }

      return {
        title,
        source,
        link: item.link ?? '',
        pubDate: item.pubDate ?? ''
      };
    });

    await redis.setEx(
      'newsData', NEWS_CACHE_TTL, JSON.stringify(parsed)
    );
    console.log('✅ Cached new data in Redis', { type: typeof parsed, length: parsed?.length , sample: parsed[0] });
    return res.json(parsed);
  } catch (error) {
    console.error('❌ Error fetching news:', error);
    return res.status(500).send('Error fetching news');
  }
});

export default router;
