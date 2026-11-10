import React from 'react';
import { LayoutGrid } from 'lucide-react';

interface AppIconProps {
  name: string;
  packageName: string;
  iconName?: string;
  size?: number;
}

export const RealAppIcon: React.FC<AppIconProps> = ({ name, packageName, iconName, size = 48 }) => {
  const pkg = packageName.toLowerCase();
  const icon = (iconName || name).toLowerCase();

  // 48x48 rounded square icon container
  const containerClass = `w-12 h-12 rounded-xl flex items-center justify-center shadow-md shrink-0 overflow-hidden relative`;

  // WhatsApp
  if (pkg.includes('whatsapp') || icon.includes('whatsapp')) {
    return (
      <div className={`${containerClass} bg-[#25D366]`}>
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.07 7.73C8.89 7.73 8.6 7.8 8.35 8.07C8.1 8.34 7.4 9 7.4 10.37C7.4 11.74 8.4 13.06 8.54 13.25C8.68 13.43 10.46 16.29 13.26 17.39C15.6 18.3 16.07 18.12 16.59 18.07C17.11 18.02 18.27 17.38 18.51 16.7C18.75 16.02 18.75 15.43 18.68 15.31C18.61 15.2 18.42 15.13 18.14 14.99C17.86 14.85 16.49 14.18 16.23 14.08C15.98 13.99 15.8 13.94 15.61 14.22C15.43 14.5 14.91 15.13 14.75 15.31C14.6 15.5 14.44 15.52 14.16 15.38C13.88 15.24 12.98 14.95 11.92 14C11.1 13.27 10.54 12.36 10.39 12.11C10.24 11.86 10.37 11.72 10.51 11.58C10.64 11.45 10.8 11.24 10.94 11.08C11.08 10.92 11.13 10.8 11.22 10.62C11.31 10.44 11.27 10.28 11.2 10.14C11.13 10 10.58 8.67 10.35 8.12C10.13 7.59 9.9 7.66 9.73 7.65C9.57 7.64 9.38 7.64 9.19 7.64L9.07 7.73Z"/>
        </svg>
      </div>
    );
  }

  // TikTok
  if (pkg.includes('musically') || pkg.includes('tiktok') || icon.includes('tiktok')) {
    return (
      <div className={`${containerClass} bg-black border border-cyan-500/30`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.11V9.4a6.33 6.33 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 10.7 4.54 6.3 6.3 0 0 0 2-4.54V9.08a8.16 8.16 0 0 0 4.75 1.52V7.15a4.85 4.85 0 0 1-1-.46z" fill="#00f2fe"/>
          <path d="M18.59 5.69a4.83 4.83 0 0 1-3.77-4.25V1h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.11V8.4a6.33 6.33 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 10.7 4.54 6.3 6.3 0 0 0 2-4.54V8.08a8.16 8.16 0 0 0 4.75 1.52V6.15a4.85 4.85 0 0 1-1-.46z" fill="#ff0050"/>
          <path d="M19.09 6.19a4.83 4.83 0 0 1-3.77-4.25V1.5h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.11V8.9a6.33 6.33 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 10.7 4.54 6.3 6.3 0 0 0 2-4.54V8.58a8.16 8.16 0 0 0 4.75 1.52V6.65a4.85 4.85 0 0 1-1-.46z" fill="#ffffff"/>
        </svg>
      </div>
    );
  }

  // YouTube
  if (pkg.includes('youtube') || icon.includes('youtube')) {
    return (
      <div className={`${containerClass} bg-[#FF0000]`}>
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      </div>
    );
  }

  // Instagram
  if (pkg.includes('instagram') && !pkg.includes('barcelona') || icon === 'instagram') {
    return (
      <div className={`${containerClass} bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      </div>
    );
  }

  // Facebook
  if (pkg.includes('facebook.katana') || (icon.includes('facebook') && !icon.includes('messenger'))) {
    return (
      <div className={`${containerClass} bg-[#1877F2]`}>
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </div>
    );
  }

  // Messenger
  if (pkg.includes('orca') || icon.includes('messenger')) {
    return (
      <div className={`${containerClass} bg-gradient-to-tr from-[#00B2FE] via-[#006AFF] to-[#9B30FF]`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.15 2 11.27c0 2.92 1.46 5.53 3.74 7.21V22l3.37-1.85c.91.25 1.88.39 2.89.39 5.52 0 10-4.15 10-9.27S17.52 2 12 2zm1.09 12.45l-2.58-2.75-5.04 2.75 5.55-5.89 2.65 2.75 4.97-2.75-5.55 5.89z"/>
        </svg>
      </div>
    );
  }

  // Chrome
  if (pkg.includes('chrome') || icon.includes('chrome')) {
    return (
      <div className={`${containerClass} bg-slate-900 border border-slate-700`}>
        <svg viewBox="0 0 24 24" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="#4285F4"/>
          <path d="M12 2C7.03 2 2.9 5.61 2.12 10.36L8.68 12.5C9.28 10.45 10.47 8.78 12 8.78H21.8C20.31 4.7 16.48 2 12 2Z" fill="#EA4335"/>
          <path d="M21.8 8.78H12C10.74 8.78 9.61 9.38 8.87 10.31L2.12 10.36C2.04 10.9 2 11.44 2 12C2 16.97 5.61 21.1 10.36 21.88L13.8 15.93C12.35 15.65 11.16 14.53 10.74 13.08L21.8 8.78Z" fill="#FBBC05"/>
          <path d="M12 22C16.97 22 21.1 18.39 21.88 13.64L15.32 11.5C14.72 13.55 13.53 15.22 12 15.22C10.38 15.22 8.98 14.33 8.24 13.03L2.12 13.64C3.61 18.3 7.85 22 12 22Z" fill="#34A853"/>
          <circle cx="12" cy="12" r="4.5" fill="#FFFFFF"/>
          <circle cx="12" cy="12" r="3.2" fill="#1A73E8"/>
        </svg>
      </div>
    );
  }

  // Snapchat
  if (pkg.includes('snapchat') || icon.includes('snapchat')) {
    return (
      <div className={`${containerClass} bg-[#FFFC00]`}>
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-black" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.04 2c-3.5 0-5.63 2.5-5.63 5.4 0 .9.2 1.8.6 2.4-.4.1-.9.4-1.1.7-.3.3-.3.7-.1 1 .3.4.8.6 1.4.6.4 0 .8-.1 1.1-.3.4 1.1 1.2 2 2.3 2.4-.5.5-1.4.9-2.6 1.2-.5.1-.9.5-.8 1 .1.4.5.7 1 .7 1.8 0 3.3-.6 4.3-1.4.2.1.5.1.7.1s.5 0 .7-.1c1 .8 2.5 1.4 4.3 1.4.5 0 .9-.3 1-.7.1-.5-.3-.9-.8-1-1.2-.3-2.1-.7-2.6-1.2 1.1-.4 1.9-1.3 2.3-2.4.3.2.7.3 1.1.3.6 0 1.1-.2 1.4-.6.2-.3.2-.7-.1-1-.2-.3-.7-.6-1.1-.7.4-.6.6-1.5.6-2.4 0-2.9-2.13-5.4-5.63-5.4z"/>
        </svg>
      </div>
    );
  }

  // Spotify
  if (pkg.includes('spotify') || icon.includes('spotify')) {
    return (
      <div className={`${containerClass} bg-[#1DB954]`}>
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-black" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.308-1.758-8.793-.963-.335.077-.67-.133-.746-.469-.077-.334.132-.67.467-.747 3.813-.872 7.086-.508 9.721 1.117.295.18.388.563.208.855zm1.226-2.724c-.226.367-.707.482-1.074.256-2.69-1.653-6.79-2.133-9.97-1.167-.413.125-.85-.107-.974-.52-.125-.414.108-.85.52-.975 3.633-1.103 8.15-.572 11.242 1.332.367.226.482.707.256 1.074zm.106-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.494.15-1.018-.129-1.168-.623-.15-.495.13-1.018.624-1.168 3.532-1.073 9.404-.866 13.115 1.337.445.264.59.838.327 1.282-.264.443-.838.59-1.282.327z"/>
        </svg>
      </div>
    );
  }

  // Netflix
  if (pkg.includes('netflix') || icon.includes('netflix')) {
    return (
      <div className={`${containerClass} bg-black border border-red-600/40`}>
        <span className="font-orbitron font-black text-2xl text-[#E50914] tracking-tighter">N</span>
      </div>
    );
  }

  // Telegram
  if (pkg.includes('telegram') || icon.includes('telegram')) {
    return (
      <div className={`${containerClass} bg-[#2AABEE]`}>
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
        </svg>
      </div>
    );
  }

  // X / Twitter
  if (pkg.includes('twitter') || icon === 'x' || icon.includes('twitter')) {
    return (
      <div className={`${containerClass} bg-black border border-slate-700`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </div>
    );
  }

  // Threads
  if (pkg.includes('barcelona') || icon.includes('threads')) {
    return (
      <div className={`${containerClass} bg-black border border-slate-700`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.211-8.184-3.528-1.86-2.327-2.8-5.54-2.8-9.55 0-4.07.946-7.309 2.812-9.627C5.86 3.966 8.618 2.77 12.193 2.75h.013c2.723.016 5.035.795 6.873 2.317 1.794 1.485 2.87 3.55 3.2 6.136l-2.482.316c-.255-2.008-1.085-3.606-2.47-4.75-1.428-1.182-3.268-1.79-5.466-1.805-2.91.018-5.11.956-6.541 2.788-1.458 1.867-2.197 4.544-2.197 7.958 0 3.37.733 6.02 2.18 7.876 1.427 1.83 3.613 2.775 6.497 2.793 2.146-.014 3.94-.606 5.334-1.761 1.455-1.206 2.302-2.946 2.518-5.17h-7.616v-2.392h10.15v1.204c-.035 3.018-1.178 5.518-3.398 7.433-2.137 1.844-4.872 2.79-8.128 2.81z"/>
        </svg>
      </div>
    );
  }

  // CapCut
  if (pkg.includes('lvoverseas') || icon.includes('capcut')) {
    return (
      <div className={`${containerClass} bg-black border border-slate-600`}>
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.24L19.46 8 12 11.76 4.54 8 12 4.24zM4 9.47l7 3.5v7.26l-7-3.5V9.47zm9 10.76v-7.26l7-3.5v7.26l-7 3.5z"/>
        </svg>
      </div>
    );
  }

  // ShareIt
  if (pkg.includes('anyshare') || icon.includes('shareit')) {
    return (
      <div className={`${containerClass} bg-[#0084FF]`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="7" r="3"/>
          <circle cx="6" cy="17" r="3"/>
          <circle cx="18" cy="17" r="3"/>
          <line x1="8.5" y1="15.5" x2="10" y2="9.5" stroke="white" strokeWidth="2"/>
          <line x1="15.5" y1="15.5" x2="14" y2="9.5" stroke="white" strokeWidth="2"/>
        </svg>
      </div>
    );
  }

  // Google Play Store
  if (pkg.includes('vending') || icon.includes('play store')) {
    return (
      <div className={`${containerClass} bg-slate-900 border border-slate-700`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.609 1.814L13.792 12 3.61 22.186a2.02 2.02 0 0 1-.61-1.464V3.278c0-.573.228-1.096.61-1.464z" fill="#00D2FF"/>
          <path d="M17.18 8.61L4.66 1.385A2.02 2.02 0 0 0 3.609 1.814L13.792 12l3.388-3.39z" fill="#00F076"/>
          <path d="M17.18 15.39l-3.388-3.39L3.61 22.186c.328.243.738.384 1.05.2l12.52-7.225-.001.229z" fill="#FF3A44"/>
          <path d="M21.05 10.84l-3.87-2.23-3.388 3.39 3.388 3.39 3.87-2.23c.89-.51.89-1.81 0-2.32z" fill="#FFC800"/>
        </svg>
      </div>
    );
  }

  // Google Play Services
  if (pkg.includes('gms') || icon.includes('play services')) {
    return (
      <div className={`${containerClass} bg-slate-900 border border-slate-700`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="#4285F4" strokeWidth="2" fill="none"/>
          <path d="M12 7v10M7 12h10" stroke="#EA4335" strokeWidth="2"/>
        </svg>
      </div>
    );
  }

  // Gmail
  if (pkg.includes('.gm') || icon.includes('gmail')) {
    return (
      <div className={`${containerClass} bg-white border border-slate-300`}>
        <svg viewBox="0 0 24 24" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.272H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.545l8.073-6.052C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
        </svg>
      </div>
    );
  }

  // Google Photos
  if (pkg.includes('photos') || icon.includes('photos')) {
    return (
      <div className={`${containerClass} bg-white border border-slate-300`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 6a6 6 0 0 1 6 6h-6V6z" fill="#EA4335"/>
          <path d="M18 12a6 6 0 0 1-6 6v-6h6z" fill="#4285F4"/>
          <path d="M12 18a6 6 0 0 1-6-6h6v6z" fill="#34A853"/>
          <path d="M6 12a6 6 0 0 1 6-6v6H6z" fill="#FBBC05"/>
        </svg>
      </div>
    );
  }

  // Google Maps
  if (pkg.includes('maps') || icon.includes('maps')) {
    return (
      <div className={`${containerClass} bg-white border border-slate-300`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#EA4335"/>
        </svg>
      </div>
    );
  }

  // Google Drive
  if (pkg.includes('docs') || icon.includes('drive')) {
    return (
      <div className={`${containerClass} bg-slate-900 border border-slate-700`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
          <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5z" fill="#0066DA"/>
          <path d="M16.29 3.5H7.71l6.55 11.5h8.59z" fill="#00AC47"/>
          <path d="M22.85 15l-3.43 6H4.58l3.43-6z" fill="#EA4335"/>
        </svg>
      </div>
    );
  }

  // Pinterest
  if (pkg.includes('pinterest') || icon.includes('pinterest')) {
    return (
      <div className={`${containerClass} bg-[#E60023]`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0a12 12 0 0 0-4.37 23.18c-.08-.94-.15-2.39.03-3.42l1.1-4.66s-.28-.56-.28-1.39c0-1.3.75-2.28 1.7-2.28.8 0 1.18.6 1.18 1.33 0 .8-.52 2.01-.78 3.12-.22.95.47 1.72 1.4 1.72 1.68 0 2.98-1.78 2.98-4.34 0-2.27-1.63-3.86-3.96-3.86-2.7 0-4.28 2.03-4.28 4.12 0 .82.31 1.69.7 2.16.08.1.09.18.06.3l-.27 1.1c-.04.18-.15.22-.35.13-1.3-.6-2.11-2.5-2.11-4.02 0-3.27 2.38-6.28 6.87-6.28 3.6 0 6.4 2.57 6.4 6 0 3.58-2.26 6.46-5.4 6.46-1.05 0-2.04-.55-2.38-1.2l-.65 2.47c-.24.91-.88 2.05-1.31 2.75A12 12 0 1 0 12 0z"/>
        </svg>
      </div>
    );
  }

  // Snack Video / Likee / Helo
  if (pkg.includes('kwai') || icon.includes('snack') || pkg.includes('like') || icon.includes('helo')) {
    return (
      <div className={`${containerClass} bg-gradient-to-tr from-amber-500 to-red-600`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
        </svg>
      </div>
    );
  }

  // DEFAULT FALLBACK: Real grey placeholder Icon(Icons.apps) in 48x48 rounded square
  // NEVER show text circles (WA, TT, etc.)!
  return (
    <div className={`${containerClass} bg-slate-800 border border-slate-700`}>
      <LayoutGrid className="w-6 h-6 text-slate-400" />
    </div>
  );
};
