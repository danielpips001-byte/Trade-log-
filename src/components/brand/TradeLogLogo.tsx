import React from 'react';

interface TradeLogLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  showBadge?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: { icon: 22, text: 'text-xs' },
  sm: { icon: 28, text: 'text-[14px]' },
  md: { icon: 34, text: 'text-base' },
  lg: { icon: 44, text: 'text-xl' }
};

export const TradeLogLogo: React.FC<TradeLogLogoProps> = ({
  size = 'sm',
  showWordmark = false,
  showBadge = true,
  className = ''
}) => {
  const { icon, text } = SIZE_MAP[size];

  return (
    <span className={`inline-flex items-center gap-2 select-none shrink-0 ${className}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="tg-badge-fill" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1D1E22" />
            <stop offset="55%" stopColor="#0E0F12" />
            <stop offset="100%" stopColor="#070709" />
          </linearGradient>
          <linearGradient id="tg-badge-rim" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0.10)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.18)" />
          </linearGradient>
          <linearGradient id="tg-top-sheen" x1="20" y1="2" x2="20" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {showBadge && (
          <>
            <rect
              x="1.5"
              y="1.5"
              width="37"
              height="37"
              rx="10.5"
              fill="url(#tg-badge-fill)"
              stroke="url(#tg-badge-rim)"
              strokeWidth="1.2"
            />
            <rect
              x="2.5"
              y="2.5"
              width="35"
              height="16"
              rx="9"
              fill="url(#tg-top-sheen)"
            />
          </>
        )}

        {/* Geometric Interlocking TG Monogram */}
        {/* Shared upper architectural rail bridging T crossbar into G upper arch */}
        <path
          d="M 8 11.5 H 28.5 C 30.8 11.5 32 12.7 32 14.8"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* T vertical stem */}
        <path
          d="M 13.5 11.5 V 28.5"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* G lower body interlocking cleanly beneath T's right wing */}
        <path
          d="M 19.5 16 V 25 C 19.5 27.3 21 28.5 23.3 28.5 H 28.5 C 30.8 28.5 32 27.3 32 25 V 20.5"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Subtle emerald precision bar completing the G */}
        <path
          d="M 25.5 20.5 H 32"
          stroke="#34D399"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {showWordmark && (
        <span className={`${text} font-bold tracking-[-0.02em] text-white whitespace-nowrap`}>
          Trade<span className="text-neutral-400 font-semibold">Log</span>
        </span>
      )}
    </span>
  );
};
