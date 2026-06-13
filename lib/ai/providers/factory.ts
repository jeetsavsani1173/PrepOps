import { LLMProvider } from "./base";
import { GeminiProvider } from "./gemini";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export class LLMProviderFactory {
  static getProvider(): LLMProvider {
    const provider = process.env.AI_PROVIDER || "gemini";

    if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured in environment variables.");
      }
      const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
      return new GeminiProvider(apiKey, model);
    }

    throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
