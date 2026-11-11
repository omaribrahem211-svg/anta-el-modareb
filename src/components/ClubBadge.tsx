import React, { useState } from 'react';
import { hashString } from '../utils/playerAvatar';

export interface ClubBadgeProps {
  club?: {
    id?: string;
    name?: string;
    shortName?: string;
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
  };
  clubId?: string;
  clubName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-5 h-5 text-[8px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-14 h-14 text-sm',
  xl: 'w-20 h-20 text-base',
};

export const ClubBadge: React.FC<ClubBadgeProps> = React.memo(({
  club,
  clubId,
  clubName,
  primaryColor,
  secondaryColor,
  logoUrl,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const effectiveId = club?.id || clubId || 'club_default';
  const effectiveName = club?.shortName || club?.name || clubName || 'FC';
  const effectivePrimary = club?.primaryColor || primaryColor || '#dc2626';
  const effectiveSecondary = club?.secondaryColor || secondaryColor || '#ffffff';
  const effectiveLogo = club?.logoUrl || logoUrl;

  if (effectiveLogo && !imgError) {
    return (
      <img
        src={effectiveLogo}
        alt={effectiveName}
        className={`${SIZE_MAP[size]} object-contain rounded shrink-0 ${className}`}
        onError={() => setImgError(true)}
        loading="lazy"
      />
    );
  }

  // Generate 2-3 character initials
  const initials = (() => {
    const clean = effectiveName.replace(/نادي|فريق|إف سي|FC|Club/gi, '').trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0].slice(0, 1) + words[1].slice(0, 2)).toUpperCase();
    }
    return clean.slice(0, 3).toUpperCase();
  })();

  const hash = hashString(effectiveId);
  const badgeStyle = hash % 4; // 0: Shield, 1: Circle, 2: Diamond, 3: Crest

  return (
    <div
      className={`inline-flex items-center justify-center select-none shrink-0 relative ${SIZE_MAP[size]} ${className}`}
      title={effectiveName}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-sm overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id={`shadow_${effectiveId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Style 0: Classic Football Shield */}
        {badgeStyle === 0 && (
          <g>
            {/* Outer border */}
            <path
              d="M15 15 L85 15 L85 52 C85 75 50 92 50 92 C50 92 15 75 15 52 Z"
              fill={effectiveSecondary}
              stroke="#0f172a"
              strokeWidth="3"
            />
            {/* Inner fill */}
            <path
              d="M20 20 L80 20 L80 50 C80 70 50 86 50 86 C50 86 20 70 20 50 Z"
              fill={effectivePrimary}
            />
            {/* Diagonal sash / contrast band */}
            <path
              d="M20 20 L80 80 L80 65 L35 20 Z"
              fill={effectiveSecondary}
              opacity="0.35"
            />
            {/* Star badge */}
            <polygon
              points="50,23 52,28 57,28 53,31 55,36 50,33 45,36 47,31 43,28 48,28"
              fill="#fbbf24"
            />
          </g>
        )}

        {/* Style 1: Royal Roundel Crest */}
        {badgeStyle === 1 && (
          <g>
            {/* Outer Ring */}
            <circle cx="50" cy="50" r="46" fill={effectiveSecondary} stroke="#0f172a" strokeWidth="3" />
            {/* Inner Circle */}
            <circle cx="50" cy="50" r="40" fill={effectivePrimary} />
            {/* Inner Ring border */}
            <circle cx="50" cy="50" r="28" fill="none" stroke={effectiveSecondary} strokeWidth="2.5" strokeOpacity="0.6" />
            {/* Vertical Split */}
            <path d="M50 10 A40 40 0 0 1 50 90 Z" fill={effectiveSecondary} opacity="0.25" />
            {/* Stars top and bottom */}
            <polygon points="50,15 51.5,19 55,19 52,21 53,24 50,22 47,24 48,21 45,19 48.5,19" fill="#fbbf24" />
          </g>
        )}

        {/* Style 2: Sharp Modern Hex / Diamond */}
        {badgeStyle === 2 && (
          <g>
            <polygon
              points="50,6 92,26 92,74 50,94 8,74 8,26"
              fill={effectiveSecondary}
              stroke="#0f172a"
              strokeWidth="3"
            />
            <polygon
              points="50,12 86,29 86,71 50,88 14,71 14,29"
              fill={effectivePrimary}
            />
            {/* Contrast chevron */}
            <polygon
              points="50,12 86,29 50,52 14,29"
              fill={effectiveSecondary}
              opacity="0.3"
            />
          </g>
        )}

        {/* Style 3: Crowned Heraldic Shield */}
        {badgeStyle === 3 && (
          <g>
            {/* Castle / Crown top */}
            <path
              d="M22 22 L22 14 L32 18 L42 14 L50 18 L58 14 L68 18 L78 14 L78 22 Z"
              fill="#fbbf24"
              stroke="#0f172a"
              strokeWidth="2"
            />
            {/* Shield Body */}
            <path
              d="M16 22 L84 22 L84 55 C84 76 50 92 50 92 C50 92 16 76 16 55 Z"
              fill={effectiveSecondary}
              stroke="#0f172a"
              strokeWidth="3"
            />
            <path
              d="M21 26 L79 26 L79 53 C79 71 50 86 50 86 C50 86 21 71 21 53 Z"
              fill={effectivePrimary}
            />
            {/* Stripes */}
            <path d="M42 26 L42 84 M58 26 L58 84" stroke={effectiveSecondary} strokeWidth="4" strokeOpacity="0.4" />
          </g>
        )}

        {/* Club Initials text in center */}
        <text
          x="50"
          y="56"
          textAnchor="middle"
          dominantBaseline="central"
          fontWeight="900"
          fontSize="22"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth="3"
          paintOrder="stroke fill"
        >
          {initials}
        </text>
      </svg>
    </div>
  );
});

ClubBadge.displayName = 'ClubBadge';
