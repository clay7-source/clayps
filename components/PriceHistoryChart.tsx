import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getPriceHistory } from '../services/history';
import { formatCurrency } from '../services/currency';
import { REGIONS } from '../types';

interface PriceHistoryChartProps {
  gameTitle: string;
  initialRegionCode: string;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ gameTitle, initialRegionCode }) => {
  const [selectedRegion, setSelectedRegion] = useState(initialRegionCode);

  const historyData = useMemo(() => {
    return getPriceHistory(gameTitle, selectedRegion);
  }, [gameTitle, selectedRegion]);

  const regionInfo = REGIONS.find(r => r.code === selectedRegion);
  const currency = regionInfo?.defaultCurrency || 'USD';

  if (!historyData || historyData.length < 2) {
    return (
        <div className="bg-brand-card/50 rounded-2xl p-6 border border-gray-800 text-center mt-6">
            <h3 className="text-white font-bold mb-2">Price History</h3>
            <p className="text-gray-400 text-sm">
                Tracking started. Check back later to see price trends for {gameTitle}.
            </p>
        </div>
    );
  }

  // Calculate domain for Y axis to make chart look good (add some padding)
  const prices = historyData.map(d => d.amount);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1 || 5; // Default padding if flat line

  return (
    <div className="bg-brand-card rounded-2xl p-4 border border-gray-800 mt-6 shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
           📈 Price History
        </h3>
        
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar pb-1">
            {REGIONS.map(r => (
                <button
                    key={r.code}
                    onClick={() => setSelectedRegion(r.code)}
                    className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center ${
                        selectedRegion === r.code 
                        ? 'bg-brand-highlight text-black' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                    <img src={r.flagUrl} alt={r.code} className="w-4 h-3 mr-1.5 rounded-[2px] object-cover" />
                    {r.code}
                </button>
            ))}
        </div>
      </div>

      <div className="h-[200px] w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
                dataKey="date" 
                stroke="#94a3b8" 
                tick={{fill: '#94a3b8'}}
                tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
                minTickGap={30}
            />
            <YAxis 
                stroke="#94a3b8" 
                tick={{fill: '#94a3b8'}}
                domain={[Math.max(0, minPrice - padding), maxPrice + padding]}
                tickFormatter={(val) => formatCurrency(val, currency).replace(/[A-Z,a-z]/g, '').trim()}
                width={40}
            />
            <Tooltip 
                contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#38bdf8', 
                    color: '#fff',
                    borderRadius: '8px'
                }}
                itemStyle={{ color: '#38bdf8' }}
                formatter={(value: number) => [formatCurrency(value, currency), 'Price']}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#38bdf8" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#38bdf8', strokeWidth: 0 }} 
                activeDot={{ r: 6, fill: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-gray-500 text-center mt-2">
         History is stored locally on this device.
      </p>
    </div>
  );
};