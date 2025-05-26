import type { NewsSnippet } from "../../src/app/news/utils/news/news.model";
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env['GEMINI_KEY'] });

import type { NewsSnippet } from "../../src/app/news/utils/news/news.model";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env['GEMINI_KEY'] });

const fallbackImg = (index: number) =>
  `https://picsum.photos/seed/${index}/600/400`;

// Optional: add HEAD request validator in the future
// async function isValidImage(url: string): Promise<boolean> {
//   try {
//     const res = await fetch(url, { method: 'HEAD' });
//     return res.ok && res.headers.get('content-type')?.startsWith('image/');
//   } catch {
//     return false;
//   }
// }

export async function enhanceNewsWithImages(newsItems: NewsSnippet[]): Promise<NewsSnippet[]> {
  return Promise.all(newsItems.map(async (item, index) => {
    const prompt = `
Find a relevant image URL for the following news headline.
The article was published by "${item.source}" at: ${item.link}.
Return only the direct image URL. No explanation, no markdown, no extra text.

Headline: "${item.title}"
    `.trim();

    try {
      const response = await ai.models.generateContent({
        model: "gemini-pro",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const reply = response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const imgMatch = reply.match(/https?:\/\/[^\s]+?\.(jpg|jpeg|png|webp)/i);
      const img = imgMatch?.[0] || fallbackImg(index);

      if (!imgMatch) {
        console.warn(`[⚠️ Gemini reply unclear for "${item.title}"] →`, reply);
      }

      console.log(`[🖼️ Gemini] "${item.title}" → ${imgMatch ? '✅' : '❌ fallback'} ${img}`);
      return { ...item, img };

    } catch (error) {
      console.error(`[❌ Gemini Error] "${item.title}":`, error);
      return { ...item, img: fallbackImg(index) };
    }
  }));
}

