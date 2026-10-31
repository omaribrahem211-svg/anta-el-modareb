import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Player, Club, ActiveNegotiation } from '../types/game';
import {
  DollarSign,
  UserPlus,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Building2,
  Eye,
  Briefcase,
  Check,
  AlertCircle,
  Clock,
  AlertTriangle,
  Flame,
  Newspaper,
  X,
  ArrowUpDown,
  Sparkles,
  TrendingUp,
  Wallet,
  Compass,
  Tag,
  Globe2,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { NegotiationModal } from './NegotiationModal';
import { GLOBAL_LEAGUES, getCustomLeagues } from '../data/leaguesData';
import { calibrateRealisticPlayerRating } from '../utils/playerGenerator';
import { loadWorldStateFromDb } from '../utils/storage/indexedDbStorage';
import { PlayerAvatar } from './PlayerAvatar';
import { ClubBadge } from './ClubBadge';
import {
  calculateClubMonthlyIncome,
  calculateClubTotalMonthlyWages,
} from '../services/economyService';

export interface TransferRumor {
  id: string;
  headline: string;
  details: string;
  playerName: string;
  playerPosition: string;
  playerOverall: number;
  playerAge: number;
  currentClubName: string;
  interestedClubName: string;
  probability: number;
  source: string;
  category: 'mega_deal' | 'negotiation' | 'release_clause' | 'contract_dispute' | 'swap';
}

const RUMOR_SOURCES = [
  'شبكة سكاي سبورتس الميركاتو',
  'صحيفة الماركا الرياضية',
  'فابريزيو رومانو - Here We Go',
  'كووورة إنسايدر',
  'بي إن سبورتس الإخبارية',
  'ليكيب الفرنسية',
];

function generateTransferRumors(teams: Club[], currentDate: string, seedOffset = 0): TransferRumor[] {
  const validClubs = (teams || []).filter(c => c && Array.isArray(c.players) && c.players.length > 0);
  if (validClubs.length < 2) return [];

  const starPool: { player: Player; club: Club }[] = [];
  for (let i = 0; i < validClubs.length; i++) {
    const club = validClubs[i];
    for (let j = 0; j < club.players.length; j++) {
      const rawP = club.players[j];
      if (!rawP) continue;
      const p = calibrateRealisticPlayerRating(rawP, club.id, club.leagueId, club.reputation || 65);
      if (p && p.overallRating >= 68) {
        starPool.push({ player: p, club });
      }
    }
  }

  const pool =
    starPool.length >= 8
      ? starPool
      : validClubs.flatMap(c =>
          c.players.map(p => ({
            player: calibrateRealisticPlayerRating(p, c.id, c.leagueId, c.reputation || 65),
            club: c,
          }))
        );
  if (pool.length === 0) return [];

  const dateHash =
    (currentDate || '2026-08-01').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + seedOffset * 37;

  const categories: TransferRumor['category'][] = [
    'mega_deal',
    'negotiation',
    'release_clause',
    'contract_dispute',
    'swap',
  ];

  const rumors: TransferRumor[] = [];
  const count = Math.min(8, pool.length);

  for (let i = 0; i < count; i++) {
    const idx = (dateHash * (i + 3) + i * 19) % pool.length;
    const target = pool[idx];
    const buyerIdx = (idx + 5 + i * 7 + seedOffset) % validClubs.length;
    const buyerClub =
      validClubs[buyerIdx].id === target.club.id
        ? validClubs[(buyerIdx + 1) % validClubs.length]
        : validClubs[buyerIdx];

    const category = categories[(dateHash + i) % categories.length];
    const source = RUMOR_SOURCES[(dateHash + i * 2) % RUMOR_SOURCES.length];
    const probability = 40 + ((dateHash + i * 13) % 52);
    const estFee = formatCompactCurrency(Math.round((target.player.marketValue || 400000) * 1.15));

    let headline = '';
    let details = '';

    if (category === 'mega_deal') {
      headline = `${buyerClub.name} يجهز عرضاً بقيمة ${estFee} لضم ${target.player.name}`;
      details = `كشفت مصادر مقربة من إدارة ${buyerClub.name} عن رصد ميزانية خاصة لحسم صفقة ${target.player.name} من صفوف ${target.club.name} خلال نافذة الانتقالات الحالية.`;
    } else if (category === 'release_clause') {
      headline = `تحرك مفاجئ من ${buyerClub.name} لكسر الشرط الجزائي في عقد ${target.player.name}`;
      details = `يدرس مسؤولو ${buyerClub.name} دفع قيمة الشرط الجزائي البالغة ${estFee} للتوقيع الفوري مع ${target.player.name} دون الدخول في مفاوضات مطولة مع ${target.club.name}.`;
    } else if (category === 'contract_dispute') {
      headline = `تعثر تجديد عقد ${target.player.name} مع ${target.club.name} يفتح الباب أمام ${buyerClub.name}`;
      details = `دخلت المفاوضات بين وكيل أعمال ${target.player.name} وإدارة ${target.club.name} مرحلة معقدة، ما دفع ${buyerClub.name} للتأهب لتقديم عرض رسمي.`;
    } else if (category === 'swap') {
      headline = `${buyerClub.name} يعرض صفقة تبادلية ومبلغاً مالياً لإقناع ${target.club.name} بالتخلي عن ${target.player.name}`;
      details = `تسعى إدارة ${buyerClub.name} لتخفيض التكلفة النقدية للصفقة عبر إدراج أحد لاعبيها في العرض المقدم لنادي ${target.club.name}.`;
    } else {
      headline = `اجتماع سري بين وكيل ${target.player.name} والمدير الرياضي لنادي ${buyerClub.name}`;
      details = `رصدت الصحافة الرياضية اجتماعاً مغلقاً لمناقشة الشروط الشخصية لانتقال ${target.player.name} (${target.player.overallRating} OVR) إلى ${buyerClub.name}.`;
    }

    rumors.push({
      id: `rumor_${i}_${target.player.id}_${seedOffset}`,
      headline,
      details,
      playerName: target.player.name,
      playerPosition: target.player.position,
      playerOverall: target.player.overallRating,
      playerAge: target.player.age,
      currentClubName: target.club.name,
      interestedClubName: buyerClub.name,
      probability,
      source,
      category,
    });
  }

  return rumors;
}

interface TransfersTabProps {
  players?: Player[];
  budget?: number;
  onBuyPlayer?: (player: Player) => void;
  onSelectPlayer: (player: Player) => void;
}

type PositionCategory = 'GK' | 'DEF' | 'MID' | 'FWD';
type ScoutingPreset = 'all' | 'affordable' | 'arab_players' | 'u22_wonderkids' | 'bargains';

const POSITION_CATEGORY_MAP: Record<string, PositionCategory> = {
  GK: 'GK',
  CB: 'DEF',
  RB: 'DEF',
  LB: 'DEF',
  RWB: 'DEF',
  LWB: 'DEF',
  CDM: 'MID',
  CM: 'MID',
  CAM: 'MID',
  RM: 'MID',
  LM: 'MID',
  RW: 'FWD',
  LW: 'FWD',
  CF: 'FWD',
  ST: 'FWD',
};

const NATIONALITY_FLAGS: Record<string, string> = {
  EGY: '🇪🇬',
  SAU: '🇸🇦',
  KSA: '🇸🇦',
  UAE: '🇦🇪',
  QAT: '🇶🇦',
  MAR: '🇲🇦',
  TUN: '🇹🇳',
  ALG: '🇩🇿',
  PLE: '🇵🇸',
  ESP: '🇪🇸',
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  FRA: '🇫🇷',
  ITA: '🇮🇹',
  GER: '🇩🇪',
  BRA: '🇧🇷',
  ARG: '🇦🇷',
  POR: '🇵🇹',
  BEL: '🇧🇪',
  NED: '🇳🇱',
};

const ARAB_NAT_CODES = new Set([
  'EGY', 'SAU', 'KSA', 'UAE', 'QAT', 'MAR', 'TUN', 'ALG',
  'PLE', 'JOR', 'IRQ', 'SYR', 'LBN', 'LBY', 'SDN', 'KUW', 'BHR', 'OMA', 'YEM',
]);

/**
 * Compact currency formatter to prevent text collision in headers & cards
 */
export function formatCompactCurrency(amount: number, includeSuffix = true): string {
  const safe = Number(amount) || 0;
  const abs = Math.abs(safe);
  const sign = safe < 0 ? '-' : '';
  let formatted = '';

  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000;
    formatted = `${sign}${val >= 10 ? val.toFixed(1) : val.toFixed(2).replace(/\.00$/, '')}B`;
  } else if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    formatted = `${sign}${val >= 100 ? Math.round(val) : val.toFixed(1).replace(/\.0$/, '')}M`;
  } else if (abs >= 1_000) {
    const val = abs / 1_000;
    formatted = `${sign}${val >= 100 ? Math.round(val) : val.toFixed(1).replace(/\.0$/, '')}K`;
  } else {
    formatted = `${sign}${Math.round(abs)}`;
  }

  return includeSuffix ? `${formatted} ج.م` : formatted;
}

export interface MarketPlayerItem {
  player: Player;
  club: Club | null;
  clubName: string;
  leagueId: string;
  leagueName: string;
  isUserClubPlayer: boolean;
  isArabPlayer: boolean;
  posCategory: PositionCategory;
  askingPrice: number;
  statusLabel: string;
  statusType: 'listed' | 'expiring' | 'free' | 'star' | 'contract';
}

const VIRTUAL_CARD_HEIGHT = 158;
const VIRTUAL_CARD_GAP = 10;
const VIRTUAL_ROW_STRIDE = VIRTUAL_CARD_HEIGHT + VIRTUAL_CARD_GAP;
const VIRTUAL_VIEWPORT_HEIGHT = 560;
const VIRTUAL_OVERSCAN = 2;

interface MarketPlayerCardProps {
  item: MarketPlayerItem;
  clubBudget: number;
  remainingWageBudget: number;
  hasUserClub: boolean;
  onSelectPlayer: (player: Player) => void;
  onStartNegotiation: (player: Player) => void;
  onDirectBuy: (player: Player, price: number) => void;
}

// Lazy realistic rating calibration cache (Map keyed by player.id) to prevent freezing low-end mobile CPUs
const playerCalibrationCache = new Map<string, Player>();

/**
 * Redesigned Scouting Dossier Player Card
 * - Color-coded realistic OVR tier shield (Gold 80+, Emerald 72-79, Cyan 65-71, Bronze <65)
 * - 6-Attribute visual scouting strip (PAC, SHO, PAS, DRI, DEF, PHY)
 * - Zero heavy box-shadows or backdrop blurs for locked 60 FPS mobile scrolling
 */
const MarketPlayerCard = React.memo<MarketPlayerCardProps>(
  ({
    item,
    clubBudget,
    remainingWageBudget,
    hasUserClub,
    onSelectPlayer,
    onStartNegotiation,
    onDirectBuy,
  }) => {
    const { isUserClubPlayer } = item;

    // Lazily calibrate rating ONLY for visible cards in the virtual viewport, invalidating cache if rating or marketValue changed
    const player = useMemo(() => {
      const raw = item.player;
      if (!raw || !raw.id) return raw;
      const isFree = item.statusType === 'free';
      const resolvedClubName = isFree ? 'لاعب حر' : (item.club?.name || item.clubName || 'نادٍ محترف');
      const resolvedClubId = isFree ? '' : (item.club?.id || raw.currentClubId || '');

      const cached = playerCalibrationCache.get(raw.id);
      const baseCalibrated =
        cached &&
        cached.overallRating === raw.overallRating &&
        cached.marketValue === raw.marketValue
          ? cached
          : (() => {
              const calibrated = isFree
                ? calibrateRealisticPlayerRating(raw, '', 'free_agents', 50)
                : calibrateRealisticPlayerRating(raw, resolvedClubId, item.leagueId, item.club?.reputation || 65);
              const merged: Player =
                raw.overallRating > calibrated.overallRating || (raw.marketValue || 0) > (calibrated.marketValue || 0)
                  ? {
                      ...calibrated,
                      overallRating: Math.max(raw.overallRating, calibrated.overallRating),
                      potentialRating: Math.max(raw.potentialRating || 0, calibrated.potentialRating || 0),
                      marketValue: Math.max(raw.marketValue || 0, calibrated.marketValue || 0),
                      attributes: raw.attributes || calibrated.attributes,
                    }
                  : calibrated;
              playerCalibrationCache.set(raw.id, merged);
              return merged;
            })();

      const cardPrice = isFree ? 0 : (item.askingPrice || baseCalibrated.marketValue || 50000);
      const cardSalary = baseCalibrated.salary || raw.salary || 2500;
      const cardOvr = baseCalibrated.overallRating || raw.overallRating || 65;

      return {
        ...baseCalibrated,
        name: baseCalibrated.name || raw.name || 'لاعب محترف',
        overallRating: cardOvr,
        age: baseCalibrated.age || raw.age || 24,
        salary: cardSalary,
        marketValue: isFree ? (baseCalibrated.marketValue || 50000) : cardPrice,
        currentClubId: resolvedClubId,
        isFreeAgent: isFree,
        contractYears: isFree ? 0 : Math.max(1, raw.contractYears ?? baseCalibrated.contractYears ?? 2),
        ...({
          rating: cardOvr,
          club: resolvedClubName,
          currentClubName: resolvedClubName,
          price: cardPrice,
          askingPrice: cardPrice,
          contractType: isFree ? 'free' : 'club',
        } as any),
      } as Player;
    }, [item.player, item.club?.id, item.club?.name, item.clubName, item.leagueId, item.club?.reputation, item.statusType, item.askingPrice]);

    const safeClubName = item.statusType === 'free' ? 'لاعب حر' : (item.club?.name || item.clubName || 'نادٍ محترف');
    const effectiveAskingPrice = item.statusType === 'free' ? 0 : (item.askingPrice || player.marketValue || 50000);
    const effectiveSalary = player.salary || 2500;

    const isAffordableFee = hasUserClub && clubBudget >= effectiveAskingPrice;
    const isAffordableWage = hasUserClub && remainingWageBudget >= effectiveSalary;
    const canDirectBuy = Boolean(hasUserClub && isAffordableFee && isAffordableWage);

    const flag = NATIONALITY_FLAGS[player.nationalityCode || ''] || '🌐';
    const ovr = player.overallRating;
    const pot = player.potentialRating || ovr;

    // Visual Rating Tier Styling (Realistic Scale)
    const ratingTier =
      ovr >= 80
        ? {
            box: 'bg-gradient-to-b from-amber-500/20 to-amber-950/40 border-amber-400/50 text-amber-300',
            accent: '#f59e0b',
            tierLabel: 'نخبة',
          }
        : ovr >= 72
        ? {
            box: 'bg-gradient-to-b from-emerald-500/20 to-emerald-950/40 border-emerald-400/50 text-emerald-300',
            accent: '#10b981',
            tierLabel: 'ممتاز',
          }
        : ovr >= 65
        ? {
            box: 'bg-gradient-to-b from-cyan-500/20 to-cyan-950/40 border-cyan-400/40 text-cyan-300',
            accent: '#06b6d4',
            tierLabel: 'محترف',
          }
        : {
            box: 'bg-slate-900 border-slate-700 text-slate-300',
            accent: '#64748b',
            tierLabel: 'عادي',
          };

    const posColor =
      item.posCategory === 'GK'
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        : item.posCategory === 'DEF'
        ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
        : item.posCategory === 'MID'
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        : 'bg-rose-500/20 text-rose-300 border-rose-500/30';

    const attrs = player.attributes || {
      pace: 62,
      shooting: 58,
      passing: 60,
      dribbling: 60,
      defending: 55,
      physical: 62,
    };

    const getStatColor = (val: number) =>
      val >= 75 ? 'text-emerald-400' : val >= 66 ? 'text-cyan-300' : 'text-slate-300';

    return (
      <div
        style={{
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
        className="w-full bg-[#0b111e] hover:border-emerald-500/35 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 select-none relative transition-colors"
      >
        {/* Right Accent Strip */}
        <div
          className="absolute top-2 right-0 bottom-2 w-1 rounded-l-full"
          style={{ backgroundColor: item.club?.primaryColor || ratingTier.accent }}
        />

        {/* Row 1: Rating Shield & Avatar + Identity Dossier + Valuation Tag */}
        <div className="flex items-start justify-between gap-2.5 pr-1.5 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Avatar & OVR Badge */}
            <div
              onClick={() => onSelectPlayer(player)}
              className="flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <PlayerAvatar
                player={player}
                primaryColor={item.club?.primaryColor}
                secondaryColor={item.club?.secondaryColor}
                size="sm"
              />
              <div
                className={`w-[46px] h-[52px] rounded-xl border flex flex-col items-center justify-center shrink-0 ${ratingTier.box}`}
              >
                <span className="text-sm font-black font-mono leading-none tabular-nums text-white">
                  {ovr}
                </span>
                <div className="flex items-center gap-0.5 mt-1">
                  <span className={`text-[8px] font-black font-mono px-1 rounded border ${posColor}`}>
                    {player.position}
                  </span>
                  {pot > ovr && (
                    <span className="text-[7px] font-mono font-bold text-emerald-400" title={`الإمكانية المستقبلية: ${pot}`}>
                      ↑{pot}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Player Identity & Club Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => onSelectPlayer(player)}
                  className="font-black text-xs sm:text-sm text-white hover:text-emerald-400 text-right cursor-pointer leading-snug"
                  title={`عرض بطاقة اللاعب الكاملة: ${player.name || 'اسم اللاعب'}`}
                >
                  {player.name || 'اسم اللاعب'}
                </button>
                {player.nickname && (
                  <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/25 shrink-0">
                    «{player.nickname}»
                  </span>
                )}
                <span className="text-[10px] text-slate-300 bg-slate-950/90 px-1.5 py-0.5 rounded-md border border-white/[0.06] shrink-0 font-medium">
                  {flag} {player.nationality || 'مصر'}
                </span>
                {item.statusType !== 'contract' && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                      item.statusType === 'listed'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : item.statusType === 'free'
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : item.statusType === 'expiring'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                    }`}
                  >
                    {item.statusLabel}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 min-w-0 flex-wrap">
                <span className="flex items-center gap-1 text-slate-200 font-semibold">
                  <ClubBadge club={item.club || { name: safeClubName, primaryColor: item.club?.primaryColor }} size="xs" />
                  <span>{safeClubName}</span>
                </span>
                <span className="text-slate-600 shrink-0">•</span>
                <span className="text-slate-400">{item.leagueName}</span>
                <span className="text-slate-600 shrink-0">•</span>
                <span className="shrink-0 font-mono tabular-nums text-slate-300">
                  <span dir="ltr" className="inline-block">{player.age || 24}</span> عاماً
                </span>
              </div>
            </div>
          </div>

          {/* Asking Price & Valuation Box */}
          <div className="bg-slate-950/90 border border-white/[0.08] rounded-xl px-3 py-1.5 text-left shrink-0 flex flex-col justify-center min-w-[96px]">
            <div className="text-[9px] text-slate-400 font-semibold leading-none text-right">السعر المطلوب:</div>
            <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono tabular-nums leading-tight mt-0.5 text-right">
              {item.statusType !== 'free' && effectiveAskingPrice > 0 ? (
                <span dir="ltr" className="inline-block">{formatCompactCurrency(effectiveAskingPrice)}</span>
              ) : (
                'انتقال حر'
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono tabular-nums mt-1 leading-none text-right">
              الراتب:{' '}
              <span dir="ltr" className="inline-block text-cyan-300 font-bold">
                {formatCompactCurrency(effectiveSalary, false)}/ش
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Full-Width 6-Attribute Visual Scouting Strip */}
        <div className="w-full grid grid-cols-6 gap-1.5 bg-slate-950/85 rounded-xl px-2 py-1.5 border border-white/[0.06] text-center pr-1.5">
          <div>
            <span className="text-[9px] text-slate-400 block leading-none mb-0.5">سرعة</span>
            <span className={`text-xs font-black font-mono tabular-nums ${getStatColor(attrs.pace)}`}>
              {attrs.pace}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 block leading-none mb-0.5">تسديد</span>
            <span className={`text-xs font-black font-mono tabular-nums ${getStatColor(attrs.shooting)}`}>
              {attrs.shooting}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 block leading-none mb-0.5">تمرير</span>
            <span className={`text-xs font-black font-mono tabular-nums ${getStatColor(attrs.passing)}`}>
              {attrs.passing}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 block leading-none mb-0.5">مراوغة</span>
            <span className={`text-xs font-black font-mono tabular-nums ${getStatColor(attrs.dribbling || 60)}`}>
              {attrs.dribbling || 60}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 block leading-none mb-0.5">دفاع</span>
            <span className={`text-xs font-black font-mono tabular-nums ${getStatColor(attrs.defending)}`}>
              {attrs.defending}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 block leading-none mb-0.5">بدني</span>
            <span className={`text-xs font-black font-mono tabular-nums ${getStatColor(attrs.physical || 62)}`}>
              {attrs.physical || 62}
            </span>
          </div>
        </div>

        {/* Row 3: Unclipped Action Buttons Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.07] pr-1.5">
          <button
            type="button"
            onClick={() => onSelectPlayer(player)}
            title="ملف اللاعب الكامل"
            className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-white/[0.08] flex items-center justify-center gap-1.5 text-xs font-bold shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>ملف اللاعب</span>
          </button>

          {isUserClubPlayer ? (
            <div className="flex-1 bg-slate-950 text-slate-400 text-xs py-2 rounded-xl font-bold border border-white/[0.06] flex items-center justify-center px-3">
              ضمن قائمة فريقك الحالية
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 justify-end">
              <button
                type="button"
                onClick={() => onStartNegotiation(player)}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
              >
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                <span>تفاوض</span>
              </button>

              <button
                type="button"
                onClick={() => canDirectBuy && onDirectBuy(player, effectiveAskingPrice)}
                disabled={!canDirectBuy}
                title={
                  !hasUserClub
                    ? 'يجب تولي تدريب نادٍ'
                    : !isAffordableFee
                    ? `الميزانية لا تكفي (${formatCompactCurrency(clubBudget)} / ${formatCompactCurrency(effectiveAskingPrice)})`
                    : !isAffordableWage
                    ? 'يتجاوز سقف الرواتب المتاح'
                    : 'شراء مباشر بالسعر المطلوب'
                }
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform ${
                  canDirectBuy
                    ? 'bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 active:scale-95 cursor-pointer'
                    : 'bg-slate-950/80 text-slate-500 border border-white/[0.05] cursor-not-allowed opacity-70'
                }`}
              >
                {canDirectBuy ? (
                  <>
                    <UserPlus className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.statusType === 'free' || effectiveAskingPrice <= 0 ? 'توقيع حر' : 'شراء مباشر'}</span>
                  </>
                ) : (
                  <span>{!isAffordableFee ? 'الميزانية لا تكفي' : 'يتجاوز الرواتب'}</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.item.player.id === nextProps.item.player.id &&
    prevProps.item.askingPrice === nextProps.item.askingPrice &&
    prevProps.item.statusType === nextProps.item.statusType &&
    prevProps.item.isUserClubPlayer === nextProps.item.isUserClubPlayer &&
    prevProps.clubBudget === nextProps.clubBudget &&
    prevProps.remainingWageBudget === nextProps.remainingWageBudget
);

MarketPlayerCard.displayName = 'MarketPlayerCard';

export const TransfersTab: React.FC<TransfersTabProps> = ({
  players,
  budget,
  onBuyPlayer,
  onSelectPlayer,
}) => {
  const {
    userClub,
    teams,
    transferMarket,
    season,
    sellPlayer,
    buyPlayer,
    activeNegotiations,
    startPlayerNegotiation,
    respondToNegotiationOffer,
    cancelNegotiation,
    listPlayerForTransfer,
    acceptSellNegotiation,
    rejectSellNegotiation,
    acceptIncomingBid,
    rejectIncomingBid,
    incomingBids,
    calendarDate,
  } = useGame();

  const currentDate = calendarDate?.rawDateStr || '2026-08-01';

  const [activeTabMode, setActiveTabMode] = useState<'buy' | 'rumors' | 'negotiations' | 'sell'>('buy');
  const [scoutingPreset, setScoutingPreset] = useState<ScoutingPreset>('all');
  const [rumorFeedSeed, setRumorFeedSeed] = useState<number>(0);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Progressive background loading state for world clubs
  const [externalDbPlayers, setExternalDbPlayers] = useState<MarketPlayerItem[]>([]);
  const [isLoadingWorld, setIsLoadingWorld] = useState<boolean>(false);
  const [transferCounter, setTransferCounter] = useState<number>(0);

  // Negotiation Modal State
  const [negotiatingPlayer, setNegotiatingPlayer] = useState<Player | null>(null);
  const [selectedNegotiation, setSelectedNegotiation] = useState<ActiveNegotiation | null>(null);
  const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState(false);

  // Filter States: Default to user's league if available, otherwise 'ALL'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<string>(() => userClub?.leagueId || 'ALL');
  const [selectedClub, setSelectedClub] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<PositionCategory | 'ALL'>('ALL');
  const [selectedExactPos, setSelectedExactPos] = useState<string>('ALL');
  const [selectedNationality, setSelectedNationality] = useState<string>('ALL');
  const [minAge, setMinAge] = useState<number | ''>(15);
  const [maxAge, setMaxAge] = useState<number | ''>(45);
  const [minOverall, setMinOverall] = useState<number | ''>(40);
  const [maxOverall, setMaxOverall] = useState<number | ''>(99);
  const [sortBy, setSortBy] = useState<'overall' | 'value' | 'salary' | 'age' | 'name'>('overall');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Progressive batch rendering state for flexible-height player cards
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [visibleCardCount, setVisibleCardCount] = useState<number>(30);
  const [boughtPlayerIds, setBoughtPlayerIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase());
    }, 120);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setVisibleCardCount(30);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [
    scoutingPreset,
    debouncedSearch,
    selectedLeague,
    selectedClub,
    selectedCategory,
    selectedExactPos,
    selectedNationality,
    minAge,
    maxAge,
    minOverall,
    maxOverall,
    sortBy,
    sortOrder,
  ]);

  const handleListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 420) {
        setVisibleCardCount(prev => prev + 30);
      }
    },
    []
  );

  const currentWageBill = userClub ? calculateClubTotalMonthlyWages(userClub) : 0;
  const wageBudget = userClub ? calculateClubMonthlyIncome(userClub) : 500000;
  const remainingWageBudget = Math.max(0, wageBudget - currentWageBill);
  const wageUsagePercent = Math.min(100, Math.round((currentWageBill / Math.max(1, wageBudget)) * 100));
  const clubTransferBudget = userClub ? userClub.budget : (budget || 500000);

  // Stable cache key for local league + free agents
  const refreshKey = `${userClub?.id || ''}_${userClub?.players?.length || 0}_${season?.seasonNumber || 1}_${transferCounter}_${(teams || []).length}_${(transferMarket || []).length}`;
  // Separate key for external world clubs so buying/selling does not reload the entire world from scratch
  const worldLoadKey = `${userClub?.id || ''}_${season?.seasonNumber || 1}_${(teams || []).length}`;

  const leagueNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.values(GLOBAL_LEAGUES).forEach(comp => {
      map[comp.id] = comp.name;
    });
    try {
      const custom = getCustomLeagues();
      Object.values(custom).forEach(comp => {
        if (comp && comp.id && comp.name) {
          map[comp.id] = comp.name;
        }
      });
    } catch {}
    return map;
  }, []);

  // 1. Initial immediate batch: Local active teams + Free agents (transferMarket + players prop)
  const localDbPlayers = useMemo<MarketPlayerItem[]>(() => {
    const list: MarketPlayerItem[] = [];
    const seenIds = new Set<string>();

    (teams || []).forEach(club => {
      if (!club || !Array.isArray(club.players)) return;
      const isUserClub = Boolean(userClub && club.id === userClub.id);
      const lId = club.leagueId || userClub?.leagueId || 'other';
      const lName = leagueNameMap[lId] || 'دوري محلي';

      club.players.forEach(rawP => {
        if (!rawP || !rawP.id || seenIds.has(rawP.id)) return;
        seenIds.add(rawP.id);

        const posCat = POSITION_CATEGORY_MAP[rawP.position] || 'MID';
        const isArab =
          ARAB_NAT_CODES.has(String(rawP.nationalityCode || '').toUpperCase()) ||
          /^(egy|sau|mar|tun|alg|uae|qat)_/.test(lId);

        let priceMultiplier = 1.0;
        let statusLabel = 'تحت العقد';
        let statusType: MarketPlayerItem['statusType'] = 'contract';

        if (rawP.isListedForTransfer) {
          priceMultiplier = 0.85;
          statusLabel = 'معروض للبيع';
          statusType = 'listed';
        } else if ((rawP.contractYears || 2) <= 1) {
          priceMultiplier = 0.75;
          statusLabel = 'عقد ينتهي';
          statusType = 'expiring';
        } else if ((rawP.overallRating || (rawP as any).rating || 65) >= 78) {
          priceMultiplier = 1.2;
          statusLabel = 'نجم بارز';
          statusType = 'star';
        }

        const askingPrice = Math.round((rawP.marketValue || 50000) * priceMultiplier);

        list.push({
          player: rawP,
          club,
          clubName: club.name,
          leagueId: lId,
          leagueName: lName,
          isUserClubPlayer: isUserClub,
          isArabPlayer: isArab,
          posCategory: posCat,
          askingPrice,
          statusLabel,
          statusType,
        });
      });
    });

    // Free agents: transferMarket from useGame() + players prop (deduplicated by id)
    const freePool = [...(transferMarket || []), ...(players || [])];
    freePool.forEach(rawP => {
      if (!rawP || !rawP.id || seenIds.has(rawP.id)) return;
      seenIds.add(rawP.id);

      const posCat = POSITION_CATEGORY_MAP[rawP.position] || 'MID';
      const isArab = ARAB_NAT_CODES.has(String(rawP.nationalityCode || '').toUpperCase());

      list.push({
        player: rawP,
        club: null,
        clubName: (rawP as any).clubName || 'لاعب حر',
        leagueId: 'free_agents',
        leagueName: 'سوق اللاعبين الأحرار',
        isUserClubPlayer: false,
        isArabPlayer: isArab,
        posCategory: posCat,
        askingPrice: 0,
        statusLabel: 'وكيل حر',
        statusType: 'free',
      });
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // 2. Background progressive batch loading for world clubs (500 players / chunk)
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingWorld(true);

    const startWorldLoading = async () => {
      // 1. Build a single Map<clubId, Club> once from persisted WorldState (IndexedDB) + custom leagues
      const worldClubMap = new Map<string, Club>();

      try {
        const custom = getCustomLeagues();
        Object.values(custom).forEach(league => {
          (league?.teams || []).forEach(c => {
            if (c && c.id && !worldClubMap.has(c.id)) {
              worldClubMap.set(c.id, c);
            }
          });
        });
      } catch {}

      try {
        const savedWorldState = await loadWorldStateFromDb();
        if (isCancelled) return;
        if (savedWorldState && savedWorldState.teams && typeof savedWorldState.teams === 'object') {
          const playersByClub = new Map<string, Player[]>();
          if (savedWorldState.players && typeof savedWorldState.players === 'object') {
            Object.values(savedWorldState.players).forEach(p => {
              if (!p || !p.id || !p.currentClubId) return;
              const list = playersByClub.get(p.currentClubId);
              const mappedPlayer: Player = { ...p };
              if (list) {
                list.push(mappedPlayer);
              } else {
                playersByClub.set(p.currentClubId, [mappedPlayer]);
              }
            });
          }

          Object.entries(savedWorldState.teams).forEach(([clubId, wTeam]) => {
            if (!wTeam || !clubId) return;
            const existingFallback = worldClubMap.get(clubId);
            const clubPlayers =
              playersByClub.get(clubId) ||
              (Array.isArray((wTeam as any).players) ? (wTeam as any).players : existingFallback?.players || []);
            const clubObj: Club = {
              ...(existingFallback || ({} as Club)),
              id: wTeam.id || clubId,
              name: wTeam.name || existingFallback?.name || clubId,
              shortName: wTeam.shortName || existingFallback?.shortName || wTeam.name || clubId,
              city: wTeam.city || existingFallback?.city || '',
              country: wTeam.country || existingFallback?.country,
              countryCode: wTeam.countryCode || existingFallback?.countryCode,
              division: wTeam.division ?? existingFallback?.division ?? 1,
              leagueId: wTeam.currentLeagueId || existingFallback?.leagueId || 'other',
              reputation: wTeam.reputation ?? existingFallback?.reputation ?? 65,
              budget: wTeam.budget ?? existingFallback?.budget ?? 250000,
              transferBudget: wTeam.transferBudget ?? wTeam.budget ?? existingFallback?.transferBudget ?? 250000,
              wageBudgetMonthly: wTeam.wageBudgetMonthly ?? existingFallback?.wageBudgetMonthly ?? 30000,
              primaryColor: wTeam.primaryColor || existingFallback?.primaryColor || '#10b981',
              secondaryColor: wTeam.secondaryColor || existingFallback?.secondaryColor || '#0f172a',
              facilities: wTeam.facilities || existingFallback?.facilities,
              sponsors: wTeam.sponsors || existingFallback?.sponsors || [],
              isUserClub: clubId === savedWorldState.userCurrentTeamId,
              players: clubPlayers,
              tactics: wTeam.tactics || existingFallback?.tactics,
              staff: wTeam.staff || existingFallback?.staff,
              manager: wTeam.manager || existingFallback?.manager,
            };
            worldClubMap.set(clubId, clubObj);
          });
        }
      } catch {
        // Fallback silently to custom/static data if IndexedDB read fails
      }

      if (isCancelled) return;

      const localClubIdSet = new Set((teams || []).map(c => c && c.id).filter(Boolean));
      const seenIds = new Set<string>();
      (teams || []).forEach(c => {
        (c?.players || []).forEach(p => {
          if (p?.id) seenIds.add(p.id);
        });
      });
      if (userClub?.players) {
        userClub.players.forEach(p => {
          if (p?.id) seenIds.add(p.id);
        });
      }
      localDbPlayers.forEach(item => {
        if (item.player?.id) seenIds.add(item.player.id);
      });

      const seenClubIds = new Set<string>(localClubIdSet as Set<string>);
      const externalClubEntries: { club: Club; leagueId: string; leagueName: string }[] = [];

      // Add clubs from worldClubMap first (persisted WorldState + custom leagues)
      worldClubMap.forEach((liveClub, clubId) => {
        if (liveClub && clubId && !seenClubIds.has(clubId)) {
          seenClubIds.add(clubId);
          const lId = liveClub.leagueId || 'other';
          externalClubEntries.push({
            club: liveClub,
            leagueId: lId,
            leagueName: leagueNameMap[lId] || 'دوري عالمي',
          });
        }
      });

      // Fallback to static GLOBAL_LEAGUES for any club not in worldClubMap
      Object.values(GLOBAL_LEAGUES).forEach(league => {
        (league?.teams || []).forEach(c => {
          if (c && c.id && !seenClubIds.has(c.id)) {
            seenClubIds.add(c.id);
            const liveClub = worldClubMap.get(c.id) || c;
            const lId = liveClub.leagueId || league.id || c.leagueId || 'other';
            externalClubEntries.push({
              club: liveClub,
              leagueId: lId,
              leagueName: leagueNameMap[lId] || league.name || 'دوري عالمي',
            });
          }
        });
      });

      // Flatten raw player entries for progressive chunking
      const rawQueue: { rawP: Player; club: Club; leagueId: string; leagueName: string }[] = [];

      externalClubEntries.forEach(({ club, leagueId, leagueName }) => {
        (club.players || []).forEach(rawP => {
          if (rawP && rawP.id && !seenIds.has(rawP.id)) {
            seenIds.add(rawP.id);
            rawQueue.push({ rawP, club, leagueId, leagueName });
          }
        });
      });

      if (rawQueue.length === 0) {
        setExternalDbPlayers([]);
        setIsLoadingWorld(false);
        return;
      }

      const CHUNK_SIZE = 500;
      let currentIndex = 0;
      let chunkCount = 0;
      const accumulated: MarketPlayerItem[] = [];

      const processNextChunk = () => {
        if (isCancelled) return;
        const end = Math.min(currentIndex + CHUNK_SIZE, rawQueue.length);
        for (let i = currentIndex; i < end; i++) {
          const { rawP, club, leagueId, leagueName } = rawQueue[i];
          const posCat = POSITION_CATEGORY_MAP[rawP.position] || 'MID';
          const isArab =
            ARAB_NAT_CODES.has(String(rawP.nationalityCode || '').toUpperCase()) ||
            /^(egy|sau|mar|tun|alg|uae|qat)_/.test(leagueId);

          let priceMultiplier = 1.0;
          let statusLabel = 'تحت العقد';
          let statusType: MarketPlayerItem['statusType'] = 'contract';

          if (rawP.isListedForTransfer) {
            priceMultiplier = 0.85;
            statusLabel = 'معروض للبيع';
            statusType = 'listed';
          } else if ((rawP.contractYears || 2) <= 1) {
            priceMultiplier = 0.75;
            statusLabel = 'عقد ينتهي';
            statusType = 'expiring';
          } else if ((rawP.overallRating || (rawP as any).rating || 65) >= 78) {
            priceMultiplier = 1.2;
            statusLabel = 'نجم بارز';
            statusType = 'star';
          }

          const askingPrice = Math.round((rawP.marketValue || 50000) * priceMultiplier);

          accumulated.push({
            player: rawP,
            club,
            clubName: club.name,
            leagueId,
            leagueName,
            isUserClubPlayer: false,
            isArabPlayer: isArab,
            posCategory: posCat,
            askingPrice,
            statusLabel,
            statusType,
          });
        }

        currentIndex = end;
        chunkCount++;
        const isLastChunk = currentIndex >= rawQueue.length;

        // Only copy accumulated array when actually updating state (every 2 chunks and on the final chunk)
        if (chunkCount % 2 === 0 || isLastChunk) {
          setExternalDbPlayers(accumulated.slice());
        }

        if (!isLastChunk) {
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            (window as any).requestIdleCallback(processNextChunk, { timeout: 200 });
          } else {
            setTimeout(processNextChunk, 16);
          }
        } else {
          if (!isCancelled) {
            setIsLoadingWorld(false);
          }
        }
      };

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(processNextChunk, { timeout: 200 });
      } else {
        setTimeout(processNextChunk, 16);
      }
    };

    startWorldLoading();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldLoadKey]);

  // Locally prune any player from externalDbPlayers who moved into userClub or local teams without reloading the world
  useEffect(() => {
    if (localDbPlayers.length === 0) return;
    const localIds = new Set<string>();
    localDbPlayers.forEach(item => {
      if (item.player?.id) localIds.add(item.player.id);
    });
    if (userClub?.players) {
      userClub.players.forEach(p => {
        if (p?.id) localIds.add(p.id);
      });
    }
    setExternalDbPlayers(prev => {
      if (prev.length === 0) return prev;
      const hasOverlap = prev.some(item => item.player?.id && localIds.has(item.player.id));
      return hasOverlap ? prev.filter(item => !item.player?.id || !localIds.has(item.player.id)) : prev;
    });
  }, [transferCounter, localDbPlayers, userClub?.players]);

  // Combined full player database
  const allDbPlayers = useMemo<MarketPlayerItem[]>(() => {
    return [...localDbPlayers, ...externalDbPlayers];
  }, [localDbPlayers, externalDbPlayers]);

  const dbItemByIdMap = useMemo(() => {
    const map = new Map<string, MarketPlayerItem>();
    for (let i = 0; i < allDbPlayers.length; i++) {
      const item = allDbPlayers[i];
      if (item.player?.id) {
        map.set(item.player.id, item);
      }
    }
    return map;
  }, [allDbPlayers]);

  const dbPlayerByNameMap = useMemo(() => {
    const map = new Map<string, Player>();
    for (let i = 0; i < allDbPlayers.length; i++) {
      const p = allDbPlayers[i].player;
      if (p?.name && !map.has(p.name)) {
        map.set(p.name, p);
      }
    }
    return map;
  }, [allDbPlayers]);

  const normalizeSelectedTransferPlayer = useCallback(
    (rawInput: any): Player | null => {
      if (!rawInput) return null;
      // Unwrap if passed as { player: Player } from CustomEvent or wrapper object
      const unwrapped: any = rawInput?.player && typeof rawInput.player === 'object' ? rawInput.player : rawInput;
      const matchedItem =
        (unwrapped?.id ? dbItemByIdMap.get(unwrapped.id) : undefined) ||
        (unwrapped?.name
          ? allDbPlayers.find(i => i.player && i.player.name === unwrapped.name)
          : undefined);

      const basePlayer: Partial<Player> = {
        ...(matchedItem?.player || {}),
        ...unwrapped,
      };

      const resolvedId = basePlayer.id || matchedItem?.player?.id;
      const resolvedName = basePlayer.name || matchedItem?.player?.name;
      if (!resolvedId && !resolvedName) return null;

      const resolvedClubObj =
        matchedItem?.club ||
        teams.find(
          t =>
            (basePlayer.currentClubId && t.id === basePlayer.currentClubId) ||
            (t.players || []).some(p => p && p.id === resolvedId)
        ) ||
        null;

      const rawClubName =
        resolvedClubObj?.name ||
        matchedItem?.clubName ||
        (basePlayer as any).currentClubName ||
        (basePlayer as any).club ||
        '';

      const hasValidClub = Boolean(
        resolvedClubObj ||
          (basePlayer.currentClubId && basePlayer.currentClubId !== 'free_agents' && basePlayer.currentClubId !== '') ||
          (rawClubName && !rawClubName.includes('وكيل حر') && !rawClubName.includes('لاعب حر'))
      );

      const isFree =
        matchedItem?.statusType === 'free' ||
        (!hasValidClub &&
          ((basePlayer as any).contractType === 'free' ||
            basePlayer.isFreeAgent === true ||
            basePlayer.currentLeagueId === 'free_agents' ||
            (basePlayer.contractYears !== undefined && basePlayer.contractYears <= 0)));

      const finalOvr = Number(basePlayer.overallRating ?? (basePlayer as any).rating ?? matchedItem?.player?.overallRating ?? 65);
      const finalAge = Number(basePlayer.age ?? matchedItem?.player?.age ?? 24);
      const finalSalary = Number(basePlayer.salary ?? matchedItem?.player?.salary ?? 5000);
      const finalClubName = isFree ? 'لاعب حر' : (rawClubName || 'نادٍ محترف');
      const finalClubId = isFree ? '' : (resolvedClubObj?.id || basePlayer.currentClubId || '');
      const finalPrice = isFree
        ? 0
        : Number(
            (basePlayer as any).askingPrice ??
              (basePlayer as any).price ??
              matchedItem?.askingPrice ??
              basePlayer.marketValue ??
              matchedItem?.player?.marketValue ??
              50000
          );

      return {
        ...(basePlayer as Player),
        id: resolvedId || `player_${Date.now()}`,
        name: resolvedName || 'لاعب محترف',
        position: (basePlayer.position || matchedItem?.player?.position || 'CM') as Player['position'],
        overallRating: finalOvr,
        age: finalAge,
        salary: finalSalary,
        marketValue: isFree ? (basePlayer.marketValue || 50000) : finalPrice,
        currentClubId: finalClubId,
        isFreeAgent: isFree,
        contractYears: isFree ? 0 : Math.max(1, Number(basePlayer.contractYears ?? matchedItem?.player?.contractYears ?? 2)),
        ...({
          rating: finalOvr,
          club: finalClubName,
          currentClubName: finalClubName,
          price: finalPrice,
          askingPrice: finalPrice,
          contractType: isFree ? 'free' : 'club',
        } as any),
      };
    },
    [dbItemByIdMap, allDbPlayers, teams]
  );

  useEffect(() => {
    const handleOpenNeg = (e: Event) => {
      const customEv = e as CustomEvent<any>;
      const targetPlayer = normalizeSelectedTransferPlayer(customEv.detail);
      if (!targetPlayer) return;

      setActiveTabMode('buy');
      const existing = activeNegotiations.find(
        n => n.playerId === targetPlayer.id && n.type === 'buy' && n.stage !== 'completed' && n.stage !== 'rejected'
      );
      if (existing) {
        setNegotiatingPlayer(targetPlayer);
        setSelectedNegotiation(existing);
        setIsNegotiationModalOpen(true);
      } else {
        setNegotiatingPlayer(targetPlayer);
        setSelectedNegotiation(null);
        setIsNegotiationModalOpen(true);
      }
    };

    window.addEventListener('open-player-negotiation', handleOpenNeg);
    return () => window.removeEventListener('open-player-negotiation', handleOpenNeg);
  }, [activeNegotiations, normalizeSelectedTransferPlayer]);

  // Comprehensive league list with official Arabic names from GLOBAL_LEAGUES + custom leagues
  const availableLeagues = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const seen = new Set<string>();

    Object.values(GLOBAL_LEAGUES).forEach(comp => {
      if (!seen.has(comp.id)) {
        seen.add(comp.id);
        list.push({ id: comp.id, name: comp.name });
      }
    });

    try {
      const custom = getCustomLeagues();
      Object.values(custom).forEach(comp => {
        if (comp && comp.id && comp.name && !seen.has(comp.id)) {
          seen.add(comp.id);
          list.push({ id: comp.id, name: comp.name });
        }
      });
    } catch {}

    return list;
  }, []);

  const availableClubs = useMemo(() => {
    const set = new Set<string>();
    allDbPlayers.forEach(item => {
      if (selectedLeague === 'ALL' || item.leagueId === selectedLeague) {
        set.add(item.clubName);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [allDbPlayers, selectedLeague]);

  const availableNationalities = useMemo(() => {
    const set = new Set<string>();
    allDbPlayers.forEach(item => {
      if (item.player.nationality) {
        set.add(item.player.nationality);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [allDbPlayers]);

  const transferRumors = useMemo<TransferRumor[]>(() => {
    return generateTransferRumors(teams || [], currentDate || '2026-08-01', rumorFeedSeed);
  }, [teams, currentDate, rumorFeedSeed]);

  // Filter & Sort Players (including 1-Tap Scouting Lenses)
  const filteredPlayers = useMemo(() => {
    const effMinAge = minAge === '' ? 15 : Number(minAge);
    const effMaxAge = maxAge === '' ? 45 : Number(maxAge);
    const effMinOvr = minOverall === '' ? 40 : Number(minOverall);
    const effMaxOvr = maxOverall === '' ? 99 : Number(maxOverall);

    const userSquadIdSet = new Set(
      (userClub?.players || []).map(p => p?.id).filter(Boolean) as string[]
    );

    return allDbPlayers
      .filter(item => {
        const p = item.player;
        if (!p) return false;

        // Never display the user club's own players or newly bought players in the transfer market search list
        if (item.isUserClubPlayer || userSquadIdSet.has(p.id) || boughtPlayerIds.has(p.id)) {
          return false;
        }

        // 1-Tap Smart Scouting Lens Filter
        if (scoutingPreset === 'affordable') {
          if (item.askingPrice > clubTransferBudget) return false;
          if ((p.salary || 2500) > remainingWageBudget) return false;
        } else if (scoutingPreset === 'arab_players') {
          if (!item.isArabPlayer) return false;
        } else if (scoutingPreset === 'u22_wonderkids') {
          if (p.age > 22 || (p.potentialRating || p.overallRating) < p.overallRating + 3) return false;
        } else if (scoutingPreset === 'bargains') {
          if (item.statusType !== 'free' && item.statusType !== 'listed' && item.statusType !== 'expiring') {
            return false;
          }
        }

        if (debouncedSearch) {
          const matchName = (p.name || '').toLowerCase().includes(debouncedSearch);
          const matchClub = (item.clubName || '').toLowerCase().includes(debouncedSearch);
          const matchNat = (p.nationality || '').toLowerCase().includes(debouncedSearch);
          const matchNick = (p.nickname || '').toLowerCase().includes(debouncedSearch);
          if (!matchName && !matchClub && !matchNat && !matchNick) return false;
        }

        if (selectedLeague !== 'ALL' && item.leagueId !== selectedLeague) return false;
        if (selectedClub !== 'ALL' && item.clubName !== selectedClub) return false;
        if (selectedCategory !== 'ALL' && item.posCategory !== selectedCategory) return false;
        if (selectedExactPos !== 'ALL' && p.position !== selectedExactPos) return false;
        if (selectedNationality !== 'ALL' && p.nationality !== selectedNationality) return false;
        if (p.age < effMinAge || p.age > effMaxAge) return false;
        if (p.overallRating < effMinOvr || p.overallRating > effMaxOvr) return false;

        return true;
      })
      .sort((a, b) => {
        const pA = a.player;
        const pB = b.player;
        let diff = 0;

        if (sortBy === 'overall') {
          diff = (pB.overallRating || 0) - (pA.overallRating || 0);
        } else if (sortBy === 'value') {
          diff = (b.askingPrice || 0) - (a.askingPrice || 0);
        } else if (sortBy === 'salary') {
          diff = (pB.salary || 0) - (pA.salary || 0);
        } else if (sortBy === 'age') {
          diff = (pB.age || 0) - (pA.age || 0);
        } else if (sortBy === 'name') {
          diff = (pA.name || '').localeCompare(pB.name || '', 'ar');
        }

        return sortOrder === 'desc' ? diff : -diff;
      });
  }, [
    allDbPlayers,
    scoutingPreset,
    clubTransferBudget,
    remainingWageBudget,
    debouncedSearch,
    selectedLeague,
    selectedClub,
    selectedCategory,
    selectedExactPos,
    selectedNationality,
    minAge,
    maxAge,
    minOverall,
    maxOverall,
    sortBy,
    sortOrder,
  ]);

  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (selectedLeague !== 'ALL') count++;
    if (selectedClub !== 'ALL') count++;
    if (selectedNationality !== 'ALL') count++;
    if (selectedExactPos !== 'ALL') count++;
    if (minAge !== '' && Number(minAge) > 15) count++;
    if (maxAge !== '' && Number(maxAge) < 45) count++;
    if (minOverall !== '' && Number(minOverall) > 40) count++;
    if (maxOverall !== '' && Number(maxOverall) < 99) count++;
    if (sortBy !== 'overall' || sortOrder !== 'desc') count++;
    return count;
  }, [
    selectedLeague,
    selectedClub,
    selectedNationality,
    selectedExactPos,
    minAge,
    maxAge,
    minOverall,
    maxOverall,
    sortBy,
    sortOrder,
    userClub?.players,
    boughtPlayerIds,
  ]);

  const visibleMarketItems = useMemo(() => {
    return filteredPlayers.slice(0, visibleCardCount);
  }, [filteredPlayers, visibleCardCount]);

  const handleResetFilters = useCallback(() => {
    setScoutingPreset('all');
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedLeague(userClub?.leagueId || 'ALL');
    setSelectedClub('ALL');
    setSelectedCategory('ALL');
    setSelectedExactPos('ALL');
    setSelectedNationality('ALL');
    setMinAge(15);
    setMaxAge(45);
    setMinOverall(40);
    setMaxOverall(99);
    setSortBy('overall');
    setSortOrder('desc');
  }, [userClub?.leagueId]);

  const handleBuy = useCallback(
    (player: Player, customAskingPrice?: number) => {
      try {
        if (!player) return;
        const item = dbItemByIdMap.get(player.id);
        const isFreeItem =
          item?.statusType === 'free' ||
          player.isFreeAgent === true ||
          player.currentLeagueId === 'free_agents' ||
          (!item?.club?.id && !player.currentClubId && !(player as any).clubId);
        const fee = isFreeItem
          ? 0
          : customAskingPrice !== undefined && customAskingPrice > 0
            ? customAskingPrice
            : item?.askingPrice;
        const playerWithClub: Player = isFreeItem
          ? {
              ...player,
              currentClubId: '',
              currentLeagueId: 'free_agents',
              isFreeAgent: true,
            }
          : {
              ...player,
              currentClubId: item?.club?.id || player.currentClubId,
              isFreeAgent: false,
            };
        const result = onBuyPlayer ? onBuyPlayer(playerWithClub) : buyPlayer(playerWithClub, fee);
        const msg = (result as any)?.message || 'تمت صفقة الشراء بنجاح!';
        const succ = (result as any)?.success !== false;
        if (succ) {
          setBoughtPlayerIds(prev => {
            const next = new Set(prev);
            next.add(player.id);
            return next;
          });
          setExternalDbPlayers(prev => prev.filter(entry => entry.player?.id !== player.id));
          setTransferCounter(c => c + 1);
        }
        setNotification({ text: msg, type: succ ? 'success' : 'error' });
        setTimeout(() => setNotification(null), 3500);
      } catch (err: any) {
        console.error('[TransfersTab] handleBuy exception:', err);
        setNotification({ text: err?.message || 'حدث خطأ أثناء إتمام الشراء', type: 'error' });
        setTimeout(() => setNotification(null), 3500);
      }
    },
    [dbItemByIdMap, onBuyPlayer, buyPlayer]
  );

  const handleStartNegotiation = useCallback(
    (player: Player) => {
      const normalizedPlayer = normalizeSelectedTransferPlayer(player);
      if (!normalizedPlayer) return;
      const existing = activeNegotiations.find(
        n => n.playerId === normalizedPlayer.id && n.type === 'buy' && n.stage !== 'completed' && n.stage !== 'rejected'
      );
      if (existing) {
        setNegotiatingPlayer(normalizedPlayer);
        setSelectedNegotiation(existing);
        setIsNegotiationModalOpen(true);
      } else {
        setNegotiatingPlayer(normalizedPlayer);
        setSelectedNegotiation(null);
        setIsNegotiationModalOpen(true);
      }
    },
    [activeNegotiations, normalizeSelectedTransferPlayer]
  );

  const handleOpenExistingNegotiation = useCallback(
    (neg: ActiveNegotiation) => {
      if (!neg) return;
      const foundItem = dbItemByIdMap.get(neg.playerId);
      const fallbackPlayer: Player = (foundItem?.player || {
        id: neg.playerId || `fallback_${Date.now()}`,
        name: neg.playerName || 'لاعب محترف',
        age: 24,
        nationality: 'مصر',
        nationalityCode: 'EGY',
        position: (neg.playerPosition as any) || 'CM',
        overallRating: neg.playerOverall || 68,
        potentialRating: (neg.playerOverall || 68) + 4,
        marketValue: neg.demandedFee || neg.bidFee || 100000,
        salary: neg.demandedSalary || neg.offeredSalary || 5000,
        number: 10,
        preferredFoot: 'right',
        fitness: 100,
        morale: 80,
        contractYears: 3,
        attributes: {
          pace: 68,
          shooting: 66,
          passing: 68,
          dribbling: 68,
          defending: 65,
          physical: 68,
        },
      }) as unknown as Player;

      setNegotiatingPlayer(fallbackPlayer);
      setSelectedNegotiation(neg);
      setIsNegotiationModalOpen(true);
    },
    [dbItemByIdMap]
  );

  const handleQuickSell = useCallback(
    (player: Player) => {
      if (!player || !player.id) return;
      const res = sellPlayer(player.id);
      if (res.success) {
        setBoughtPlayerIds(prev => {
          if (!prev.has(player.id)) return prev;
          const next = new Set(prev);
          next.delete(player.id);
          return next;
        });
        setTransferCounter(c => c + 1);
      }
      setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
      setTimeout(() => setNotification(null), 3500);
    },
    [sellPlayer]
  );

  return (
    <div className="flex flex-col space-y-3 pb-24" dir="rtl">
      {/* ================================================================ */}
      {/* 1. NEW EXECUTIVE SCOUTING & FINANCIAL COMMAND BENTO HEADER       */}
      {/* ================================================================ */}
      <div
        className="bg-[#090e1a] rounded-3xl p-3.5 sm:p-4 space-y-3.5 relative overflow-hidden"
        style={{ border: '1px solid rgba(16, 185, 129, 0.22)' }}
      >
        {/* Top Executive Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-cyan-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white truncate">
                  مركز الكشافة وبورصة الانتقالات
                </h2>
                <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                  معدلات واقعية
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {userClub
                  ? `الإدارة الرياضية لنادي ${userClub.name} • تقييمات واقعية للأندية العربية والعالمية`
                  : 'شبكة الرصد والتعاقدات العالمية'}
              </p>
            </div>
          </div>

          {/* Financial Bento Gauges */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            <div className="bg-slate-950/90 border border-white/[0.07] rounded-2xl px-3 py-2 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block leading-none">خزينة التعاقدات</span>
                <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono tabular-nums block mt-0.5">
                  {formatCompactCurrency(clubTransferBudget)}
                </span>
              </div>
            </div>

            <div className="bg-slate-950/90 border border-white/[0.07] rounded-2xl px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 leading-none">فائض الرواتب</span>
                <span className="text-[9px] font-mono text-slate-500 tabular-nums">{wageUsagePercent}% مستخدم</span>
              </div>
              <span className="text-xs sm:text-sm font-black text-cyan-400 font-mono tabular-nums block mt-0.5">
                {formatCompactCurrency(remainingWageBudget, false)}/ش
              </span>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full ${
                    wageUsagePercent > 90 ? 'bg-rose-500' : wageUsagePercent > 75 ? 'bg-amber-500' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${wageUsagePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modern 4-Pill Segmented Navigation Dock */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-slate-950/90 p-1.5 rounded-2xl border border-white/[0.06]">
          <button
            id="tab_btn_market"
            type="button"
            onClick={() => setActiveTabMode('buy')}
            className={`flex-1 min-w-fit px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer ${
              activeTabMode === 'buy'
                ? 'bg-emerald-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>رادار اللاعبين</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md tabular-nums ${
                activeTabMode === 'buy' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'
              }`}
            >
              {allDbPlayers.length}
            </span>
          </button>

          <button
            id="tab_btn_rumors"
            type="button"
            onClick={() => setActiveTabMode('rumors')}
            className={`flex-1 min-w-fit px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 relative transition-transform active:scale-95 cursor-pointer ${
              activeTabMode === 'rumors'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${activeTabMode === 'rumors' ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>بورصة الشائعات</span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          </button>

          <button
            id="tab_btn_negotiations"
            type="button"
            onClick={() => setActiveTabMode('negotiations')}
            className={`flex-1 min-w-fit px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer ${
              activeTabMode === 'negotiations'
                ? 'bg-cyan-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>غرفة المفاوضات</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md tabular-nums ${
                activeTabMode === 'negotiations' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'
              }`}
            >
              {activeNegotiations.length}
            </span>
            {activeNegotiations.some(n => n.actionRequired) && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            id="tab_btn_sell"
            type="button"
            onClick={() => setActiveTabMode('sell')}
            className={`flex-1 min-w-fit px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer ${
              activeTabMode === 'sell'
                ? 'bg-rose-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>قائمة البيع والعروض</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md tabular-nums ${
                activeTabMode === 'sell' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'
              }`}
            >
              {userClub?.players ? userClub.players.length : 0}
            </span>
            {incomingBids.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black">
                {incomingBids.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {notification && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 transition-opacity ${
            notification.type === 'success'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/70'
              : 'bg-red-950 text-red-300 border border-red-700/70'
          }`}
        >
          {notification.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW 1: SCOUTING RADAR & VIRTUALIZED TRANSFER MARKET             */}
      {/* ================================================================ */}
      {activeTabMode === 'buy' && (
        <div className="space-y-2.5">
          {/* Scouting Control Deck */}
          <div
            className="bg-[#090e1a] rounded-2xl p-3 space-y-2.5"
            style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            {/* 1-Tap Smart Scouting Lenses */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {[
                { id: 'all', label: 'كل اللاعبين', icon: Globe2 },
                { id: 'affordable', label: 'ضمن ميزانيتك 💰', icon: Wallet },
                { id: 'arab_players', label: 'محترفون عرب 🌍', icon: Compass },
                { id: 'u22_wonderkids', label: 'مواهب شابة ≤ 22 💎', icon: Sparkles },
                { id: 'bargains', label: 'صفقات مخفضة / حرة 🏷️', icon: TrendingUp },
              ].map(lens => {
                const Icon = lens.icon;
                const isActive = scoutingPreset === lens.id;
                return (
                  <button
                    key={lens.id}
                    type="button"
                    onClick={() => setScoutingPreset(lens.id as ScoutingPreset)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-black'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{lens.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input + Bottom Sheet Filter Trigger + Reset */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم اللاعب، النادي، أو الجنسية..."
                  className="w-full bg-slate-950 border border-white/[0.08] rounded-xl pr-8 pl-7 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(true)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 border transition-transform active:scale-95 cursor-pointer ${
                  activeAdvancedFilterCount > 0
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-950 text-slate-300 border-white/[0.08] hover:border-white/20'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>فلاتر متقدمة</span>
                {activeAdvancedFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center tabular-nums">
                    {activeAdvancedFilterCount}
                  </span>
                )}
              </button>

              {(scoutingPreset !== 'all' ||
                searchQuery ||
                selectedCategory !== 'ALL' ||
                activeAdvancedFilterCount > 0) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  title="إعادة ضبط جميع الفلاتر"
                  className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/[0.08] rounded-xl shrink-0 active:scale-95 transition-transform cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Position Category Filter Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'ALL', label: 'كافة المراكز' },
                { id: 'GK', label: '🧤 حراس المرمى' },
                { id: 'DEF', label: '🛡️ خط الدفاع' },
                { id: 'MID', label: '⚙️ خط الوسط' },
                { id: 'FWD', label: '⚡ خط الهجوم' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(tab.id as PositionCategory | 'ALL');
                    setSelectedExactPos('ALL');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 transition-transform active:scale-95 cursor-pointer ${
                    selectedCategory === tab.id
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              {selectedCategory !== 'ALL' && selectedCategory !== 'GK' && (
                <>
                  <span className="text-slate-700 px-0.5">|</span>
                  {(selectedCategory === 'DEF'
                    ? ['CB', 'RB', 'LB', 'RWB', 'LWB']
                    : selectedCategory === 'MID'
                    ? ['CDM', 'CM', 'CAM', 'RM', 'LM']
                    : ['ST', 'CF', 'RW', 'LW']
                  ).map(pos => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setSelectedExactPos(prev => (prev === pos ? 'ALL' : pos))}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono shrink-0 cursor-pointer ${
                        selectedExactPos === pos
                          ? 'bg-cyan-500 text-slate-950 font-black'
                          : 'bg-slate-950 text-slate-400 border border-white/[0.06]'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Direct Quick Sort Bar (Unclipped) */}
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[11px] text-slate-400 font-bold shrink-0 flex items-center gap-1 pl-1">
                  <ArrowUpDown className="w-3 h-3 text-emerald-400" />
                  <span>ترتيب حسب:</span>
                </span>
                {[
                  { id: 'overall', label: 'التقييم العام' },
                  { id: 'value', label: 'السعر المطلوب' },
                  { id: 'salary', label: 'الراتب' },
                  { id: 'age', label: 'العمر' },
                  { id: 'name', label: 'الاسم' },
                ].map(opt => {
                  const isActive = sortBy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (sortBy === opt.id) {
                          setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
                        } else {
                          setSortBy(opt.id as any);
                          setSortOrder('desc');
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 transition-transform active:scale-95 cursor-pointer flex items-center gap-1 ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isActive && (
                        <span className="text-[10px] font-mono">
                          {sortOrder === 'desc' ? '↓' : '↑'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-950 text-slate-300 hover:text-emerald-400 border border-white/[0.08] shrink-0 cursor-pointer"
              >
                {sortOrder === 'desc' ? 'تنازلي ↓' : 'تصاعدي ↑'}
              </button>
            </div>
          </div>

          {/* Results Count & Active Sort Summary Bar */}
          <div className="flex items-center justify-between text-[11px] px-1.5 py-1 text-slate-400">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                نتائج الرصد:{' '}
                <strong className="text-emerald-400 font-mono tabular-nums">
                  {filteredPlayers.length.toLocaleString()}
                </strong>{' '}
                لاعب متاح
              </span>
              {isLoadingWorld && (
                <span className="flex items-center gap-1.5 text-[10px] text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2 py-0.5 rounded-full animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  جاري تحميل لاعبي العالم...
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
              className="flex items-center gap-1 text-slate-300 hover:text-emerald-400 font-medium cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
              <span>تخصيص الفلاتر</span>
            </button>
          </div>

          {/* FLEXIBLE SCROLLABLE SCOUTING DOSSIER CARDS LIST (NO FIXED HEIGHT CLIPPING) */}
          {filteredPlayers.length === 0 ? (
            <div
              className="text-center py-12 bg-[#090e1a] rounded-2xl text-xs text-slate-400 space-y-2.5"
              style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
            >
              <Search className="w-8 h-8 text-slate-600 mx-auto" />
              <p>لا يوجد لاعبون يطابقون معايير الكشافة أو الميزانية المحددة حالياً.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-1 px-4 py-2 bg-emerald-500 text-slate-950 font-black rounded-xl cursor-pointer"
              >
                عرض جميع اللاعبين
              </button>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              onScroll={handleListScroll}
              className="flex-1 overflow-y-auto pb-24 space-y-3 pr-0.5 rounded-2xl"
            >
              {visibleMarketItems.map(item => (
                <MarketPlayerCard
                  key={`${item.player.id}_${item.club?.id || 'free'}`}
                  item={item}
                  clubBudget={clubTransferBudget}
                  remainingWageBudget={remainingWageBudget}
                  hasUserClub={Boolean(userClub)}
                  onSelectPlayer={onSelectPlayer}
                  onStartNegotiation={handleStartNegotiation}
                  onDirectBuy={handleBuy}
                />
              ))}

              {visibleCardCount < filteredPlayers.length && (
                <div className="pt-2 pb-6 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCardCount(prev => prev + 40)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-black text-xs border border-emerald-500/30 active:scale-95 transition-transform cursor-pointer"
                  >
                    عرض المزيد من اللاعبين ({Math.min(filteredPlayers.length - visibleCardCount, 40)} من أصل{' '}
                    {(filteredPlayers.length - visibleCardCount).toLocaleString()} متبقين)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* BOTTOM SHEET MODAL FOR ADVANCED FILTERS                          */}
      {/* ================================================================ */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" dir="rtl">
          <div
            onClick={() => setIsFilterSheetOpen(false)}
            className="fixed inset-0 bg-slate-950/80 transition-opacity"
          />

          <div
            style={{
              borderTop: '1px solid rgba(16, 185, 129, 0.3)',
              willChange: 'transform, opacity',
            }}
            className="relative z-10 bg-[#090e1a] rounded-t-3xl p-4 sm:p-5 max-h-[82vh] overflow-y-auto space-y-4 text-xs"
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto -mt-1 mb-1" />
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-white">إعدادات رادار الكشافة والفرز</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 text-slate-400 hover:text-white border border-white/[0.08] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>إعادة ضبط</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="w-7 h-7 rounded-lg bg-slate-950 text-slate-400 hover:text-white border border-white/[0.08] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-bold">الدوري / المسابقة</label>
                <select
                  value={selectedLeague}
                  onChange={e => {
                    setSelectedLeague(e.target.value);
                    setSelectedClub('ALL');
                  }}
                  className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">جميع دوريات العالم ({availableLeagues.length})</option>
                  <option value="free_agents">سوق اللاعبين الأحرار فقط</option>
                  {availableLeagues.filter(l => l.id !== 'free_agents').map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-bold">النادي</label>
                <select
                  value={selectedClub}
                  onChange={e => setSelectedClub(e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">جميع الأندية ({availableClubs.length})</option>
                  {availableClubs.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-bold">الجنسية</label>
                <select
                  value={selectedNationality}
                  onChange={e => setSelectedNationality(e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">جميع الجنسيات ({availableNationalities.length})</option>
                  {availableNationalities.map(n => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-bold">
                  نطاق العمر ({minAge} - {maxAge})
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={15}
                    max={typeof maxAge === 'number' ? maxAge : 45}
                    value={minAge}
                    onChange={e => setMinAge(e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={() => {
                      if (minAge === '' || Number(minAge) < 15) setMinAge(15);
                    }}
                    className="w-1/2 bg-slate-950 border border-white/[0.08] rounded-xl px-2 py-2 text-slate-200 text-center font-mono tabular-nums"
                  />
                  <span className="text-slate-500">-</span>
                  <input
                    type="number"
                    min={typeof minAge === 'number' ? minAge : 15}
                    max={45}
                    value={maxAge}
                    onChange={e => setMaxAge(e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={() => {
                      if (maxAge === '' || Number(maxAge) > 45) setMaxAge(45);
                    }}
                    className="w-1/2 bg-slate-950 border border-white/[0.08] rounded-xl px-2 py-2 text-slate-200 text-center font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-bold">
                  التقييم العام ({minOverall} - {maxOverall})
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={40}
                    max={typeof maxOverall === 'number' ? maxOverall : 99}
                    value={minOverall}
                    onChange={e => setMinOverall(e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={() => {
                      if (minOverall === '' || Number(minOverall) < 40) setMinOverall(40);
                    }}
                    className="w-1/2 bg-slate-950 border border-white/[0.08] rounded-xl px-2 py-2 text-emerald-400 font-bold text-center font-mono tabular-nums"
                  />
                  <span className="text-slate-500">-</span>
                  <input
                    type="number"
                    min={typeof minOverall === 'number' ? minOverall : 40}
                    max={99}
                    value={maxOverall}
                    onChange={e => setMaxOverall(e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={() => {
                      if (maxOverall === '' || Number(maxOverall) > 99) setMaxOverall(99);
                    }}
                    className="w-1/2 bg-slate-950 border border-white/[0.08] rounded-xl px-2 py-2 text-emerald-400 font-bold text-center font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-bold">ترتيب النتائج حسب</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="overall">التقييم الإجمالي ⭐</option>
                  <option value="value">السعر المطلوب 💰</option>
                  <option value="salary">الراتب الشهري 💵</option>
                  <option value="age">العمر ⏳</option>
                  <option value="name">الاسم الأبجدي 🔤</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-bold">اتجاه الترتيب</label>
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="w-full bg-slate-950 hover:bg-slate-800 border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{sortOrder === 'desc' ? 'تنازلي (الأعلى أولاً)' : 'تصاعدي (الأقل أولاً)'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 active:scale-98 transition-transform cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>تطبيق وعرض ({filteredPlayers.length.toLocaleString()} لاعب)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW 2: TRANSFER RUMORS & SCOOPS FEED                            */}
      {/* ================================================================ */}
      {activeTabMode === 'rumors' && (
        <div className="space-y-3">
          <div
            className="bg-[#090e1a] p-4 rounded-2xl flex items-center justify-between gap-3 flex-wrap"
            style={{ border: '1px solid rgba(245, 158, 11, 0.3)' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-sm text-white flex items-center gap-1.5 flex-wrap">
                  <span>بورصة شائعات الميركاتو والتسريبات</span>
                  <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full font-bold">
                    مباشر 🔥
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  تحركات الأندية ومفاوضات الوكلاء الجارية خلف الكواليس
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRumorFeedSeed(prev => prev + 1)}
              className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-amber-400 border border-white/[0.08] rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تحديث الأخبار</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {transferRumors.map(rumor => {
              const matchedPlayer = dbPlayerByNameMap.get(rumor.playerName);

              return (
                <div
                  key={rumor.id}
                  style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  className="bg-[#0b111e] p-3.5 rounded-2xl space-y-2.5"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold border ${
                          rumor.category === 'mega_deal'
                            ? 'bg-amber-950 text-amber-300 border-amber-600'
                            : rumor.category === 'release_clause'
                            ? 'bg-rose-950 text-rose-300 border-rose-600'
                            : rumor.category === 'contract_dispute'
                            ? 'bg-purple-950 text-purple-300 border-purple-600'
                            : 'bg-cyan-950 text-cyan-300 border-cyan-600'
                        }`}
                      >
                        {rumor.category === 'mega_deal' && '💎 صفقة كبرى'}
                        {rumor.category === 'negotiation' && '👀 مفاوضات سرية'}
                        {rumor.category === 'release_clause' && '⚡ شرط جزائي'}
                        {rumor.category === 'contract_dispute' && '⚠️ خلاف عقد'}
                        {rumor.category === 'swap' && '🔄 صفقة تبادلية'}
                      </span>

                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Newspaper className="w-3 h-3 text-slate-500" />
                        {rumor.source}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">نسبة الحسم:</span>
                      <span className="font-mono font-bold text-emerald-400 tabular-nums">{rumor.probability}%</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-white leading-relaxed">{rumor.headline}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">{rumor.details}</p>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-white/[0.06] flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-900 text-emerald-400 border border-white/[0.08] flex items-center justify-center font-black text-xs font-mono tabular-nums">
                        {rumor.playerOverall}
                      </span>
                      <div>
                        <span className="font-bold text-white block">{rumor.playerName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {rumor.playerPosition} • {rumor.playerAge} عاماً
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-400">
                        من: <strong className="text-slate-200">{rumor.currentClubName}</strong>
                      </span>
                      <span className="text-amber-400">➜</span>
                      <span className="text-slate-400">
                        إلى: <strong className="text-emerald-400">{rumor.interestedClubName}</strong>
                      </span>
                    </div>

                    {matchedPlayer && (
                      <button
                        type="button"
                        onClick={() => handleStartNegotiation(matchedPlayer)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
                      >
                        <Briefcase className="w-3 h-3" />
                        <span>التدخل والتفاوض</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW 3: ACTIVE NEGOTIATIONS HUB (FAST / INSTANT RESOLUTION)      */}
      {/* ================================================================ */}
      {activeTabMode === 'negotiations' && (
        <div className="space-y-3 pb-24">
          <div
            className="bg-[#090e1a] p-3.5 rounded-2xl text-xs text-slate-300 flex items-center justify-between gap-2 flex-wrap"
            style={{ border: '1px solid rgba(6, 182, 212, 0.25)' }}
          >
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong className="text-white">غرفة المفاوضات الجارية والحسم السريع:</strong> تابع حالة عروضك (مقبول • عرض مضاد • قيد الانتظار • مرفوض) واحسم الصفقات فوراً دون انتظار جولات طويلة.
              </span>
            </div>
            <span className="text-[11px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-2.5 py-1 rounded-xl font-bold">
              إجمالي المفاوضات: {activeNegotiations.length}
            </span>
          </div>

          {activeNegotiations.length === 0 ? (
            <div
              className="text-center py-12 bg-[#090e1a] rounded-2xl text-xs text-slate-400 space-y-2"
              style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
            >
              <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-bold text-slate-300">لا توجد مفاوضات نشطة حالياً.</p>
              <p className="text-[11px] text-slate-500">
                ابدأ التفاوض مع أي لاعب من "رادار اللاعبين" أو اعرض لاعبيك للبيع لتلقي العروض الرسمية.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeNegotiations.map(neg => {
                const isSell = neg.type === 'sell';
                const safeSellingClub = neg.sellingClubName || neg.playerClubName || 'نادي اللاعب';
                const buyerClubDisplay = neg.buyerClubName || 'النادي المشتري';
                const buyerClubObj = teams.find(t => t.id === neg.buyerClubId);

                // Map stage to clear user-facing status (Pending / Accepted / Counter-offer / Rejected)
                const isAccepted = neg.stage === 'player_terms' || neg.stage === 'completed';
                const isCounter = neg.stage === 'club_counter' || neg.stage === 'player_counter';
                const isRejected = neg.stage === 'rejected' || neg.stage === 'cancelled';

                const statusBadge = isRejected
                  ? {
                      label: '❌ مرفوض (Rejected)',
                      cls: 'bg-rose-950 text-rose-300 border border-rose-700',
                    }
                  : isCounter
                  ? {
                      label: '🔄 عرض مضاد (Counter-Offer)',
                      cls: 'bg-amber-950 text-amber-300 border border-amber-600',
                    }
                  : isAccepted
                  ? {
                      label: '✅ مقبول وجاهز للتوقيع (Accepted)',
                      cls: 'bg-emerald-950 text-emerald-300 border border-emerald-600',
                    }
                  : {
                      label: isSell ? '🔥 عرض رسمي متاح (Incoming Bid)' : '⏳ قيد الانتظار (Pending)',
                      cls: 'bg-cyan-950 text-cyan-300 border border-cyan-600',
                    };

                return (
                  <div
                    key={neg.id}
                    style={{
                      border: isAccepted
                        ? '1px solid rgba(16, 185, 129, 0.55)'
                        : isCounter
                        ? '1px solid rgba(245, 158, 11, 0.6)'
                        : isSell
                        ? '1px solid rgba(244, 63, 94, 0.4)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                    className="bg-[#0b111e] p-4 rounded-2xl flex flex-col gap-3"
                  >
                    {/* Header: Player Name, Club, Offered Deal & Status Badge */}
                    <div className="flex items-start justify-between flex-wrap gap-2.5">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isSell
                                ? 'bg-rose-950 text-rose-300 border border-rose-700'
                                : 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                            }`}
                          >
                            {isSell ? '💰 عرض بيع وارد' : '🛒 صفقة شراء'}
                          </span>
                          <h4 className="font-black text-sm sm:text-base text-white">{neg.playerName}</h4>
                          <span className="text-[11px] bg-slate-950 text-emerald-300 px-2 py-0.5 rounded-lg font-mono font-bold border border-white/[0.08]">
                            {neg.playerPosition} • OVR {neg.playerOverall}
                          </span>
                        </div>

                        {/* Clear Deal Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                          <div className="bg-slate-950/90 border border-white/[0.06] rounded-xl px-2.5 py-1.5">
                            <span className="text-[10px] text-slate-400 block">
                              {isSell ? 'النادي المشتري' : 'النادي الحالي'}
                            </span>
                            <strong className="text-slate-100 font-bold truncate block">
                              {isSell ? buyerClubDisplay : safeSellingClub}
                            </strong>
                          </div>

                          <div className="bg-slate-950/90 border border-white/[0.06] rounded-xl px-2.5 py-1.5">
                            <span className="text-[10px] text-slate-400 block">العرض المالي</span>
                            <strong className="text-emerald-400 font-mono font-black block">
                              {neg.bidFee > 0 ? formatCompactCurrency(neg.bidFee) : 'انتقال حر (0 ج.م)'}
                            </strong>
                          </div>

                          <div className="bg-slate-950/90 border border-white/[0.06] rounded-xl px-2.5 py-1.5">
                            <span className="text-[10px] text-slate-400 block">الراتب الشهري</span>
                            <strong className="text-cyan-300 font-mono font-bold block">
                              {formatCompactCurrency(neg.offeredSalary || 0, false)}/ش
                            </strong>
                          </div>

                          <div className="bg-slate-950/90 border border-white/[0.06] rounded-xl px-2.5 py-1.5">
                            <span className="text-[10px] text-slate-400 block">مدة العقد</span>
                            <strong className="text-amber-300 font-mono font-bold block">
                              {neg.contractYears || 3} سنوات
                            </strong>
                          </div>
                        </div>

                        {/* Counter-Offer Highlight if present */}
                        {isCounter && (neg.demandedFee || neg.demandedSalary) && (
                          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-amber-200 flex items-center gap-2 flex-wrap">
                            <span className="font-black">⚡ شروط العرض المضاد المطلوبة للحسم الفوري:</span>
                            {neg.demandedFee !== undefined && (
                              <span className="font-mono font-bold text-amber-300">
                                مبلغ الانتقال: {formatCompactCurrency(neg.demandedFee)}
                              </span>
                            )}
                            {neg.demandedSalary !== undefined && (
                              <span className="font-mono font-bold text-amber-300">
                                الراتب المطلوب: {formatCompactCurrency(neg.demandedSalary, false)}/ش
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-left shrink-0">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-black block ${statusBadge.cls}`}>
                          {statusBadge.label}
                        </span>
                        {!isRejected && (
                          <span className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1 justify-end font-mono">
                            <Clock className="w-3 h-3 text-cyan-400" /> الحسم: فوري / جولة واحدة
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Message Box */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-white/[0.06] text-xs text-slate-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{neg.statusMessage}</span>
                    </div>

                    {/* Action Buttons Footer */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06] flex-wrap">
                      {isSell ? (
                        <>
                          {neg.stage === 'incoming_bid' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const res = acceptSellNegotiation(neg.id);
                                  if (res.success) {
                                    setBoughtPlayerIds(prev => {
                                      const next = new Set(prev);
                                      next.delete(neg.playerId);
                                      return next;
                                    });
                                    setTransferCounter(c => c + 1);
                                  }
                                  setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                                  setTimeout(() => setNotification(null), 4000);
                                }}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-2.5 px-3 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                                <span>قبول البيع الفوري ({formatCompactCurrency(neg.bidFee || 0)})</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const res = rejectSellNegotiation(neg.id);
                                  setNotification({ text: res.message, type: 'error' });
                                  setTimeout(() => setNotification(null), 3000);
                                }}
                                className="bg-slate-950 hover:bg-rose-950 hover:text-rose-300 border border-white/[0.08] text-slate-400 text-xs py-2.5 px-3 rounded-xl cursor-pointer"
                              >
                                رفض العرض ✕
                              </button>
                            </>
                          )}

                          {neg.stage === 'club_counter' && (
                            <>
                              <span className="text-xs text-amber-300 flex-1 font-bold">
                                تم طلب مبلغ ({formatCompactCurrency(neg.demandedFee || 0)}) • سيصل رد {buyerClubDisplay}{' '}
                                في الجولة القادمة.
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const res = rejectSellNegotiation(neg.id);
                                  setNotification({ text: res.message, type: 'error' });
                                  setTimeout(() => setNotification(null), 3000);
                                }}
                                className="bg-slate-950 hover:bg-slate-800 text-slate-400 text-xs py-2 px-3 rounded-xl border border-white/[0.08] cursor-pointer"
                              >
                                سحب الطلب
                              </button>
                            </>
                          )}

                          {(neg.stage === 'rejected' || neg.stage === 'completed') && (
                            <button
                              type="button"
                              onClick={() => cancelNegotiation(neg.id)}
                              className="bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs py-2 px-3 rounded-xl border border-white/[0.08] ml-auto cursor-pointer"
                            >
                              إزالة من القائمة ✕
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Instant Complete Button for Accepted / Pending Buy Deals */}
                          {(neg.stage === 'player_terms' || neg.stage === 'club_review') && (
                            <button
                              type="button"
                              onClick={() => {
                                const res = respondToNegotiationOffer(neg.id, 'complete_now');
                                if (res.success) {
                                  setBoughtPlayerIds(prev => {
                                    const next = new Set(prev);
                                    next.add(neg.playerId);
                                    return next;
                                  });
                                  setExternalDbPlayers(prev => prev.filter(e => e.player?.id !== neg.playerId));
                                  setTransferCounter(c => c + 1);
                                }
                                setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                                setTimeout(() => setNotification(null), 3500);
                              }}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-2.5 px-3.5 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                              <span>إتمام التعاقد الفوري الآن ✍️</span>
                            </button>
                          )}

                          {neg.demandedSalary && neg.stage === 'player_counter' && (
                            <button
                              type="button"
                              onClick={() => {
                                const res = respondToNegotiationOffer(neg.id, 'raise_salary', neg.demandedSalary);
                                if (res.success) {
                                  setBoughtPlayerIds(prev => {
                                    const next = new Set(prev);
                                    next.add(neg.playerId);
                                    return next;
                                  });
                                  setExternalDbPlayers(prev => prev.filter(e => e.player?.id !== neg.playerId));
                                  setTransferCounter(c => c + 1);
                                }
                                setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                                setTimeout(() => setNotification(null), 3500);
                              }}
                              className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-2.5 rounded-xl active:scale-95 transition-transform cursor-pointer"
                            >
                              قبول العرض المضاد للراتب وإتمام الصفقة ({formatCompactCurrency(neg.demandedSalary || 0, false)}/ش) ⚡
                            </button>
                          )}

                          {neg.demandedFee && neg.stage === 'club_counter' && (
                            <button
                              type="button"
                              onClick={() => {
                                const res = respondToNegotiationOffer(neg.id, 'accept_counter', neg.demandedFee);
                                if (res.success) {
                                  setBoughtPlayerIds(prev => {
                                    const next = new Set(prev);
                                    next.add(neg.playerId);
                                    return next;
                                  });
                                  setExternalDbPlayers(prev => prev.filter(e => e.player?.id !== neg.playerId));
                                  setTransferCounter(c => c + 1);
                                }
                                setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                                setTimeout(() => setNotification(null), 3500);
                              }}
                              className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-2.5 rounded-xl active:scale-95 transition-transform cursor-pointer"
                            >
                              قبول العرض المضاد للنادي وإتمام الصفقة ({formatCompactCurrency(neg.demandedFee || 0)}) ⚡
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenExistingNegotiation(neg)}
                            className="bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 font-bold text-xs py-2.5 px-3 rounded-xl active:scale-95 transition-transform cursor-pointer"
                          >
                            تعديل العرض ✍️
                          </button>

                          <button
                            type="button"
                            onClick={() => cancelNegotiation(neg.id)}
                            className="bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-xs px-3 py-2.5 rounded-xl border border-white/[0.08] cursor-pointer"
                          >
                            إلغاء ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW 4: SELL SQUAD PLAYERS                                       */}
      {/* ================================================================ */}
      {activeTabMode === 'sell' && (
        <div className="space-y-2.5">
          {!userClub ? (
            <div
              className="text-center py-10 bg-[#090e1a] rounded-2xl text-xs text-slate-400"
              style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
            >
              أنت غير مرتبط بنادٍ حالياً ولا توجد قائمة لاعبين للبيع.
            </div>
          ) : (
            <>
              <div
                className="bg-[#090e1a] p-3.5 rounded-2xl text-xs text-slate-300 space-y-1"
                style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
              >
                <div className="font-bold text-white">📢 إدارة قائمة المعروضين للبيع والعروض الواردة</div>
                <p className="text-slate-400 leading-relaxed">
                  اعرض أي لاعب من قائمتك في سوق الانتقالات لتلقي عروض رسمية من الأندية الأخرى أو نفذ البيع الفوري لتوفير
                  السيولة مباشرة.
                </p>
              </div>

              {(userClub.players || []).map(rawPlayer => {
                const player = calibrateRealisticPlayerRating(
                  rawPlayer,
                  userClub.id,
                  userClub.leagueId,
                  userClub.reputation || 65
                );
                const isListed = Boolean(player.isListedForTransfer);
                const activeSellNeg = activeNegotiations.find(
                  n =>
                    n.playerId === player.id &&
                    n.type === 'sell' &&
                    n.stage !== 'completed' &&
                    n.stage !== 'rejected'
                );
                const incomingBid = incomingBids.find(b => b.playerId === player.id);
                const salePrice = Math.max(25000, Math.round(player.marketValue || 50000));

                return (
                  <div
                    key={player.id}
                    style={{
                      border: incomingBid
                        ? '1px solid rgba(16, 185, 129, 0.5)'
                        : isListed
                        ? '1px solid rgba(245, 158, 11, 0.45)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                    className="bg-[#0b111e] p-3 rounded-2xl flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 flex flex-col items-center justify-center font-black text-white text-xs font-mono border border-white/[0.08] shrink-0">
                        <span>{player.overallRating}</span>
                        <span className="text-[8px] text-emerald-400">{player.position}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white truncate">{player.name}</span>
                          {incomingBid && (
                            <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              عرض شراء وارد 💰
                            </span>
                          )}
                          {isListed && !incomingBid && (
                            <span className="bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              معروض للبيع 📢
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
                          {player.age} سنة • القيمة السوقية:{' '}
                          <strong className="text-emerald-400">{formatCompactCurrency(player.marketValue || 0)}</strong>{' '}
                          • راتب {formatCompactCurrency(player.salary || 2500, false)}/ش
                        </div>

                        {incomingBid && (
                          <div className="text-[11px] text-emerald-400 mt-1 font-bold">
                            🔥 عرض رسمي من ({incomingBid.toClubName}) بمبلغ{' '}
                            {formatCompactCurrency(incomingBid.bidAmount || 0)}
                          </div>
                        )}

                        {activeSellNeg && !incomingBid && (
                          <div className="text-[11px] text-emerald-400 mt-1 font-bold">
                            🔥 عرض مفاوضات من ({activeSellNeg.buyerClubName}) بمبلغ{' '}
                            {formatCompactCurrency(activeSellNeg.bidFee || 0)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {incomingBid ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const res = acceptIncomingBid(incomingBid.id);
                              setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                              setTimeout(() => setNotification(null), 4000);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>قبول البيع ({formatCompactCurrency(incomingBid.bidAmount || 0)})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const res = rejectIncomingBid(incomingBid.id);
                              setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                              setTimeout(() => setNotification(null), 3000);
                            }}
                            className="bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform cursor-pointer"
                          >
                            رفض العرض
                          </button>
                        </>
                      ) : activeSellNeg ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const res = acceptSellNegotiation(activeSellNeg.id);
                              setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                              setTimeout(() => setNotification(null), 4000);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>قبول بيع ({formatCompactCurrency(activeSellNeg.bidFee || 0)})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveTabMode('negotiations')}
                            className="bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            إدارة التفاوض ✍️
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const res = listPlayerForTransfer(player.id, !isListed);
                            setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                            setTimeout(() => setNotification(null), 3500);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer ${
                            isListed
                              ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-white/[0.08]'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                          }`}
                        >
                          <span>{isListed ? 'سحب من البيع ✕' : 'عرض للبيع 📢'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleQuickSell(player)}
                        title="بيع فوري سريع"
                        className="bg-red-950/70 hover:bg-red-900/80 border border-red-800/80 text-red-300 px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
                      >
                        <DollarSign className="w-3.5 h-3.5 text-red-400" />
                        <span>بيع فوري ({formatCompactCurrency(salePrice)})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Interactive Negotiation Modal */}
      {(() => {
        const matchedMarketItem = negotiatingPlayer ? dbItemByIdMap.get(negotiatingPlayer.id) : undefined;
        const playerContractType = (negotiatingPlayer as any)?.contractType as 'club' | 'free' | undefined;
        const fallbackClubName =
          matchedMarketItem?.club?.name ||
          matchedMarketItem?.clubName ||
          (negotiatingPlayer as any)?.currentClubName ||
          (negotiatingPlayer as any)?.club ||
          '';
        const isFreeTarget =
          playerContractType === 'free' ||
          matchedMarketItem?.statusType === 'free' ||
          (negotiatingPlayer?.isFreeAgent === true && !fallbackClubName);

        const negotiatingSellingClub: Club | null =
          !negotiatingPlayer || isFreeTarget
            ? null
            : matchedMarketItem?.club ||
              teams.find(
                t =>
                  (negotiatingPlayer.currentClubId && t.id === negotiatingPlayer.currentClubId) ||
                  (t.players || []).some(p => p && p.id === negotiatingPlayer.id)
              ) ||
              (fallbackClubName && !fallbackClubName.includes('وكيل حر') && !fallbackClubName.includes('لاعب حر')
                ? ({
                    id: negotiatingPlayer.currentClubId || 'external_club',
                    name: fallbackClubName,
                    shortName: fallbackClubName,
                    primaryColor: '#10b981',
                    secondaryColor: '#ffffff',
                    budget: 10000000,
                    reputation: 70,
                    players: [],
                  } as unknown as Club)
                : null);

        const negotiatingAskingPrice = isFreeTarget
          ? 0
          : Number(
              (negotiatingPlayer as any)?.askingPrice ??
                (negotiatingPlayer as any)?.price ??
                matchedMarketItem?.askingPrice ??
                negotiatingPlayer?.marketValue ??
                0
            );

        return (
          <NegotiationModal
            player={negotiatingPlayer}
            sellingClub={negotiatingSellingClub}
            askingPrice={negotiatingAskingPrice}
            userClub={userClub}
            existingNegotiation={selectedNegotiation}
            isOpen={isNegotiationModalOpen}
            onClose={() => {
              setIsNegotiationModalOpen(false);
              setNegotiatingPlayer(null);
              setSelectedNegotiation(null);
            }}
            onSubmitProposal={proposal => {
              try {
                const res = startPlayerNegotiation(proposal);
                setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                setTimeout(() => setNotification(null), 3500);
                setIsNegotiationModalOpen(false);
                setActiveTabMode('negotiations');
              } catch (err: any) {
                console.error('[TransfersTab] startPlayerNegotiation exception:', err);
                setNotification({ text: err?.message || 'حدث خطأ أثناء إرسال العرض', type: 'error' });
                setTimeout(() => setNotification(null), 3500);
              }
            }}
            onRespondToCounter={(negId, action, extraVal) => {
              try {
                const targetNeg = activeNegotiations.find(n => n.id === negId) || selectedNegotiation;
                const res = respondToNegotiationOffer(negId, action, extraVal);
                if (res.success && action !== 'cancel' && targetNeg?.playerId) {
                  setBoughtPlayerIds(prev => {
                    const next = new Set(prev);
                    next.add(targetNeg.playerId);
                    return next;
                  });
                  setExternalDbPlayers(prev => prev.filter(e => e.player?.id !== targetNeg.playerId));
                  setTransferCounter(c => c + 1);
                }
                setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                setTimeout(() => setNotification(null), 3500);
                setIsNegotiationModalOpen(false);
              } catch (err: any) {
                console.error('[TransfersTab] respondToNegotiationOffer exception:', err);
                setNotification({ text: err?.message || 'حدث خطأ أثناء الرد على العرض', type: 'error' });
                setTimeout(() => setNotification(null), 3500);
              }
            }}
          />
        );
      })()}
    </div>
  );
};
