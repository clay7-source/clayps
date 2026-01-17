import { GoogleGenAI, Type } from "@google/genai";
import { GameData, REGIONS } from "../types";

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to fetch metadata from RAWG
const fetchRawgMetadata = async (query: string): Promise<Partial<GameData>> => {
  const rawgKey = process.env.RAWG_API_KEY ? process.env.RAWG_API_KEY.trim() : '';

  if (!rawgKey) return {};
  
  try {
    const response = await fetch(
      `https://api.rawg.io/api/games?key=${rawgKey}&search=${encodeURIComponent(query)}&page_size=1`
    );
    
    if (!response.ok) return {};

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const game = data.results[0];
      return {
        title: game.name,
        coverImageUrl: game.background_image
      };
    }
  } catch (error) {
    console.warn("RAWG Metadata Fetch skipped:", error);
  }
  return {};
};

// Helper to fetch prices and description from Gemini
const fetchGeminiPrices = async (query: string, selectedRegionCodes: string[]): Promise<GameData> => {
    const rawKey = process.env.API_KEY;
    const apiKey = rawKey ? rawKey.trim() : '';

    if (!apiKey) throw new Error("Google API Key is missing. Please check your Netlify Environment Variables.");

    const ai = new GoogleGenAI({ apiKey });
    // Using gemini-3-flash-preview as per standard instructions
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

    try {
      // Direct call without loop. If we hit quota, we fail fast. 
      // Retrying automatically on quota errors usually just extends the ban duration.
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
      if (!text) throw new Error("AI returned empty response.");
      
      return JSON.parse(text) as GameData;

    } catch (e: any) {
      // Log simple error
      console.error("Gemini Request Failed:", e.message);
      throw e; 
    }
};

// Main function combining both sources
export const searchGamePrices = async (gameName: string, selectedRegionCodes: string[]): Promise<GameData> => {
  if (selectedRegionCodes.length === 0) {
    throw new Error("Please select at least one region.");
  }

  // Run searches in parallel
  const [rawgData, geminiData] = await Promise.all([
    fetchRawgMetadata(gameName),
    fetchGeminiPrices(gameName, selectedRegionCodes)
  ]);

  // Merge Data
  const finalData: GameData = {
    ...geminiData,
    ...rawgData, 
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
