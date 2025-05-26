import axios from 'axios';

type GeminiPrompt = string;

export type GeminiClient = {
  generatePrompt: (title: string, source?: string | null) => Promise<GeminiPrompt>;
  generateImageUrl: (prompt: GeminiPrompt) => Promise<string>;
};

/**
 * Returns a fake Gemini client for now, which:
 * - Fakes prompt generation (returns a clean, formatted prompt string)
 * - Returns a placeholder image based on the prompt string's hash
 *
 * Once you're ready to use Gemini for real, swap out the implementations below.
 */
export function getGeminiClient(): GeminiClient {
  return {
    async generatePrompt(title: string, source?: string | null): Promise<string> {
      return `A thumbnail illustration representing a news article titled "${title}"${source ? ` from ${source}` : ''}.`;
    },

    async generateImageUrl(prompt: string): Promise<string> {
      // 👇 This simulates an image based on prompt hash for visual variance
      const hash = Math.abs(hashCode(prompt)) % 1000;
      return `https://picsum.photos/seed/${hash}/600/400`;
    }
  };
}

/**
 * Creates a simple deterministic hash of a string (for seeding placeholder images)
 */
function hashCode(str: string): number {
  return str.split('').reduce((acc, char) => {
    return (acc << 5) - acc + char.charCodeAt(0);
  }, 0);
}
