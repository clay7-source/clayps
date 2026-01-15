
export interface PriceInfo {
  region: string;
  regionCode: 'US' | 'SG' | 'TR' | 'ID';
  currency: string;
  amount: number;
  originalAmount?: number;
}

export interface GameData {
  title: string;
  description: string;
  coverImageUrl?: string;
  prices: PriceInfo[];
}

export interface ExchangeRates {
  [key: string]: number; // Currency code to rate (relative to base)
}

export type SupportedCurrency = 'USD' | 'SGD' | 'TRY' | 'IDR' | 'EUR' | 'GBP' | 'JPY' | 'MYR' | 'PHP';

export const REGIONS: { code: string; name: string; flagUrl: string; defaultCurrency: string }[] = [
  { code: 'US', name: 'United States', flagUrl: 'https://flagcdn.com/w40/us.png', defaultCurrency: 'USD' },
  { code: 'SG', name: 'Singapore', flagUrl: 'https://flagcdn.com/w40/sg.png', defaultCurrency: 'SGD' },
  { code: 'TR', name: 'Turkey', flagUrl: 'https://flagcdn.com/w40/tr.png', defaultCurrency: 'TRY' },
  { code: 'ID', name: 'Indonesia', flagUrl: 'https://flagcdn.com/w40/id.png', defaultCurrency: 'IDR' },
];

export const CURRENCIES: SupportedCurrency[] = ['USD', 'EUR', 'GBP', 'SGD', 'IDR', 'TRY', 'MYR', 'JPY', 'PHP'];