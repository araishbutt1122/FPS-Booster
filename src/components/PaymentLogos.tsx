import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Official High-Quality Logos with resilient fallback
export const JazzCashLogo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const [srcIndex, setSrcIndex] = useState(0);

  const sources = [
    'https://upload.wikimedia.org/wikipedia/en/thumb/0/04/JazzCash_logo.png/320px-JazzCash_logo.png',
    '/assets/jazzcash_logo.png',
    'https://upload.wikimedia.org/wikipedia/commons/2/25/JazzCash_logo.svg'
  ];

  const imgMaxHeight = size === 'sm' ? 'max-h-5' : size === 'lg' ? 'max-h-8' : 'max-h-7';

  if (srcIndex >= sources.length) {
    return (
      <div className={`flex items-center justify-center space-x-1 px-2 py-0.5 rounded-lg bg-red-600 text-white font-extrabold font-sans text-xs tracking-tight ${className}`}>
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span>JazzCash</span>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex items-center justify-center p-0.5 ${className}`}>
      <img
        src={sources[srcIndex]}
        alt="JazzCash Official Logo"
        onError={() => setSrcIndex(prev => prev + 1)}
        className={`w-auto ${imgMaxHeight} max-w-full object-contain mx-auto select-none drop-shadow-sm`}
        loading="eager"
      />
    </div>
  );
};

export const EasypaisaLogo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const [srcIndex, setSrcIndex] = useState(0);

  const sources = [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Easypaisa_logo.svg/320px-Easypaisa_logo.svg.png',
    '/assets/easypaisa_logo.png',
    'https://upload.wikimedia.org/wikipedia/commons/c/c5/Easypaisa_logo.svg'
  ];

  const imgMaxHeight = size === 'sm' ? 'max-h-5' : size === 'lg' ? 'max-h-8' : 'max-h-7';

  if (srcIndex >= sources.length) {
    return (
      <div className={`flex items-center justify-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-extrabold font-sans text-xs tracking-tight ${className}`}>
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span>easypaisa</span>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex items-center justify-center p-0.5 ${className}`}>
      <img
        src={sources[srcIndex]}
        alt="Easypaisa Official Logo"
        onError={() => setSrcIndex(prev => prev + 1)}
        className={`w-auto ${imgMaxHeight} max-w-full object-contain mx-auto select-none drop-shadow-sm`}
        loading="eager"
      />
    </div>
  );
};

export const BinanceLogo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const [srcIndex, setSrcIndex] = useState(0);

  const sources = [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Binance_logo.svg/320px-Binance_logo.svg.png',
    '/assets/binance_logo.png',
    'https://upload.wikimedia.org/wikipedia/commons/1/12/Binance_logo.svg'
  ];

  const imgMaxHeight = size === 'sm' ? 'max-h-5' : size === 'lg' ? 'max-h-8' : 'max-h-7';

  if (srcIndex >= sources.length) {
    return (
      <div className={`flex items-center justify-center space-x-1 px-2 py-0.5 rounded-lg bg-[#F3BA2F] text-black font-extrabold font-sans text-xs tracking-tight ${className}`}>
        <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
        <span>BINANCE</span>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex items-center justify-center p-0.5 ${className}`}>
      <img
        src={sources[srcIndex]}
        alt="Binance Pay Official Logo"
        onError={() => setSrcIndex(prev => prev + 1)}
        className={`w-auto ${imgMaxHeight} max-w-full object-contain mx-auto select-none drop-shadow-sm`}
        loading="eager"
      />
    </div>
  );
};
