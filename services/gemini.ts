import { GoogleGenAI, Type } from "@google/genai";
import { GameData, REGIONS } from "../types";

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to fetch metadata from RAWG
// This function is designed to NEVER throw an error, ensuring it doesn't break the main app flow
const fetchRawgMetadata = async (query: string): Promise<Partial<GameData>> => {
  // Access keys directly via process.env which is replaced by Vite at build time
  const rawgKey = process.env.RAWG_API_KEY;

  if (!rawgKey) {
    console.log("RAWG_API_KEY not found, skipping rich metadata fetch.");
    return {};
  }
  
  try {
    const response = await fetch(
      `https://api.rawg.io/api/games?key=${rawgKey}&search=${encodeURIComponent(query)}&page_size=1`
    );
    
    if (!response.ok) {
        // If RAWG is down or rate limited, just return empty, don't throw
        return {};
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const game = data.results[0];
      return {
        title: game.name,
        coverImageUrl: game.background_image
      };
    }
  } catch (error) {
    // Silently catch RAWG errors so we don't block the Gemini price check
    console.warn("RAWG Metadata Fetch skipped:", error);
  }
  return {};
};

// Helper to fetch prices and description from Gemini
const fetchGeminiPrices = async (query: string, selectedRegionCodes: string[]): Promise<GameData> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("Google API Key is missing. Please set API_KEY in Netlify.");

    const ai = new GoogleGenAI({ apiKey });
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
        // Check for 429 (Quota) or 503 (Service Unavailable)
        const isRateLimit = e.message?.includes('429') || e.status === 429 || e.toString().includes('429');
        const isServerBusy = e.message?.includes('503') || e.status === 503;
        
        if ((isRateLimit || isServerBusy) && i < maxRetries - 1) {
           // Exponential backoff: 2s, 4s, 8s
           const waitTime = 2000 * Math.pow(2, i); 
           console.log(`Gemini API busy (Attempt ${i+1}/${maxRetries}), retrying in ${waitTime}ms...`);
           await delay(waitTime);
           continue;
        }
        break; 
      }
    }
    
    throw lastError;
};

// Main function combining both sources
export const searchGamePrices = async (gameName: string, selectedRegionCodes: string[]): Promise<GameData> => {
  if (selectedRegionCodes.length === 0) {
    throw new Error("Please select at least one region.");
  }

  // Run searches in parallel
  // We use Promise.all because we want to start both immediately.
  // fetchRawgMetadata catches its own errors, so it will not cause Promise.all to reject.
  const [rawgData, geminiData] = await Promise.all([
    fetchRawgMetadata(gameName),
    fetchGeminiPrices(gameName, selectedRegionCodes)
  ]);

  // Merge Data: RAWG title/image takes precedence if available and valid
  const finalData: GameData = {
    ...geminiData,
    ...rawgData, 
    // Always use the description from Gemini as it's generated for the context of this app
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
