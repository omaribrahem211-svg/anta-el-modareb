import React from 'react';
import { Player, Club } from '../types/game';
import { PlayerAvatar } from './PlayerAvatar';
import { ClubBadge } from './ClubBadge';
import { AlertTriangle, Ban, Tag, Star, Award } from 'lucide-react';
import { GLOBAL_COUNTRIES } from '../data/countriesData';
import { formatPlayerDualName } from '../utils/squadHelpers';

export interface PlayerCardProps {
  player: Player;
  club?: Club;
  size?: 'sm' | 'md' | 'lg';
  isCaptain?: boolean;
  selected?: boolean;
  showAttributes?: boolean;
  showGlow?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  draggable?: boolean;
  className?: string;
}

// Helper to resolve nationality flag emoji
function getCountryFlag(code?: string, name?: string): string {
  if (code && GLOBAL_COUNTRIES[code]?.flag) {
    return GLOBAL_COUNTRIES[code].flag;
  }
  const countryName = name || '';
  if (/مصر/.test(countryName)) return '🇪🇬';
  if (/سعودية/.test(countryName)) return '🇸🇦';
  if (/مغرب/.test(countryName)) return '🇲🇦';
  if (/تونس/.test(countryName)) return '🇹🇳';
  if (/جزائر/.test(countryName)) return '🇩🇿';
  if (/إسبانيا/.test(countryName)) return '🇪🇸';
  if (/إنجلترا/.test(countryName)) return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if (/فرنسا/.test(countryName)) return '🇫🇷';
  if (/برازيل/.test(countryName)) return '🇧🇷';
  if (/ألمانيا/.test(countryName)) return '🇩🇪';
  if (/أرجنتين/.test(countryName)) return '🇦🇷';
  if (/برتغال/.test(countryName)) return '🇵🇹';
  if (/إيطاليا/.test(countryName)) return '🇮🇹';
  if (/بلجيكا/.test(countryName)) return '🇧🇪';
  if (/هولندا/.test(countryName)) return '🇳🇱';
  if (/فلسطين/.test(countryName)) return '🇵🇸';
  if (/نيجيريا/.test(countryName)) return '🇳🇬';
  if (/غانا/.test(countryName)) return '🇬🇭';
  if (/سنغال/.test(countryName)) return '🇸🇳';
  if (/ساحل العاج/.test(countryName)) return '🇨🇮';
  if (/كاميرون/.test(countryName)) return '🇨🇲';
  return '🌐';
}

export const PlayerCard: React.FC<PlayerCardProps> = React.memo(({
  player,
  club,
  size = 'md',
  isCaptain = false,
  selected = false,
  showAttributes = true,
  showGlow = false,
  onClick,
  onDragStart,
  draggable = false,
  className = '',
}) => {
  const ovr = Math.max(40, Math.min(99, Math.round(player.overallRating || player.rating || 60)));
  const pos = player.position || 'CM';
  const flag = getCountryFlag(player.nationalityCode, player.nationality);
  const isGk = pos === 'GK' || player.positionCategory === 'GK';

  // Card Tier Styling (Bronze < 65, Silver 65-74, Gold 75-84, Elite/Platinum 85+)
  const tier = ovr >= 85 ? 'elite' : ovr >= 75 ? 'gold' : ovr >= 65 ? 'silver' : 'bronze';

  const tierStyles = {
    elite: {
      cardBg: 'bg-gradient-to-b from-sky-400/90 via-indigo-900/95 to-slate-950',
      border: 'border-cyan-300/80 shadow-[0_0_15px_rgba(56,189,248,0.35)]',
      accentText: 'text-cyan-200',
      ovrColor: 'text-cyan-300',
      divider: 'bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent',
      attrText: 'text-cyan-100',
      shine: 'from-cyan-300/20 via-white/30 to-transparent',
      badge: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200',
    },
    gold: {
      cardBg: 'bg-gradient-to-b from-amber-300/90 via-amber-800/90 to-stone-950',
      border: 'border-amber-400/70 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
      accentText: 'text-amber-200',
      ovrColor: 'text-amber-300',
      divider: 'bg-gradient-to-r from-transparent via-amber-400/60 to-transparent',
      attrText: 'text-amber-100',
      shine: 'from-amber-200/20 via-yellow-100/30 to-transparent',
      badge: 'bg-amber-500/20 border-amber-400/50 text-amber-200',
    },
    silver: {
      cardBg: 'bg-gradient-to-b from-slate-300/80 via-slate-600/90 to-slate-950',
      border: 'border-slate-300/70 shadow-[0_0_10px_rgba(203,213,225,0.25)]',
      accentText: 'text-slate-200',
      ovrColor: 'text-slate-100',
      divider: 'bg-gradient-to-r from-transparent via-slate-300/60 to-transparent',
      attrText: 'text-slate-200',
      shine: 'from-slate-200/20 via-white/20 to-transparent',
      badge: 'bg-slate-500/20 border-slate-400/50 text-slate-200',
    },
    bronze: {
      cardBg: 'bg-gradient-to-b from-amber-700/80 via-amber-900/90 to-stone-950',
      border: 'border-amber-700/60 shadow-[0_0_8px_rgba(180,83,9,0.2)]',
      accentText: 'text-amber-300',
      ovrColor: 'text-amber-400',
      divider: 'bg-gradient-to-r from-transparent via-amber-600/50 to-transparent',
      attrText: 'text-amber-200/90',
      shine: 'from-amber-500/20 via-amber-200/10 to-transparent',
      badge: 'bg-amber-800/30 border-amber-600/50 text-amber-300',
    },
  }[tier];

  // Size specifications
  const sizeConfig = {
    sm: {
      container: 'w-[114px] h-[162px] p-1.5 text-[9px]',
      ovrText: 'text-base font-black leading-none tabular-nums',
      posText: 'text-[9px] font-bold',
      avatarSize: 'sm' as const,
      avatarWrap: 'w-10 h-10',
      nameText: 'text-[10.5px] font-black tracking-tight leading-tight',
      attrGrid: 'text-[8px] gap-x-1 gap-y-0.5',
      flagSize: 'text-[11px]',
      badgeSize: 'xs' as const,
    },
    md: {
      container: 'w-[150px] h-[220px] p-2 text-xs',
      ovrText: 'text-2xl font-black leading-none tabular-nums',
      posText: 'text-xs font-bold tracking-wider',
      avatarSize: 'md' as const,
      avatarWrap: 'w-16 h-16',
      nameText: 'text-xs font-black tracking-tight leading-snug',
      attrGrid: 'text-[10px] gap-x-2 gap-y-0.5',
      flagSize: 'text-sm',
      badgeSize: 'sm' as const,
    },
    lg: {
      container: 'w-[200px] h-[290px] p-3 text-sm',
      ovrText: 'text-4xl font-black leading-none tabular-nums',
      posText: 'text-sm font-bold tracking-widest',
      avatarSize: 'lg' as const,
      avatarWrap: 'w-24 h-24',
      nameText: 'text-sm font-black tracking-tight leading-snug',
      attrGrid: 'text-xs gap-x-3 gap-y-1',
      flagSize: 'text-lg',
      badgeSize: 'md' as const,
    },
  }[size];

  const attrs = player.attributes || {
    pace: ovr,
    shooting: ovr,
    passing: ovr,
    dribbling: ovr,
    defending: ovr,
    physical: ovr,
  };

  const isInjured = Boolean(player.isInjured || (player.injury?.isInjured && player.injury.durationDays > 0));
  const isSuspended = Boolean(player.isSuspended || (player.suspensionMatches && player.suspensionMatches > 0));
  const isListed = Boolean(player.isListedForTransfer);
  const isLoan = Boolean(player.isLoanListed);

  return (
    <div
      onClick={onClick}
      onDragStart={onDragStart}
      draggable={draggable}
      dir="rtl"
      className={`relative rounded-xl border-2 cursor-pointer transition-all duration-200 select-none overflow-hidden group flex flex-col justify-between ${tierStyles.cardBg} ${tierStyles.border} ${sizeConfig.container} ${
        selected ? 'ring-2 ring-emerald-400 scale-[1.02] shadow-emerald-500/30' : 'hover:-translate-y-1 hover:shadow-lg'
      } ${showGlow ? 'shadow-[0_0_20px_rgba(245,158,11,0.35)]' : ''} ${className}`}
    >
      {/* Glossy top-down glass shine overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-tr ${tierStyles.shine} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
      />

      {/* Top Header Row */}
      <div className="flex items-start justify-between w-full relative z-10">
        {/* Left column: OVR, Position, Flag, Club Badge */}
        <div className="flex flex-col items-center leading-tight">
          <span className={`font-mono ${tierStyles.ovrColor} ${sizeConfig.ovrText}`}>
            {ovr}
          </span>
          <span className={`${tierStyles.accentText} ${sizeConfig.posText} uppercase mt-0.5`}>
            {pos}
          </span>
          <span className={`mt-0.5 ${sizeConfig.flagSize}`} title={player.nationality}>
            {flag}
          </span>
          <div className="mt-0.5">
            <ClubBadge club={club} size={sizeConfig.badgeSize} />
          </div>
        </div>

        {/* Center: Player Portrait */}
        <div className="flex-1 flex justify-center items-center px-1">
          <div className={`${sizeConfig.avatarWrap} shrink-0 relative`}>
            <PlayerAvatar
              player={player}
              clubColor={club?.primaryColor}
              clubSecondaryColor={club?.secondaryColor}
              size={sizeConfig.avatarSize}
            />
          </div>
        </div>

        {/* Right column: Status Indicators */}
        <div className="flex flex-col items-center gap-1">
          {isCaptain && (
            <span
              className="w-4 h-4 rounded-full bg-amber-400 text-stone-950 font-black text-[9px] flex items-center justify-center shadow"
              title="قائد الفريق"
            >
              C
            </span>
          )}
          {isInjured && (
            <span
              className="p-0.5 rounded-full bg-red-600 text-white shadow"
              title={`مصاب: ${player.injuryType || 'إصابة'}`}
            >
              <AlertTriangle className="w-3 h-3" />
            </span>
          )}
          {isSuspended && (
            <span
              className="p-0.5 rounded-full bg-rose-700 text-white shadow"
              title="موقوف"
            >
              <Ban className="w-3 h-3" />
            </span>
          )}
          {isListed && (
            <span
              className="p-0.5 rounded-full bg-purple-600 text-white shadow"
              title="معروض للبيع"
            >
              <Tag className="w-3 h-3" />
            </span>
          )}
          {isLoan && (
            <span
              className="p-0.5 rounded-full bg-blue-600 text-white shadow"
              title="معروض للإعارة"
            >
              <Award className="w-3 h-3" />
            </span>
          )}
          {ovr >= 85 && (
            <span className="text-yellow-400 animate-pulse" title="نجم عالمي">
              <Star className="w-3 h-3 fill-yellow-400" />
            </span>
          )}
        </div>
      </div>

      {/* Bottom Information Section */}
      <div className="w-full relative z-10 mt-1">
        {/* Player First & Second Name */}
        <div className="text-center w-full px-0.5" title={player.name}>
          <div className={`truncate text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${sizeConfig.nameText}`}>
            {formatPlayerDualName(player.name)}
          </div>
        </div>

        {/* Divider */}
        <div className={`h-[1px] w-full my-1 ${tierStyles.divider}`} />

        {/* 6 Attributes Grid */}
        {showAttributes && (
          <div className={`grid grid-cols-2 text-center font-mono ${sizeConfig.attrGrid}`}>
            {isGk ? (
              <>
                <div className="flex justify-between px-1">
                  <span className="font-bold text-slate-400">DIV</span>
                  <span className={`font-black ${tierStyles.attrText}`}>
                    {attrs.goalkeeping || ovr}
                  </span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="font-bold text-slate-400">REF</span>
                  <span className={`font-black ${tierStyles.attrText}`}>
                    {Math.min(99, Math.round(ovr * 1.02))}
                  </span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="font-bold text-slate-400">HAN</span>
                  <span className={`font-black ${tierStyles.attrText}`}>
                    {attrs.defending || Math.round(ovr * 0.95)}
                  </span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="font-bold text-slate-400">SPD</span>
                  <span className={`font-black ${tierStyles.attrText}`}>
                    {attrs.pace || 50}
                  </span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="font-bold text-slate-400">KIC</span>
                  <span className={`font-black ${tierStyles.attrText}`}>
                    {attrs.passing || 65}
                  </span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="font-bold text-slate-400">POS</span>
                  <span className={`font-black ${tierStyles.attrText}`}>
                    {attrs.physical || Math.round(ovr * 0.9)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between px-1">
                  <span className="font-bold text-slate-400">PAC</span>
                  <span className={`font-black ${tierStyles.attrText}`}>{attrs.pace}</span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="font-bold text-slate-400">DRI</span>
                  <span className={`font-black ${tierStyles.attrText}`}>{attrs.dribbling}</span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="font-bold text-slate-400">SHO</span>
                  <span className={`font-black ${tierStyles.attrText}`}>{attrs.shooting}</span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="font-bold text-slate-400">DEF</span>
                  <span className={`font-black ${tierStyles.attrText}`}>{attrs.defending}</span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="font-bold text-slate-400">PAS</span>
                  <span className={`font-black ${tierStyles.attrText}`}>{attrs.passing}</span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="font-bold text-slate-400">PHY</span>
                  <span className={`font-black ${tierStyles.attrText}`}>{attrs.physical}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.player.id === next.player.id &&
    prev.player.overallRating === next.player.overallRating &&
    prev.player.rating === next.player.rating &&
    prev.player.isInjured === next.player.isInjured &&
    prev.player.isSuspended === next.player.isSuspended &&
    prev.player.isListedForTransfer === next.player.isListedForTransfer &&
    prev.player.isLoanListed === next.player.isLoanListed &&
    prev.player.photoUrl === next.player.photoUrl &&
    prev.isCaptain === next.isCaptain &&
    prev.selected === next.selected &&
    prev.size === next.size &&
    prev.club?.id === next.club?.id
  );
});

PlayerCard.displayName = 'PlayerCard';
