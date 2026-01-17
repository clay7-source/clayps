import { GoogleGenAI, Type } from "@google/genai";
import { GameData, REGIONS } from "../types";

const RAWG_API_KEY = process.env.RAWG_API_KEY || '';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to fetch metadata from RAWG
const fetchRawgMetadata = async (query: string): Promise<Partial<GameData>> => {
  if (!RAWG_API_KEY) return {};
  
  try {
    const response = await fetch(
      `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=1`
    );
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const game = data.results[0];
      return {
        title: game.name,
        coverImageUrl: game.background_image
      };
    }
  } catch (error) {
    console.warn("RAWG API Error:", error);
  }
  return {};
};

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to fetch prices and description from Gemini
const fetchGeminiPrices = async (query: string, selectedRegionCodes: string[]): Promise<GameData> => {
    if (!process.env.API_KEY) throw new Error("API Key is missing");

    const model = "gemini-3-flash-preview";
    const activeRegions = REGIONS.filter(r => selectedRegionCodes.includes(r.code));
    
    const regionPromptList = activeRegions.map((r, i) => 
      `${i + 1}. ${r.name} (Store currency: ${r.defaultCurrency})`
    ).join('\n    ');

    const prompt = `
      You are a PlayStation Store price checking assistant.

      TARGET GAME: "${query}"
      
      TASK:
      1. Identify the exact PlayStation game title.
      2. Generate a short, exciting description for this game (max 25 words).
      3. Find the CURRENT digital price for this game in the following PlayStation Store regions:
      ${regionPromptList}

      For each region:
      - Find the "Sale Price" (amount).
      - Find the "Original Price" (originalAmount). 
      - If not on sale, "amount" and "originalAmount" are equal.
      - If not found in a region, set amount to 0.

      OUTPUT:
      Return a strictly formatted JSON object.
    `;

    // Retry logic for 429 (Rate Limit) errors
    let lastError: any;
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Official game title" },
                description: { type: Type.STRING, description: "Short description" },
                // Fallback cover if RAWG fails
                coverImageUrl: { type: Type.STRING, description: "URL of the game cover art" },
                prices: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      region: { type: Type.STRING, description: "Region name" },
                      regionCode: { type: Type.STRING, enum: ["US", "SG", "TR", "ID"] },
                      currency: { type: Type.STRING, description: "Currency code" },
                      amount: { type: Type.NUMBER, description: "Current price" },
                      originalAmount: { type: Type.NUMBER, description: "Original price" },
                    },
                    required: ["region", "regionCode", "currency", "amount"],
                  },
                },
              },
              required: ["title", "description", "prices"],
            },
          },
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        
        return JSON.parse(text) as GameData;

      } catch (e: any) {
        lastError = e;
        // Check for 429 (Quota) or 503 (Service Unavailable) or 500
        const isRateLimit = e.message?.includes('429') || e.status === 429 || e.toString().includes('429');
        const isServerBusy = e.message?.includes('503') || e.status === 503;
        
        if ((isRateLimit || isServerBusy) && i < maxRetries - 1) {
           const waitTime = 2000 * Math.pow(2, i); // 2s, 4s
           console.log(`Gemini API busy (429/503), retrying in ${waitTime}ms...`);
           await delay(waitTime);
           continue;
        }
        break; // Stop retrying if other error or max retries reached
      }
    }
    
    throw lastError;
};

// Main function combining both sources
export const searchGamePrices = async (gameName: string, selectedRegionCodes: string[]): Promise<GameData> => {
  if (selectedRegionCodes.length === 0) {
    throw new Error("Please select at least one region.");
  }

  // Run searches in parallel for "2 searches" behavior and speed
  const [rawgData, geminiData] = await Promise.all([
    fetchRawgMetadata(gameName),
    fetchGeminiPrices(gameName, selectedRegionCodes)
  ]);

  // Merge Data: RAWG title/image takes precedence if available
  const finalData: GameData = {
    ...geminiData,
    ...rawgData, // Overrides title and coverImageUrl
    // Ensure we keep gemini description as it is optimized for short display
    description: geminiData.description 
  };
  
  // Clean prices
  finalData.prices = finalData.prices.filter(p => p.amount > 0);
  finalData.prices.forEach(p => {
      if (!p.originalAmount || p.originalAmount < p.amount) {
          p.originalAmount = p.amount;
      }
  });
  
  return finalData;
};
