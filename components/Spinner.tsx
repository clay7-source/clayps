import React from 'react';

export const Spinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-8 space-y-4">
    <div className="relative w-16 h-16">
      <div className="absolute top-0 left-0 w-full h-full border-4 border-brand-highlight border-opacity-30 rounded-full"></div>
      <div className="absolute top-0 left-0 w-full h-full border-4 border-brand-highlight rounded-full animate-spin border-t-transparent"></div>
    </div>
    <p className="text-brand-highlight text-sm font-medium animate-pulse">Scouring the PlayStation Network...</p>
  </div>
);