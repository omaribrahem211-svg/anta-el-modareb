import React from 'react';
import { ClubFacilities } from '../../types/game';

/**
 * 1. SCULPTED 3D FOOTBALL KIT / JERSEY MODEL (مجسم قميص اللاعب التكتيكي ثلاثي الأبعاد)
 * Used on Tactics Board, Player Profile Modal, and Squad/Transfer cards.
 */
export const PlayerKit3DModel: React.FC<{
  primaryColor?: string;
  secondaryColor?: string;
  number?: number | string;
  rating?: number;
  overall?: number;
  position?: string;
  isGK?: boolean;
  isCaptain?: boolean;
  isSelected?: boolean;
  isIneligible?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = React.memo(({
  primaryColor = '#10b981',
  secondaryColor = '#ffffff',
  number = 10,
  rating,
  overall,
  position = 'CM',
  isGK = false,
  isCaptain = false,
  isSelected = false,
  isIneligible = false,
  size = 'md',
}) => {
  const effectiveRating = rating ?? overall;
  const mainKit = isIneligible
    ? '#991b1b'
    : isGK
    ? '#f59e0b'
    : primaryColor || '#10b981';
  const trimKit = isIneligible
    ? '#fecaca'
    : isGK
    ? '#0f172a'
    : secondaryColor || '#ffffff';

  const dimensions =
    size === 'lg'
      ? 'w-16 h-16'
      : size === 'sm'
      ? 'w-9 h-9'
      : 'w-11 h-11';

  return (
    <div className={`relative ${dimensions} flex items-center justify-center select-none`}>
      {/* 3D Turf Podium Base Ring */}
      <div
        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-[86%] h-2.5 rounded-full transition-all ${
          isSelected
            ? 'bg-amber-400/50 ring-2 ring-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
            : isIneligible
            ? 'bg-rose-500/40 ring-1 ring-rose-400'
            : 'bg-black/55 border border-white/20'
        }`}
      />

      {/* Sculpted 3D SVG Football Jersey */}
      <svg
        viewBox="0 0 64 64"
        className={`w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.65)] transition-transform ${
          isSelected ? 'scale-110' : ''
        }`}
      >
        <defs>
          <linearGradient id={`kitGrad_${mainKit.replace('#', '')}_${position}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={mainKit} stopOpacity="1" />
            <stop offset="55%" stopColor={mainKit} stopOpacity="0.92" />
            <stop offset="100%" stopColor="#090d16" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id="kitGloss" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
          </linearGradient>
        </defs>

        {/* Jersey Torso & Sleeves Silhouette */}
        <path
          d="M20 10 L26 8 C28 12 36 12 38 8 L44 10 L57 20 L51 31 L44 27 L44 54 C44 55.5 42.5 57 41 57 L23 57 C21.5 57 20 55.5 20 54 L20 27 L13 31 L7 20 Z"
          fill={`url(#kitGrad_${mainKit.replace('#', '')}_${position})`}
          stroke={isSelected ? '#fde047' : 'rgba(255,255,255,0.65)'}
          strokeWidth={isSelected ? '2.4' : '1.4'}
          strokeLinejoin="round"
        />

        {/* Subtle Center Vertical Stripe */}
        <rect x="29" y="13" width="6" height="43" fill={trimKit} fillOpacity="0.18" />

        {/* Shoulder Stripes */}
        <path d="M21 11 L11 21 L13 24 L23 13 Z" fill={trimKit} fillOpacity="0.8" />
        <path d="M43 11 L53 21 L51 24 L41 13 Z" fill={trimKit} fillOpacity="0.8" />

        {/* Sleeve Cuffs */}
        <path d="M7.5 20.5 L13 30.5 L15 29.2 L9.5 19.2 Z" fill={trimKit} />
        <path d="M56.5 20.5 L51 30.5 L49 29.2 L54.5 19.2 Z" fill={trimKit} />

        {/* V-Neck Collar */}
        <path
          d="M25 8.5 Q32 16 39 8.5 Q36 13.5 32 13.5 Q28 13.5 25 8.5 Z"
          fill={trimKit}
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="0.8"
        />

        {/* 3D Specular Gloss Overlay */}
        <path
          d="M20 10 L26 8 C28 12 36 12 38 8 L44 10 L57 20 L51 31 L44 27 L44 54 L20 54 L20 27 L13 31 L7 20 Z"
          fill="url(#kitGloss)"
        />

        {/* Jersey Squad Number */}
        <text
          x="32"
          y="39"
          textAnchor="middle"
          fill="#ffffff"
          fontSize={size === 'lg' ? '18' : '16'}
          fontWeight="900"
          fontFamily="monospace"
          style={{ filter: 'drop-shadow(0px 1.5px 2px rgba(0,0,0,0.9))' }}
        >
          {number}
        </text>
      </svg>

      {/* Overall Rating Mini Crest (Bottom Right) */}
      {typeof effectiveRating === 'number' && (
        <span
          className={`absolute -bottom-1 -right-1 px-1 py-0.5 rounded-md text-[9px] font-mono font-black leading-none border shadow z-20 ${
            effectiveRating >= 80
              ? 'bg-amber-400 text-slate-950 border-white'
              : effectiveRating >= 70
              ? 'bg-emerald-500 text-slate-950 border-emerald-200'
              : 'bg-slate-900 text-white border-slate-600'
          }`}
        >
          {effectiveRating}
        </span>
      )}

      {/* Captain Armband Badge */}
      {isCaptain && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center border border-white shadow">
          C
        </span>
      )}
    </div>
  );
});

/**
 * 2. SCULPTED 3D ISOMETRIC MATCH PLAYER FIGURINE (مجسم اللاعب ثلاثي الأبعاد داخل محرك المباريات)
 * Used in OnlineMatchPitch3D / TacticalPitch2D for all 22 players on the field.
 */
export interface PitchPlayerFigurineProps {
  player?: {
    id?: string;
    name?: string;
    role?: string;
    roleArabic?: string;
    jerseyNumber?: number;
    isCarrier?: boolean;
    isRunning?: boolean;
    isScorer?: boolean;
  };
  name?: string;
  jerseyNumber?: number;
  roleArabic?: string;
  isCarrier?: boolean;
  isRunning?: boolean;
  isScorer?: boolean;
  isHome?: boolean;
  primaryColor?: string;
  isGK?: boolean;
}

export const PitchPlayerFigurine3D: React.FC<PitchPlayerFigurineProps> = (props) => {
  const { player, isHome = true, primaryColor, isGK = false } = props;
  
  const resolvedName = player?.name ?? props.name ?? 'لاعب';
  const resolvedNumber = player?.jerseyNumber ?? props.jerseyNumber ?? 10;
  const resolvedRoleArabic = player?.roleArabic ?? props.roleArabic ?? 'لاعب';
  const resolvedIsCarrier = Boolean(player?.isCarrier ?? props.isCarrier);
  const resolvedIsRunning = Boolean(player?.isRunning ?? props.isRunning);
  const resolvedIsScorer = Boolean(player?.isScorer ?? props.isScorer);

  const kitColor = isGK
    ? isHome
      ? '#f59e0b'
      : '#06b6d4'
    : primaryColor || (isHome ? '#10b981' : '#2563eb');
  const shortsColor = isHome ? '#f8fafc' : '#0f172a';
  const ringColor = resolvedIsCarrier
    ? 'border-amber-300 bg-amber-400/35 shadow-[0_0_10px_rgba(251,191,36,0.95)]'
    : isHome
    ? 'border-emerald-400/80 bg-emerald-500/20'
    : 'border-sky-400/80 bg-sky-500/20';

  return (
    <div className="relative flex flex-col items-center">
      {/* Scorer Celebration Floating Trophy Banner */}
      {resolvedIsScorer && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 font-black text-[8px] shadow-lg animate-bounce z-30 whitespace-nowrap border border-white">
          <span>⚽</span>
          <span>هدف!</span>
        </div>
      )}

      {/* 3D Tactical Base Disc on the Turf */}
      <div
        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border transition-all duration-200 ${ringColor}`}
        style={{
          width: resolvedIsCarrier ? '20px' : '15px',
          height: resolvedIsCarrier ? '7px' : '5.5px',
        }}
      >
        {/* Directional Pointer Cone for Ball Carrier */}
        {resolvedIsCarrier && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-[4px] border-x-transparent ${
              isHome
                ? '-top-1.5 border-b-[5px] border-b-amber-300'
                : '-bottom-1.5 border-t-[5px] border-t-amber-300'
            }`}
          />
        )}
      </div>

      {/* Sculpted 3D Miniature Footballer SVG Model */}
      <div
        className={`relative flex flex-col items-center transition-transform duration-200 ${
          resolvedIsCarrier ? 'scale-110' : 'scale-95'
        }`}
      >
        <svg
          width="22"
          height="26"
          viewBox="0 0 28 34"
          className="overflow-visible drop-shadow-[0_2px_2.5px_rgba(0,0,0,0.85)]"
        >
          {/* Head & Hair with 3D Shading */}
          <circle cx="14" cy="6.5" r="4.5" fill="#f1c27d" stroke="#1e293b" strokeWidth="0.8" />
          <path
            d="M9.8 5.5 C9.8 2.2 18.2 2.2 18.2 5.5 C16.5 4.2 11.5 4.2 9.8 5.5 Z"
            fill="#1c1917"
          />

          {/* Sculpted Jersey & Shoulders */}
          <path
            d="M7 11.5 C7 10 9.5 9.5 14 9.5 C18.5 9.5 21 10 21 11.5 L23.5 16.5 L20.5 18 L19.2 14.5 L19.2 21.5 L8.8 21.5 L8.8 14.5 L7.5 18 L4.5 16.5 Z"
            fill={kitColor}
            stroke="#0f172a"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />

          {/* Collar & Shoulder Accent */}
          <path d="M11.5 9.8 Q14 12.2 16.5 9.8" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.85" />

          {/* Athletic Shorts */}
          <path
            d="M9.2 21.2 L18.8 21.2 L19.4 25.5 L14.6 25.5 L14 23.5 L13.4 25.5 L8.6 25.5 Z"
            fill={shortsColor}
            stroke="#0f172a"
            strokeWidth="0.8"
          />

          {/* Left Leg & Boot */}
          <g className={resolvedIsRunning ? 'animate-leg-left' : ''}>
            <rect x="9.8" y="25.5" width="2.6" height="4.2" rx="1" fill={kitColor} stroke="#0f172a" strokeWidth="0.5" />
            <rect x="9.2" y="29.3" width="3.6" height="1.8" rx="0.8" fill="#0f172a" stroke="#ffffff" strokeWidth="0.4" />
          </g>

          {/* Right Leg & Boot */}
          <g className={resolvedIsRunning ? 'animate-leg-right' : ''}>
            <rect x="15.6" y="25.5" width="2.6" height="4.2" rx="1" fill={kitColor} stroke="#0f172a" strokeWidth="0.5" />
            <rect x="15.2" y="29.3" width="3.6" height="1.8" rx="0.8" fill="#0f172a" stroke="#ffffff" strokeWidth="0.4" />
          </g>

          {/* Squad Number on Chest/Back */}
          <text
            x="14"
            y="18.2"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="7.2"
            fontWeight="900"
            fontFamily="monospace"
            style={{ filter: 'drop-shadow(0px 0.8px 1px rgba(0,0,0,0.95))' }}
          >
            {resolvedNumber}
          </text>
        </svg>
      </div>

      {/* Broadcast Nameplate Label */}
      {isHome ? (
        <div className="flex flex-col items-center mt-0.5 pointer-events-none z-10 max-w-[68px] sm:max-w-[78px]">
          <span
            className={`px-1.5 py-0.2 rounded text-[7px] sm:text-[7.5px] font-black tracking-tight whitespace-nowrap truncate max-w-full shadow-md border leading-tight transition-all duration-200 ${
              resolvedIsCarrier
                ? 'bg-amber-400 text-slate-950 border-white ring-1 ring-amber-300 scale-105'
                : 'bg-slate-950/90 text-emerald-200 border-emerald-500/40'
            }`}
            title={resolvedName}
          >
            {resolvedName}
          </span>
          <span className="text-[6px] font-bold text-slate-300/90 mt-0.2 leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)] font-mono">
            {resolvedRoleArabic} #{resolvedNumber}
          </span>
        </div>
      ) : resolvedIsCarrier ? (
        <div className="mt-0.5 pointer-events-none z-10">
          <span className="px-1 py-0.2 rounded text-[6.5px] font-mono font-black bg-sky-600 text-white border border-sky-300 shadow">
            #{resolvedNumber}
          </span>
        </div>
      ) : null}
    </div>
  );
};

/**
 * 3. 3D ISOMETRIC ARCHITECTURAL MODELS FOR CLUB FACILITIES (مجسمات منشآت النادي والاستاد ثلاثية الأبعاد)
 */
export const Facility3DModel: React.FC<{
  facilityKey: keyof ClubFacilities;
  level: number;
  primaryColor?: string;
}> = ({ facilityKey, level = 1 }) => {
  const safeLevel = Math.max(1, Math.min(5, level));

  return (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-slate-800/90 via-slate-900 to-slate-950 border border-slate-700/80 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
      {/* Subtle Isometric Grid Floor */}
      <div className="absolute inset-x-0 bottom-0 h-6 bg-emerald-950/40 border-t border-emerald-500/20" />

      {facilityKey === 'stadiumLevel' && (
        <svg viewBox="0 0 80 80" className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)]">
          {/* Floodlight Towers (More towers at higher levels) */}
          <line x1="14" y1="28" x2="10" y2="12" stroke="#94a3b8" strokeWidth="2" />
          <rect x="7" y="9" width="7" height="4" rx="1" fill="#fef08a" />
          <line x1="66" y1="28" x2="70" y2="12" stroke="#94a3b8" strokeWidth="2" />
          <rect x="66" y="9" width="7" height="4" rx="1" fill="#fef08a" />
          {safeLevel >= 3 && (
            <>
              <line x1="26" y1="22" x2="24" y2="8" stroke="#94a3b8" strokeWidth="1.8" />
              <rect x="21" y="6" width="6" height="3.5" rx="1" fill="#fef08a" />
              <line x1="54" y1="22" x2="56" y2="8" stroke="#94a3b8" strokeWidth="1.8" />
              <rect x="53" y="6" width="6" height="3.5" rx="1" fill="#fef08a" />
            </>
          )}
          {/* Outer Stadium Bowl Tier */}
          <ellipse cx="40" cy="48" rx="32" ry="17" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
          <path d="M8 48 C8 62 72 62 72 48 L70 57 C70 68 10 68 10 57 Z" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          {/* Upper Canopy Ring */}
          <ellipse cx="40" cy="45" rx="30" ry="14" fill="#0f172a" stroke="#38bdf8" strokeWidth={safeLevel >= 4 ? '2' : '1'} />
          {/* Inner Crowd Stands */}
          <ellipse cx="40" cy="46" rx="24" ry="11" fill="#475569" />
          {/* Isometric Green Turf Pitch Inside */}
          <ellipse cx="40" cy="47" rx="18" ry="7.5" fill="#16a34a" stroke="#ffffff" strokeWidth="0.8" />
          <line x1="40" y1="39.5" x2="40" y2="54.5" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.8" />
          <circle cx="40" cy="47" r="2.5" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.8" />
        </svg>
      )}

      {facilityKey === 'medicalCenterLevel' && (
        <svg viewBox="0 0 80 80" className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)]">
          {/* Isometric Base Platform */}
          <polygon points="40,66 10,52 40,38 70,52" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
          {/* Modern Glass Medical Building */}
          <polygon points="40,58 18,46 18,24 40,36" fill="#ecfdf5" stroke="#6ee7b7" strokeWidth="1" />
          <polygon points="40,58 62,46 62,24 40,36" fill="#d1fae5" stroke="#34d399" strokeWidth="1" />
          <polygon points="40,36 18,24 40,14 62,24" fill="#10b981" stroke="#a7f3d0" strokeWidth="1.2" />
          {/* Red/Emerald Medical Cross */}
          <rect x="37" y="19" width="6" height="12" rx="1" fill="#ef4444" />
          <rect x="34" y="22" width="12" height="6" rx="1" fill="#ef4444" />
          {/* Windows */}
          <line x1="23" y1="33" x2="35" y2="40" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="23" y1="40" x2="35" y2="47" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="57" y1="33" x2="45" y2="40" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="57" y1="40" x2="45" y2="47" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}

      {facilityKey === 'trainingGroundLevel' && (
        <svg viewBox="0 0 80 80" className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)]">
          {/* Isometric Twin Training Turf Pitches */}
          <polygon points="40,66 8,50 40,34 72,50" fill="#15803d" stroke="#86efac" strokeWidth="1.2" />
          <polygon points="40,62 14,49 40,36 66,49" fill="#16a34a" stroke="#ffffff" strokeWidth="0.9" />
          <line x1="27" y1="42.5" x2="53" y2="55.5" stroke="#ffffff" strokeWidth="0.8" />
          {/* 3D Training Goal & Agility Cones */}
          <polyline points="20,45 20,39 28,35 28,41" fill="none" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="42" cy="46" r="2" fill="#f59e0b" />
          <circle cx="48" cy="49" r="2" fill="#f59e0b" />
          <circle cx="36" cy="49" r="2" fill="#38bdf8" />
          {/* Gym Pavilion Roof */}
          <polygon points="52,36 38,29 48,23 62,30" fill="#0284c7" stroke="#bae6fd" strokeWidth="1" />
        </svg>
      )}

      {facilityKey === 'youthAcademyLevel' && (
        <svg viewBox="0 0 80 80" className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)]">
          {/* Isometric Academy Campus Base */}
          <polygon points="40,66 10,52 40,38 70,52" fill="#1e1b4b" stroke="#fbbf24" strokeWidth="1" />
          {/* Academy Building Left & Right Wings */}
          <polygon points="40,56 18,45 18,28 40,39" fill="#312e81" stroke="#818cf8" strokeWidth="1" />
          <polygon points="40,56 62,45 62,28 40,39" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1" />
          <polygon points="40,39 18,28 40,18 62,28" fill="#4338ca" stroke="#c7d2fe" strokeWidth="1" />
          {/* Golden Wonderkid Star Crest on Roof */}
          <polygon
            points="40,8 42.8,14 49.2,14.8 44.4,19 45.8,25.2 40,21.8 34.2,25.2 35.6,19 30.8,14.8 37.2,14"
            fill="#fbbf24"
            stroke="#fef08a"
            strokeWidth="1"
          />
        </svg>
      )}

      {facilityKey === 'scoutingNetworkLevel' && (
        <svg viewBox="0 0 80 80" className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)]">
          {/* Isometric Analytics Hub Base */}
          <polygon points="40,66 12,52 40,38 68,52" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
          {/* Control Tower */}
          <polygon points="40,56 24,48 24,32 40,40" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
          <polygon points="40,56 56,48 56,32 40,40" fill="#0f172a" stroke="#0284c7" strokeWidth="1" />
          {/* 3D Satellite Radar Dish & Globe */}
          <circle cx="40" cy="24" r="11" fill="#0284c7" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1.4" />
          <ellipse cx="40" cy="24" rx="11" ry="4.5" fill="none" stroke="#7dd3fc" strokeWidth="1" />
          <ellipse cx="40" cy="24" rx="4.5" ry="11" fill="none" stroke="#7dd3fc" strokeWidth="1" />
          <circle cx="45" cy="20" r="2.2" fill="#fbbf24" />
        </svg>
      )}

      {/* Level Stars Strip at Bottom */}
      <div className="absolute bottom-1 inset-x-1 flex items-center justify-center gap-0.5 bg-slate-950/85 py-0.5 rounded-md border border-slate-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`text-[7px] leading-none ${
              i < safeLevel ? 'text-amber-400' : 'text-slate-700'
            }`}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * 4. 3D ISOMETRIC CLUB SPORTS COMPLEX & STADIUM ARENA PANORAMA (مجسم مدينة النادي والاستاد الرئيسي)
 * Displayed at the top of ClubTab to give the manager a rich visual model of their club's arena & infrastructure.
 */
export interface ClubArena3DShowcaseProps {
  clubName?: string;
  stadiumName?: string;
  stadiumCapacity?: number;
  capacity?: number;
  facilities?: Partial<ClubFacilities>;
  stadiumLevel?: number;
  primaryColor?: string;
}

export const ClubArena3DShowcase: React.FC<ClubArena3DShowcaseProps> = ({
  clubName = 'النادي',
  stadiumName = 'استاد النادي',
  stadiumCapacity,
  capacity,
  facilities,
  stadiumLevel,
  primaryColor = '#10b981',
}) => {
  const sLevel = stadiumLevel || facilities?.stadiumLevel || 1;
  const mLevel = facilities?.medicalCenterLevel || 1;
  const tLevel = facilities?.trainingGroundLevel || 1;
  const yLevel = facilities?.youthAcademyLevel || 1;
  const resolvedCapacity = stadiumCapacity ?? capacity ?? facilities?.stadiumCapacity ?? 5000;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-b from-[#07111f] via-[#0b192c] to-[#071520] p-4 shadow-2xl">
      {/* Stadium Night Sky & Floodlight Glow */}
      <div className="absolute -top-12 left-1/4 w-40 h-40 rounded-full bg-sky-400/10 blur-2xl pointer-events-none" />
      <div className="absolute -top-12 right-1/4 w-40 h-40 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Right: Club Arena Info */}
        <div className="space-y-1.5 text-right flex-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
            <span>🏟️ المجسم الهندسي لمدينة ومرافق النادي</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-amber-300">المستوى العام {Math.round((sLevel + mLevel + tLevel + yLevel) / 4)}/5</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">
            {stadiumName || `استاد ${clubName}`}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            السعة الجماهيرية الحالية: <strong className="text-emerald-400 font-mono">{resolvedCapacity.toLocaleString()} متفرج</strong> · كل ترقية للمنشآت تطور المجسم وتزيد مداخيل وكفاءة الفريق.
          </p>
        </div>

        {/* Left: 3D Isometric Stadium Bowl SVG Illustration */}
        <div className="w-full md:w-64 h-32 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 260 120" className="w-full h-full drop-shadow-[0_12px_20px_rgba(0,0,0,0.8)]">
            {/* Isometric Turf Grounds Base */}
            <polygon points="130,114 18,74 130,34 242,74" fill="#064e3b" stroke="#059669" strokeWidth="1.2" />

            {/* Left Training Pitch Mini Model */}
            <polygon points="62,80 32,68 56,58 86,70" fill="#15803d" stroke="#ffffff" strokeWidth="0.6" />

            {/* Right Youth Academy Mini Dome */}
            <polygon points="198,80 174,70 196,60 220,70" fill="#1e293b" stroke="#fbbf24" strokeWidth="0.8" />

            {/* Floodlight Masts */}
            <line x1="68" y1="48" x2="58" y2="14" stroke="#cbd5e1" strokeWidth="2.2" />
            <rect x="52" y="10" width="12" height="5" rx="1.5" fill="#fef08a" />
            <line x1="192" y1="48" x2="202" y2="14" stroke="#cbd5e1" strokeWidth="2.2" />
            <rect x="196" y="10" width="12" height="5" rx="1.5" fill="#fef08a" />

            {/* Outer Stadium Wall */}
            <ellipse cx="130" cy="64" rx="64" ry="28" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
            <path d="M66 64 C66 86 194 86 194 64 L190 78 C190 98 70 98 70 78 Z" fill="#0f172a" stroke="#475569" strokeWidth="1.2" />

            {/* Stadium Roof Accent in Club Primary Color */}
            <ellipse cx="130" cy="60" rx="60" ry="24" fill="#090d16" stroke={primaryColor} strokeWidth="2.2" />

            {/* Inner Seating Bowl */}
            <ellipse cx="130" cy="62" rx="48" ry="18" fill="#334155" />

            {/* 3D Mowed Turf Field Inside Stadium */}
            <ellipse cx="130" cy="64" rx="36" ry="13" fill="#16a34a" stroke="#ffffff" strokeWidth="1" />
            <line x1="130" y1="51" x2="130" y2="77" stroke="#ffffff" strokeWidth="0.8" />
            <ellipse cx="130" cy="64" rx="7" ry="4" fill="none" stroke="#ffffff" strokeWidth="0.8" />
          </svg>
        </div>
      </div>
    </div>
  );
};

/**
 * 5. 3D METALLIC CLUB CREST SHIELD (درع وشعار النادي ثلاثي الأبعاد للمباريات)
 */
export const ClubCrest3DShield: React.FC<{
  clubName: string;
  primaryColor?: string;
  secondaryColor?: string;
  reputation?: number;
  size?: 'sm' | 'md' | 'lg';
}> = ({
  clubName,
  primaryColor = '#10b981',
  secondaryColor = '#ffffff',
  size = 'md',
}) => {
  const dim = size === 'lg' ? 'w-16 h-16' : size === 'sm' ? 'w-10 h-10' : 'w-13 h-13';
  const initial = (clubName || 'ن').replace('النادي ', '').replace('نادي ', '').trim().charAt(0) || 'ن';

  return (
    <div className={`relative ${dim} flex items-center justify-center shrink-0 select-none`}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.7)]">
        <defs>
          <linearGradient id={`shield_${primaryColor.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        {/* Outer Metallic Shield Frame */}
        <path
          d="M32 4 L56 12 L56 32 C56 47 44 56 32 60 C20 56 8 47 8 32 L8 12 Z"
          fill={`url(#shield_${primaryColor.replace('#', '')})`}
          stroke="#fbbf24"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Diagonal Club Stripe */}
        <path
          d="M16 14 L26 11 L48 48 L38 53 Z"
          fill={secondaryColor}
          fillOpacity="0.22"
        />
        {/* Inner Shield Rim */}
        <path
          d="M32 8 L51 15 L51 31 C51 43 41 51 32 55 C23 51 13 43 13 31 L13 15 Z"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1"
        />
        {/* Club Arabic Initial */}
        <text
          x="32"
          y="39"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="20"
          fontWeight="900"
          style={{ filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.85))' }}
        >
          {initial}
        </text>
      </svg>
    </div>
  );
};
