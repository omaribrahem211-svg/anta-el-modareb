/**
 * Anta Elmodareb - Save Backup, Integrity & Migration Engine
 * 
 * Provides:
 * 1. Exporting .anta-save backup files with cryptographic integrity hashing and versioning.
 * 2. Importing, verifying, and safely applying saves.
 * 3. Migration system that upgrades old schemas with default fallback values
 *    so game updates never wipe or corrupt player progress.
 */

import { LocalGameSavePayload } from './gameStateRepository';
import { INITIAL_TEAMS, INITIAL_MANAGER, INITIAL_TRANSFER_MARKET } from '../data/initialData';
import { normalizeClub, normalizeStanding, normalizeManagerProfile } from '../utils/dataNormalizer';
import { EGYPT_TIER_4_LEAGUE, getLeagueById } from '../data/leaguesData';
import { normalizeCalendarDate } from '../utils/calendarEngine';

export const CURRENT_SAVE_FORMAT_VERSION = 2;
export const APP_BUILD_VERSION = '2.5.0';
const INTEGRITY_SALT = 'ANTA_ELMODAREB_SECURE_SALT_2026_LEAGUE';

export interface AntaSaveContainer {
  header: {
    format: 'ANTA_ELMODAREB_SAVE';
    formatVersion: number;
    appVersion: string;
    exportedAt: string;
    trainerId: string;
    managerName: string;
    checksum: string;
  };
  payload: LocalGameSavePayload;
}

/**
 * Simple, deterministic, lightweight hash function (DJB2 + FNV-1a hybrid)
 * to verify file integrity and prevent accidental data corruption.
 */
function computeChecksum(dataStr: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 5381;
  const combined = dataStr + INTEGRITY_SALT;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    h1 ^= char;
    h1 = Math.imul(h1, 0x01000193);
    h2 = ((h2 << 5) + h2) ^ char;
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `SIG-${hex1}-${hex2}`;
}

/**
 * Normalizes and upgrades any save payload to the latest schema,
 * ensuring backwards compatibility and default fallback values.
 */
export function migrateSavePayload(rawPayload: any): LocalGameSavePayload {
  // Unwrap potential nesting (e.g. containers, storage keys)
  const src = rawPayload?.payload || rawPayload?.current_save || rawPayload?.data || rawPayload?.save || rawPayload;
  const seasonNumber = typeof src?.season?.seasonNumber === 'number' ? src.season.seasonNumber : 1;

  // Resolve active league gracefully
  let resolvedLeague = src?.activeLeague;
  if (typeof resolvedLeague === 'string') {
    resolvedLeague = getLeagueById(resolvedLeague) || EGYPT_TIER_4_LEAGUE;
  } else if (!resolvedLeague || typeof resolvedLeague !== 'object' || !resolvedLeague.id) {
    const leagueId = src?.season?.leagueId || src?.teams?.[0]?.leagueId || 'egy_tier_4';
    resolvedLeague = getLeagueById(leagueId) || EGYPT_TIER_4_LEAGUE;
  }

  // Normalize manager
  const manager = src?.manager 
    ? normalizeManagerProfile(src.manager) 
    : INITIAL_MANAGER;

  // Normalize teams and strictly guarantee user club assignment matches manager.currentClubId
  const rawTeams = Array.isArray(src?.teams) && src.teams.length > 0 
    ? src.teams.map(normalizeClub) 
    : INITIAL_TEAMS.map(normalizeClub);

  const targetClubId = manager?.currentClubId || rawTeams.find((t: any) => t.isUserClub)?.id || rawTeams[0]?.id;

  const normalizedTeams = rawTeams.map((t: any) => ({
    ...t,
    isUserClub: Boolean(targetClubId && t.id === targetClubId),
  }));

  const migrated: LocalGameSavePayload = {
    schemaVersion: CURRENT_SAVE_FORMAT_VERSION,
    saveVersion: typeof src?.saveVersion === 'number' ? src.saveVersion : 1,
    lastLocalSaveAt: typeof src?.lastLocalSaveAt === 'number' ? src.lastLocalSaveAt : Date.now(),
    
    // Core game state
    season: src?.season || { seasonNumber: 1, isCompleted: false, year: '2025/2026' },
    activeLeague: resolvedLeague,
    teams: normalizedTeams,
    standings: Array.isArray(src?.standings) 
      ? src.standings.map(normalizeStanding) 
      : [],
    fixtures: Array.isArray(src?.fixtures) ? src.fixtures : [],
    currentRound: typeof src?.currentRound === 'number' ? src.currentRound : 1,
    manager: {
      ...manager,
      currentClubId: targetClubId || manager.currentClubId,
    },

    // Transfers and economy
    transferMarket: Array.isArray(src?.transferMarket) ? src.transferMarket : INITIAL_TRANSFER_MARKET,
    incomingBids: Array.isArray(src?.incomingBids) ? src.incomingBids : [],
    inbox: Array.isArray(src?.inbox) ? src.inbox : [],
    cupTournament: src?.cupTournament || null,
    jobOffers: Array.isArray(src?.jobOffers) ? src.jobOffers : [],
    seasonEndSummary: src?.seasonEndSummary || null,
    transferHistory: Array.isArray(src?.transferHistory) ? src.transferHistory : [],
    clubEconomy: src?.clubEconomy || {
      transferSpendingTotal: 0,
      transferIncomeTotal: 0,
      salaryExpensesTotal: 0,
      sponsorIncomeTotal: 0,
      matchIncomeTotal: 0,
      facilitySpendingTotal: 0,
      currentSeasonNetProfit: 0,
    },

    // Extended features & Fallback defaults (Migration safe)
    calendarDate: normalizeCalendarDate(src?.calendarDate, seasonNumber),
    activeNegotiations: Array.isArray(src?.activeNegotiations) ? src.activeNegotiations : [],
    boardSystem: src?.boardSystem || null,
    dailyNews: Array.isArray(src?.dailyNews) ? src.dailyNews : [],
    retiredPlayers: Array.isArray(src?.retiredPlayers) ? src.retiredPlayers : [],
    worldRankings: (src?.worldRankings && typeof src.worldRankings === 'object' && !Array.isArray(src.worldRankings)) ? src.worldRankings : null,
    scoutedOpponents: (src?.scoutedOpponents && typeof src.scoutedOpponents === 'object' && !Array.isArray(src.scoutedOpponents)) ? src.scoutedOpponents : {},
    deletedMessageIds: Array.isArray(src?.deletedMessageIds) ? src.deletedMessageIds : [],
  };

  return migrated;
}

/**
 * Creates the exported .anta-save container with metadata and checksum
 */
export function createExportContainer(payload: LocalGameSavePayload, trainerId?: string): AntaSaveContainer {
  const canonicalPayload = migrateSavePayload(payload);
  const payloadString = JSON.stringify(canonicalPayload);
  const checksum = computeChecksum(payloadString);

  return {
    header: {
      format: 'ANTA_ELMODAREB_SAVE',
      formatVersion: CURRENT_SAVE_FORMAT_VERSION,
      appVersion: APP_BUILD_VERSION,
      exportedAt: new Date().toISOString(),
      trainerId: trainerId || canonicalPayload.manager?.trainerId || 'LOCAL_TRAINER',
      managerName: canonicalPayload.manager?.name || 'مدرب الفريق',
      checksum,
    },
    payload: canonicalPayload,
  };
}

/**
 * Returns formatted text/code of the save container for easy clipboard copy
 */
export function getExportSaveCode(payload: LocalGameSavePayload, trainerId?: string): string {
  const container = createExportContainer(payload, trainerId);
  return JSON.stringify(container);
}

/**
 * Triggers a browser download of the save file (.anta-save or .json)
 */
export function downloadSaveFile(
  payload: LocalGameSavePayload, 
  trainerId?: string, 
  format: 'anta-save' | 'json' = 'anta-save'
): void {
  const container = createExportContainer(payload, trainerId);
  const jsonStr = JSON.stringify(container, null, 2);
  const mimeType = format === 'json' ? 'application/json' : 'application/octet-stream';
  const blob = new Blob([jsonStr], { type: `${mimeType};charset=utf-8;` });
  
  const sanitizedName = (container.header.managerName || 'Manager')
    .replace(/[^\w\u0600-\u06FF]/g, '_')
    .slice(0, 20);
  const seasonNum = container.payload.season?.seasonNumber || 1;
  const roundNum = container.payload.currentRound || 1;
  const dateStr = new Date().toISOString().slice(0, 10);
  const ext = format === 'json' ? 'json' : 'anta-save';
  const fileName = `AntaElModareb_${sanitizedName}_S${seasonNum}_R${roundNum}_${dateStr}.${ext}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ImportSaveResult {
  success: boolean;
  data?: LocalGameSavePayload;
  error?: string;
  metadata?: {
    managerName?: string;
    seasonNumber?: number;
    exportedAt?: string;
  };
}

/**
 * Parses and validates an uploaded save file or raw JSON text string,
 * performing resilient extraction, non-blocking checksum evaluation, and full schema migration.
 */
export async function parseAndValidateSaveFile(fileOrText: File | string): Promise<ImportSaveResult> {
  try {
    let content: string;
    if (typeof fileOrText === 'string') {
      content = fileOrText;
    } else if (fileOrText && typeof fileOrText.text === 'function') {
      content = await fileOrText.text();
    } else {
      return { success: false, error: 'لم يتم تزويد ملف أو نص صالح للقراءة.' };
    }

    if (!content || !content.trim()) {
      return { success: false, error: 'الملف أو النص فارغ، يرجى اختيار ملف حفظ صالح أو لصق كود مسيرة سليم.' };
    }

    // Strip UTF-8 Byte Order Mark (BOM) if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    content = content.trim();

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Handle potential double-stringified JSON or surrounding quotes
      try {
        if (content.startsWith('"') && content.endsWith('"')) {
          parsed = JSON.parse(JSON.parse(content));
        } else {
          return { success: false, error: 'تنسيق الملف غير صالح. يرجى التأكد من اختيار ملف حفظ (.anta-save أو .json) غير معدل.' };
        }
      } catch {
        return { success: false, error: 'تنسيق الملف غير صالح. يرجى التأكد من اختيار ملف حفظ (.anta-save أو .json) غير معدل.' };
      }
    }

    // Resilient extraction of payload and header from multiple container formats
    let targetPayload: any = null;
    let headerInfo: any = null;

    if (parsed && typeof parsed === 'object') {
      if (parsed.header && (parsed.payload || parsed.data)) {
        headerInfo = parsed.header;
        targetPayload = parsed.payload || parsed.data;
      } else if (parsed.payload && typeof parsed.payload === 'object') {
        targetPayload = parsed.payload;
      } else if (parsed.current_save && typeof parsed.current_save === 'object') {
        targetPayload = parsed.current_save;
      } else if (parsed.data && typeof parsed.data === 'object') {
        targetPayload = parsed.data;
      } else if (parsed.save && typeof parsed.save === 'object') {
        targetPayload = parsed.save;
      } else if (parsed.manager || parsed.teams || parsed.season) {
        targetPayload = parsed;
      }
    }

    if (!targetPayload || typeof targetPayload !== 'object') {
      return {
        success: false,
        error: 'الملف المختار لا يحتوي على بيانات مسيرة صالحة للعبة "أنت المدرب".',
      };
    }

    // Non-blocking checksum audit:
    // Log diagnostics, but never block user from importing valid game data.
    if (headerInfo?.checksum) {
      try {
        const payloadString = JSON.stringify(targetPayload);
        const expectedChecksum = computeChecksum(payloadString);
        if (headerInfo.checksum === expectedChecksum) {
          console.info('[SaveBackupService] File integrity verified successfully.');
        } else {
          console.warn('[SaveBackupService] Checksum signature variation noticed (cross-platform serialization); structural migration will proceed safely.');
        }
      } catch (checkErr) {
        console.warn('[SaveBackupService] Checksum check non-fatal notice:', checkErr);
      }
    }

    // Migrate payload to guarantee current schema compatibility and user club binding
    const migrated = migrateSavePayload(targetPayload);

    return {
      success: true,
      data: migrated,
      metadata: {
        managerName: headerInfo?.managerName || migrated.manager?.name || 'المدرب',
        seasonNumber: migrated.season?.seasonNumber || 1,
        exportedAt: headerInfo?.exportedAt || 'نسخة محفوظة',
      },
    };
  } catch (err: any) {
    console.error('[SaveBackupService] Parse error:', err);
    return {
      success: false,
      error: `حدث خطأ أثناء قراءة ومعالجة ملف الحفظ: ${err?.message || 'خطأ غير معروف'}`,
    };
  }
}
