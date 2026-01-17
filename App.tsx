import React, { useState, useEffect } from 'react';
import { GameData, SupportedCurrency, ExchangeRates, CURRENCIES, REGIONS } from './types';
import { searchGamePrices } from './services/gemini';
import { fetchExchangeRates } from './services/currency';
import { savePriceHistory } from './services/history';
import { Spinner } from './components/Spinner';
import { GameCard } from './components/GameCard';
import { PriceTable } from './components/PriceTable';
import { PriceHistoryChart } from './components/PriceHistoryChart';

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['US', 'SG', 'TR', 'ID']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  
  // Initialize from localStorage or default to USD
  const [targetCurrency, setTargetCurrency] = useState<SupportedCurrency>(() => {
    const saved = localStorage.getItem('targetCurrency');
    return (saved && CURRENCIES.includes(saved as SupportedCurrency)) ? (saved as SupportedCurrency) : 'USD';
  });

  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const loadRates = async () => {
      const rates = await fetchExchangeRates();
      setExchangeRates(rates);
    };
    loadRates();

    const handleScroll = () => {
        setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Save currency to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('targetCurrency', targetCurrency);
  }, [targetCurrency]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    if (selectedRegions.length === 0) {
        setError("Please select at least one region to search.");
        return;
    }

    setLoading(true);
    setError(null);
    setGameData(null);

    // Dismiss mobile keyboard
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    try {
      const data = await searchGamePrices(searchTerm, selectedRegions);
      setGameData(data);
      // Save valid results to history
      if (data && data.prices.length > 0) {
        savePriceHistory(data.title, data.prices);
      }
    } catch (err: any) {
      console.error(err);
      let msg = "Something went wrong. Please try again.";
      
      const errorMessage = err.message || err.toString();

      // Handle specific error types
      if (errorMessage.includes('429') || errorMessage.includes('Quota') || errorMessage.includes('Resource Exhausted')) {
          msg = "⚠️ API Quota Exceeded. Note: Quotas are per Google Cloud Project, not per Key. Please try again in a minute.";
      } else if (errorMessage.includes('API Key is missing')) {
          msg = "⚠️ API Key is missing. Please check your Netlify Site Settings > Environment Variables.";
      } else if (errorMessage.includes('503')) {
          msg = "⚠️ AI Service Overloaded. We are retrying, but it's very busy right now.";
      } else if (errorMessage.includes('fetch')) {
          msg = "⚠️ Network Error. Please check your internet connection.";
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleRegion = (code: string) => {
      setSelectedRegions(prev => 
        prev.includes(code) 
            ? prev.filter(c => c !== code) 
            : [...prev, code]
      );
  };

  // Determine the best region code to initially show in the chart (cheapest)
  const bestRegionCode = gameData?.prices.reduce((prev, current) => {
    return (prev.amount < current.amount) ? prev : current;
  }, gameData.prices[0])?.regionCode || 'US';

  return (
    <div className="min-h-screen bg-brand-dark pb-safe font-sans text-gray-100 selection:bg-ps-light selection:text-white">
      {/* Sticky Header */}
      <div className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-brand-dark/95 backdrop-blur-md shadow-lg border-b border-gray-800' : 'bg-transparent pt-safe-top'}`}>
        <div className="max-w-md mx-auto px-4 pb-2 pt-2">
          <div className="flex justify-between items-center mb-3">
             <h1 className="text-xl font-black tracking-tighter text-white">
                <span className="text-ps-light">Clay's</span> PS Hunter
             </h1>
             <select 
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value as SupportedCurrency)}
                className="bg-brand-card text-xs font-bold text-white py-1 px-3 rounded-full border border-gray-600 focus:outline-none focus:border-ps-light"
             >
                {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                ))}
             </select>
          </div>

          <form onSubmit={handleSearch} className="relative group mb-3">
            {/* Input text-base prevents iOS zoom on focus */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search game title..."
              className="w-full bg-brand-card text-white text-base placeholder-gray-500 rounded-2xl py-3 pl-4 pr-12 border border-gray-700 focus:border-ps-light focus:ring-1 focus:ring-ps-light focus:outline-none transition-all shadow-sm appearance-none"
            />
            <button
              type="submit"
              disabled={loading || !searchTerm || selectedRegions.length === 0}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-ps-light text-white p-2 rounded-xl hover:bg-ps-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
          </form>

          {/* Region Selectors */}
          <div className={`flex gap-2 overflow-x-auto no-scrollbar pb-2 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
             {REGIONS.map(region => {
                const isSelected = selectedRegions.includes(region.code);
                return (
                    <button
                        key={region.code}
                        type="button"
                        onClick={() => toggleRegion(region.code)}
                        className={`
                            flex items-center flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95
                            ${isSelected 
                                ? 'bg-ps-dark border-ps-light text-white shadow-[0_0_10px_rgba(0,112,209,0.2)]' 
                                : 'bg-brand-card border-gray-700 text-gray-400 hover:border-gray-500'
                            }
                        `}
                    >
                        <img 
                          src={region.flagUrl} 
                          alt={region.name} 
                          className="w-4 h-3 mr-1.5 rounded-[2px] object-cover" 
                        />
                        {region.name}
                    </button>
                )
             })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 pt-2">
        
        {/* Intro State */}
        {!gameData && !loading && !error && (
            <div className="text-center mt-8 space-y-4 opacity-60">
                <div className="text-6xl mb-4 animate-bounce">🎮</div>
                <p className="text-sm font-light px-6">
                    Check PlayStation Store prices globally.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {['Black Myth: Wukong', 'Elden Ring', 'FC 25', 'Spider-Man 2'].map(game => (
                        <button 
                            key={game}
                            onClick={() => { setSearchTerm(game); }}
                            className="bg-brand-card border border-gray-700 px-3 py-1 rounded-full text-xs hover:border-ps-light transition-colors active:scale-95"
                        >
                            {game}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Loading State */}
        {loading && <Spinner />}

        {/* Error State */}
        {error && (
          <div className="mt-8 p-4 bg-red-900/20 border border-red-800 text-red-200 rounded-xl text-center text-sm">
            <p>{error}</p>
          </div>
        )}

        {/* Results */}
        {gameData && (
          <div className="animate-[fadeIn_0.5s_ease-out] flex flex-col gap-4">
            {/* Game Cover & Info */}
            <GameCard data={gameData} />
            
            {/* Prices */}
            <div className="bg-brand-card/50 rounded-2xl p-4 border border-gray-800">
                <PriceTable 
                prices={gameData.prices} 
                targetCurrency={targetCurrency} 
                exchangeRates={exchangeRates} 
                />
            </div>

            {/* Price History Chart */}
            <PriceHistoryChart 
                gameTitle={gameData.title} 
                initialRegionCode={bestRegionCode}
            />

            <div className="text-center pb-8">
                <p className="text-[10px] text-gray-500">
                    * Prices via AI search. Rates are estimates. 
                </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
