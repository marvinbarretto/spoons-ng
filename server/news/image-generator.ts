import type { NewsSnippet } from "../../src/app/news/utils/news/news.model";
import { getGeminiClient } from "../gemini-client";
import { getRedisClient } from "../redis/redis.client";


export async function enhanceNewsWithImages(news: NewsSnippet[]): Promise<NewsSnippet[]> {
  const redis = await getRedisClient();
  // Handle if no redis?

  const gemini = getGeminiClient(); // you'll write this helper

  const enhanced = await Promise.all(
    news.map(async (item, index) => {
      const cacheKey = `news:${item.link}`;
      const cached = await redis?.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const shouldGenerate = index < 3; // or Math.random() < 0.2
      let img = '';

      if (shouldGenerate) {
        try {
          const prompt = await gemini.generatePrompt(item.title, item.source);
          img = await gemini.generateImageUrl(prompt);
        } catch (err) {
          console.warn(`⚠️ Failed to generate image for ${item.title}`, err);
        }
      }

      const result = { ...item, img };
      await redis?.setEx(cacheKey, 86400, JSON.stringify(result)); // 1 day TTL
      return result;
    })
  );

  return enhanced;
}
