export function BotLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <>
      <img 
        src="/bot-logo.png" 
        alt="AI Assistant Logo" 
        className={`object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.3)] ${className}`}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.classList.remove('hidden');
        }}
      />
      
      {/* Fallback SVG just in case the image isn't uploaded yet */}
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`hidden ${className}`}>
        <defs>
          <radialGradient id="bgGrad" cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="70%" stopColor="#020617" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
          <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="40%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M30 15 H70 C86.5 15 100 28.5 100 45 C100 61.5 86.5 75 70 75 H65 V92 C65 96 60 97.5 57 94 L44 75 H30 C13.5 75 0 61.5 0 45 C0 28.5 13.5 15 30 15 Z"
          fill="url(#bgGrad)"
          stroke="url(#strokeGrad)"    
          strokeWidth="4"
          filter="url(#glow)"
        />
        <rect x="28" y="32" width="12" height="26" rx="6" fill="#38BDF8" />
        <rect x="60" y="32" width="12" height="26" rx="6" fill="#38BDF8" />
        <rect x="30" y="34" width="8" height="22" rx="4" fill="#E0F2FE" />
        <rect x="62" y="34" width="8" height="22" rx="4" fill="#E0F2FE" />
      </svg>
    </>
  );
}
