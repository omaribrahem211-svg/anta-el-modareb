import React, { useState } from 'react';
import { getAvatarTraits, AvatarTraits } from '../utils/playerAvatar';

export interface PlayerAvatarProps {
  player: {
    id: string;
    name?: string;
    nationality?: string;
    nationalityCode?: string;
    photoUrl?: string;
  };
  clubColor?: string;
  clubSecondaryColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'w-7 h-7',
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
  full: 'w-full h-full',
};

export const PlayerAvatar: React.FC<PlayerAvatarProps> = React.memo(({
  player,
  clubColor,
  clubSecondaryColor,
  primaryColor,
  secondaryColor,
  size = 'md',
  className = '',
}) => {
  const effectiveClubColor = clubColor || primaryColor;
  const effectiveClubSecColor = clubSecondaryColor || secondaryColor;
  const [imgError, setImgError] = useState(false);

  // If valid photoUrl provided and hasn't errored, display external photo
  if (player.photoUrl && !imgError) {
    return (
      <img
        src={player.photoUrl}
        alt={player.name || 'Player'}
        className={`${SIZE_CLASSES[size]} object-cover rounded-full ${className}`}
        onError={() => setImgError(true)}
        loading="lazy"
      />
    );
  }

  const traits: AvatarTraits = getAvatarTraits(
    player.id,
    player.nationality,
    player.nationalityCode,
    effectiveClubColor,
    effectiveClubSecColor
  );

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden select-none shrink-0 ${SIZE_CLASSES[size]} ${className}`}
      title={player.name}
    >
      <svg
        viewBox="0 0 100 115"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ambient background circle */}
        <circle cx="50" cy="50" r="46" fill="#0f172a" fillOpacity="0.65" />

        {/* Athletic Torso / Jersey */}
        <path
          d="M18 115 C20 86 32 80 44 79 L56 79 C68 80 80 86 82 115 Z"
          fill={traits.jerseyPrimary}
        />
        {/* Jersey collar / trim */}
        <path
          d="M38 79 C44 90 56 90 62 79 C56 83 44 83 38 79 Z"
          fill={traits.jerseySecondary}
        />
        {/* Jersey stripes / accent lines */}
        <path
          d="M48 83 L48 115 M52 83 L52 115"
          stroke={traits.jerseySecondary}
          strokeWidth="2.5"
          strokeOpacity="0.35"
        />

        {/* Neck */}
        <path
          d="M42 66 L42 81 C46 83 54 83 58 81 L58 66 Z"
          fill={traits.skinShadow}
        />

        {/* Head / Face */}
        <ellipse cx="50" cy="53" rx="19" ry="23" fill={traits.skinTone} />

        {/* Ears */}
        <ellipse cx="30" cy="54" rx="3.5" ry="5.5" fill={traits.skinTone} />
        <ellipse cx="70" cy="54" rx="3.5" ry="5.5" fill={traits.skinTone} />

        {/* Eyes & Eyebrows */}
        <path
          d="M38 45 Q43 43 47 45"
          stroke={traits.hairColor}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M53 45 Q57 43 62 45"
          stroke={traits.hairColor}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="42.5" cy="49" r="2.2" fill={traits.eyeColor} />
        <circle cx="57.5" cy="49" r="2.2" fill={traits.eyeColor} />
        <circle cx="43.2" cy="48.3" r="0.7" fill="#ffffff" />
        <circle cx="58.2" cy="48.3" r="0.7" fill="#ffffff" />

        {/* Nose */}
        <path
          d="M50 49 L48.5 57 L52.5 57"
          stroke={traits.skinShadow}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Mouth */}
        <path
          d="M45 64 Q50 67 55 64"
          stroke="#994d3a"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Beard Styles */}
        {traits.beardStyle === 'stubble' && (
          <path
            d="M38 58 Q50 74 62 58 C60 70 40 70 38 58 Z"
            fill={traits.hairColor}
            opacity="0.22"
          />
        )}
        {traits.beardStyle === 'goatee' && (
          <path
            d="M45 62 Q50 73 55 62 Q50 69 45 62 Z"
            fill={traits.hairColor}
            opacity="0.75"
          />
        )}
        {traits.beardStyle === 'beard' && (
          <path
            d="M34 52 Q35 73 50 75 Q65 73 66 52 C63 68 37 68 34 52 Z"
            fill={traits.hairColor}
            opacity="0.8"
          />
        )}

        {/* Hair Styles */}
        {traits.hairStyle === 'buzz' && (
          <path
            d="M32 46 C32 30 68 30 68 46 C64 36 36 36 32 46 Z"
            fill={traits.hairColor}
            opacity="0.9"
          />
        )}
        {traits.hairStyle === 'taper' && (
          <path
            d="M30 46 C30 26 70 26 70 46 C67 36 33 36 30 46 Z"
            fill={traits.hairColor}
          />
        )}
        {traits.hairStyle === 'pompadour' && (
          <path
            d="M31 46 C29 20 71 20 69 46 C66 33 55 25 50 25 C45 25 34 33 31 46 Z"
            fill={traits.hairColor}
          />
        )}
        {traits.hairStyle === 'curly' && (
          <g fill={traits.hairColor}>
            <circle cx="34" cy="38" r="6" />
            <circle cx="43" cy="32" r="7" />
            <circle cx="50" cy="30" r="7.5" />
            <circle cx="57" cy="32" r="7" />
            <circle cx="66" cy="38" r="6" />
            <circle cx="38" cy="42" r="5" />
            <circle cx="62" cy="42" r="5" />
          </g>
        )}
        {traits.hairStyle === 'wavy' && (
          <path
            d="M30 46 C28 27 46 25 50 27 C54 25 72 27 70 46 C67 36 60 33 50 34 C40 33 33 36 30 46 Z"
            fill={traits.hairColor}
          />
        )}
        {traits.hairStyle === 'fade' && (
          <path
            d="M32 46 C32 28 68 28 68 46 C65 37 35 37 32 46 Z"
            fill={traits.hairColor}
          />
        )}
        {traits.hairStyle === 'afro' && (
          <path
            d="M26 48 C24 18 76 18 74 48 C71 36 29 36 26 48 Z"
            fill={traits.hairColor}
          />
        )}

        {/* Headband if active */}
        {traits.hasHeadband && (
          <path
            d="M31 38 Q50 36 69 38"
            stroke="#ffffff"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
    </div>
  );
});

PlayerAvatar.displayName = 'PlayerAvatar';
