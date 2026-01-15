import { PriceInfo } from '../types';

const STORAGE_KEY = 'ps_price_history_v1';

export interface HistoryPoint {
  date: string;
  amount: number;
}

// Save current search results to history
export const savePriceHistory = (gameTitle: string, prices: PriceInfo[]) => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    const db = rawData ? JSON.parse(rawData) : {};
    
    // Normalize title to key (lowercase, trimmed) to avoid duplicates
    const key = gameTitle.toLowerCase().trim();
    
    if (!db[key]) db[key] = {};
    
    const today = new Date().toISOString().split('T')[0];

    prices.forEach(price => {
        if (!db[key][price.regionCode]) {
            db[key][price.regionCode] = [];
        }
        
        const history = db[key][price.regionCode];
        const lastEntry = history[history.length - 1];

        // If an entry for today exists, update it (latest price wins), otherwise push new
        if (lastEntry && lastEntry.date === today) {
            lastEntry.amount = price.amount;
        } else {
            history.push({ date: today, amount: price.amount });
        }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error("Failed to save history", e);
  }
};

// Retrieve history for a specific game and region
export const getPriceHistory = (gameTitle: string, regionCode: string): HistoryPoint[] => {
    try {
        const rawData = localStorage.getItem(STORAGE_KEY);
        if (!rawData) return [];
        const db = JSON.parse(rawData);
        const key = gameTitle.toLowerCase().trim();
        return db[key]?.[regionCode] || [];
    } catch {
        return [];
    }
}