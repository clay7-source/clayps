import { ExchangeRates, SupportedCurrency } from '../types';

const BASE_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

// Fallback rates in case API fails
const FALLBACK_RATES: ExchangeRates = {
  USD: 1,
  SGD: 1.34,
  TRY: 32.5,
  IDR: 15600,
  EUR: 0.92,
  GBP: 0.79,
  MYR: 4.75,
  JPY: 150.0,
  PHP: 56.0
};

export const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch rates');
    }
    const data = await response.json();
    return data.rates;
  } catch (error) {
    console.error('Currency fetch error, using fallback:', error);
    return FALLBACK_RATES;
  }
};

export const convertPrice = (
  amount: number,
  fromCurrency: string,
  toCurrency: SupportedCurrency,
  rates: ExchangeRates
): number => {
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  
  // Convert to USD (Base) then to Target
  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
};

export const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};