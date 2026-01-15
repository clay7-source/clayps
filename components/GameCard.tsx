import React from 'react';
import { GameData } from '../types';

interface GameCardProps {
  data: GameData;
}

export const GameCard: React.FC<GameCardProps> = ({ data }) => {
  const [imgError, setImgError] = React.useState(false);

  // Fallback image if AI provided URL fails or is missing
  const displayImage = !imgError && data.coverImageUrl 
    ? data.coverImageUrl 
    : `https://picsum.photos/seed/${encodeURIComponent(data.title)}/300/400`;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl shadow-xl bg-brand-card border border-gray-700 mb-6 group">
      {/* Blurred Background Layer */}
      <div className="absolute inset-0 z-0">
        <img 
          src={displayImage} 
          alt="" 
          className="w-full h-full object-cover opacity-20 blur-xl scale-125 group-hover:scale-110 transition-transform duration-700"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/80 to-transparent"></div>
      </div>
      
      {/* Content Layer */}
      <div className="relative z-10">
          {/* Main Hero Image (RAWG style) */}
          <div className="w-full aspect-video overflow-hidden rounded-t-2xl relative">
             <img 
                src={displayImage} 
                alt={`${data.title} Cover`}
                className="w-full h-full object-cover shadow-2xl"
                onError={() => setImgError(true)}
             />
             <div className="absolute inset-0 bg-gradient-to-t from-brand-card/90 via-transparent to-transparent opacity-100"></div>
          </div>

          <div className="p-6 -mt-12 relative">
             <h2 className="text-3xl font-black text-white leading-tight mb-2 drop-shadow-lg tracking-tight">
                {data.title}
             </h2>
             <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 text-shadow-sm max-w-2xl">
              {data.description}
            </p>
          </div>
      </div>
    </div>
  );
};