import React from 'react';
import { GameData, PriceInfo, SupportedCurrency, ExchangeRates, REGIONS } from '../types';
import { convertPrice, formatCurrency } from '../services/currency';

interface PriceTableProps {
  prices: PriceInfo[];
  targetCurrency: SupportedCurrency;
  exchangeRates: ExchangeRates | null;
}

export const PriceTable: React.FC<PriceTableProps> = ({ prices, targetCurrency, exchangeRates }) => {
  if (!exchangeRates) return null;

  // Process and sort prices
  const processedPrices = prices.map(price => {
    const convertedAmount = convertPrice(price.amount, price.currency, targetCurrency, exchangeRates);
    // Use originalAmount if available, otherwise fallback to amount
    const originalAmt = price.originalAmount && price.originalAmount > 0 ? price.originalAmount : price.amount;
    const convertedOriginalAmount = convertPrice(originalAmt, price.currency, targetCurrency, exchangeRates);
    
    const regionInfo = REGIONS.find(r => r.code === price.regionCode);
    const isOnSale = originalAmt > price.amount;
    const discountPercent = isOnSale ? Math.round(((originalAmt - price.amount) / originalAmt) * 100) : 0;

    return {
      ...price,
      originalAmount: originalAmt,
      convertedAmount,
      convertedOriginalAmount,
      isOnSale,
      discountPercent,
      regionName: regionInfo ? regionInfo.name : price.region,
      flagUrl: regionInfo ? regionInfo.flagUrl : ''
    };
  }).sort((a, b) => a.convertedAmount - b.convertedAmount);

  const bestPrice = processedPrices[0]?.convertedAmount;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white mb-2 px-1">Region Comparison</h3>
      {processedPrices.map((item) => {
        const isBestPrice = item.convertedAmount === bestPrice;
        
        return (
          <div 
            key={item.regionCode} 
            className={`
              relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300
              ${isBestPrice 
                ? 'bg-ps-dark/40 border-ps-light shadow-[0_0_15px_rgba(0,112,209,0.3)]' 
                : 'bg-brand-card border-gray-700'
              }
            `}
          >
            {isBestPrice && (
              <div className="absolute -top-3 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full shadow-sm z-10">
                BEST DEAL
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <div>
                <p className="font-medium text-white text-sm sm:text-base flex items-center gap-2">
                    {item.flagUrl ? (
                        <img src={item.flagUrl} alt={item.regionName} className="w-6 h-4 rounded shadow-sm object-cover" />
                    ) : (
                        <span className="text-xl">🌍</span>
                    )}
                    <span>{item.regionName}</span>
                    {item.isOnSale && (
                        <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">
                            -{item.discountPercent}%
                        </span>
                    )}
                </p>
                <div className="text-xs text-gray-400 pl-8">
                  {item.isOnSale ? (
                      <>
                        <span className="line-through decoration-red-500/50 mr-1">{formatCurrency(item.originalAmount, item.currency)}</span>
                        <span className="text-gray-300">{formatCurrency(item.amount, item.currency)}</span>
                      </>
                  ) : (
                      <span>{formatCurrency(item.amount, item.currency)}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
                {item.isOnSale && (
                    <p className="text-xs text-gray-500 line-through mb-0.5">
                        {formatCurrency(item.convertedOriginalAmount, targetCurrency)}
                    </p>
                )}
              <p className={`font-bold text-lg leading-none ${isBestPrice ? 'text-green-400' : 'text-gray-200'}`}>
                {formatCurrency(item.convertedAmount, targetCurrency)}
              </p>
            </div>
          </div>
        );
      })}
      
      {processedPrices.length === 0 && (
         <div className="text-center p-6 bg-brand-card rounded-xl border border-gray-700 text-gray-400">
            No prices found for the requested regions.
         </div>
      )}
    </div>
  );
};