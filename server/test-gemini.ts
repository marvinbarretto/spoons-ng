import { GoogleGenAI } from "@google/genai";
// import dotenv from 'dotenv';
import * as dotenv from 'dotenv';


dotenv.config();

async function testGemini() {
  const apiKey = process.env['GEMINI_KEY'];

  if (!apiKey) {
    throw new Error('GEMINI_KEY not found in environment variables');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Find a relevant image URL for the following news headline:
    "NASA Discovers New Exoplanet That Could Support Life"

    Return only the direct image URL. No explanation
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-pro',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const reply = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    const imgMatch = reply.match(/https?:\/\/[^\s]+?\.(jpg|jpeg|png|webp)/i);

    console.log('\n🔍 Gemini raw reply:\n', reply);
    console.log('\n🖼️ Parsed image URL:', imgMatch?.[0] ?? '❌ No match found');

  } catch (error) {
    console.error('❌ Gemini API error:', error);
  }
}

testGemini();
