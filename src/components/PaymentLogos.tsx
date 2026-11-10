import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const JazzCashLogo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'h-6 max-w-[80px]',
    md: 'h-8 max-w-[110px]',
    lg: 'h-11 max-w-[140px]'
  }[size];

  if (hasError) {
    return (
      <div className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-red-600 text-white font-extrabold font-sans tracking-tight ${className}`}>
        <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
        <span className="text-xs">JazzCash</span>
      </div>
    );
  }

  return (
    <img
      src="/assets/jazzcash_logo.png"
      alt="JazzCash Official"
      onError={() => setHasError(true)}
      className={`object-contain select-none drop-shadow-md ${sizeClasses} ${className}`}
    />
  );
};

export const EasypaisaLogo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'h-6 max-w-[80px]',
    md: 'h-8 max-w-[110px]',
    lg: 'h-11 max-w-[140px]'
  }[size];

  if (hasError) {
    return (
      <div className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-emerald-600 text-white font-extrabold font-sans tracking-tight ${className}`}>
        <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
        <span className="text-xs">easypaisa</span>
      </div>
    );
  }

  return (
    <img
      src="/assets/easypaisa_logo.png"
      alt="Easypaisa Official"
      onError={() => setHasError(true)}
      className={`object-contain select-none drop-shadow-md ${sizeClasses} ${className}`}
    />
  );
};

export const BinanceLogo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'h-6 max-w-[80px]',
    md: 'h-8 max-w-[110px]',
    lg: 'h-11 max-w-[140px]'
  }[size];

  if (hasError) {
    return (
      <div className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-[#F3BA2F] text-black font-extrabold font-sans tracking-tight ${className}`}>
        <span className="w-2.5 h-2.5 rounded-full bg-black animate-pulse" />
        <span className="text-xs">BINANCE</span>
      </div>
    );
  }

  return (
    <img
      src="/assets/binance_logo.png"
      alt="Binance Pay Official"
      onError={() => setHasError(true)}
      className={`object-contain select-none drop-shadow-md ${sizeClasses} ${className}`}
    />
  );
};
