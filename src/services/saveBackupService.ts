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
 * to verify file integrity and prevent casual tampering.
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
  const fallbackDate = '2025-08-15';

  const migrated: LocalGameSavePayload = {
    schemaVersion: CURRENT_SAVE_FORMAT_VERSION,
    saveVersion: typeof rawPayload?.saveVersion === 'number' ? rawPayload.saveVersion : 1,
    lastLocalSaveAt: typeof rawPayload?.lastLocalSaveAt === 'number' ? rawPayload.lastLocalSaveAt : Date.now(),
    
    // Core game state
    season: rawPayload?.season || { seasonNumber: 1, isCompleted: false, year: '2025/2026' },
    activeLeague: rawPayload?.activeLeague || null,
    teams: Array.isArray(rawPayload?.teams) && rawPayload.teams.length > 0 
      ? rawPayload.teams.map(normalizeClub) 
      : INITIAL_TEAMS.map(normalizeClub),
    standings: Array.isArray(rawPayload?.standings) 
      ? rawPayload.standings.map(normalizeStanding) 
      : [],
    fixtures: Array.isArray(rawPayload?.fixtures) ? rawPayload.fixtures : [],
    currentRound: typeof rawPayload?.currentRound === 'number' ? rawPayload.currentRound : 1,
    manager: rawPayload?.manager 
      ? normalizeManagerProfile(rawPayload.manager) 
      : INITIAL_MANAGER,

    // Transfers and economy
    transferMarket: Array.isArray(rawPayload?.transferMarket) ? rawPayload.transferMarket : INITIAL_TRANSFER_MARKET,
    incomingBids: Array.isArray(rawPayload?.incomingBids) ? rawPayload.incomingBids : [],
    inbox: Array.isArray(rawPayload?.inbox) ? rawPayload.inbox : [],
    cupTournament: rawPayload?.cupTournament || null,
    jobOffers: Array.isArray(rawPayload?.jobOffers) ? rawPayload.jobOffers : [],
    seasonEndSummary: rawPayload?.seasonEndSummary || null,
    transferHistory: Array.isArray(rawPayload?.transferHistory) ? rawPayload.transferHistory : [],
    clubEconomy: rawPayload?.clubEconomy || {
      transferSpendingTotal: 0,
      transferIncomeTotal: 0,
      salaryExpensesTotal: 0,
      sponsorIncomeTotal: 0,
      matchIncomeTotal: 0,
      facilitySpendingTotal: 0,
      currentSeasonNetProfit: 0,
    },

    // Extended features & Fallback defaults (Migration safe)
    calendarDate: typeof rawPayload?.calendarDate === 'string' ? rawPayload.calendarDate : fallbackDate,
    activeNegotiations: Array.isArray(rawPayload?.activeNegotiations) ? rawPayload.activeNegotiations : [],
    boardSystem: rawPayload?.boardSystem || null,
    dailyNews: Array.isArray(rawPayload?.dailyNews) ? rawPayload.dailyNews : [],
    retiredPlayers: Array.isArray(rawPayload?.retiredPlayers) ? rawPayload.retiredPlayers : [],
    worldRankings: Array.isArray(rawPayload?.worldRankings) ? rawPayload.worldRankings : [],
    scoutedOpponents: Array.isArray(rawPayload?.scoutedOpponents) ? rawPayload.scoutedOpponents : [],
    deletedMessageIds: Array.isArray(rawPayload?.deletedMessageIds) ? rawPayload.deletedMessageIds : [],
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
 * Triggers a browser download of the .anta-save file
 */
export function downloadSaveFile(payload: LocalGameSavePayload, trainerId?: string): void {
  const container = createExportContainer(payload, trainerId);
  const jsonStr = JSON.stringify(container, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  
  const sanitizedName = (container.header.managerName || 'Manager')
    .replace(/[^\w\u0600-\u06FF]/g, '_')
    .slice(0, 20);
  const seasonNum = container.payload.season?.seasonNumber || 1;
  const roundNum = container.payload.currentRound || 1;
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `AntaElModareb_${sanitizedName}_S${seasonNum}_R${roundNum}_${dateStr}.anta-save`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
 * Parses and validates an uploaded save file, checking integrity and performing migration.
 */
export async function parseAndValidateSaveFile(file: File): Promise<ImportSaveResult> {
  try {
    const content = await file.text();
    if (!content || !content.trim()) {
      return { success: false, error: 'الملف فارغ، يرجى اختيار ملف حفظ صالح.' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { success: false, error: 'تنسيق الملف غير صالح (ليس ملف JSON أو .anta-save سليم).' };
    }

    // Case 1: Standard .anta-save Container
    if (parsed && parsed.header && parsed.header.format === 'ANTA_ELMODAREB_SAVE') {
      const { header, payload } = parsed as AntaSaveContainer;

      if (!payload || typeof payload !== 'object') {
        return { success: false, error: 'محتوى ملف الحفظ تالف أو غير مكتمل.' };
      }

      // Check integrity hash
      const payloadString = JSON.stringify(payload);
      const expectedChecksum = computeChecksum(payloadString);

      if (header.checksum && header.checksum !== expectedChecksum) {
        return {
          success: false,
          error: 'فشل فحص سلامة الملف (Integrity Check Failed): يبدو أن الملف تم التعديل عليه أو تلف أثناء النقل.',
        };
      }

      // Migrate payload to guarantee current schema compatibility
      const migrated = migrateSavePayload(payload);

      return {
        success: true,
        data: migrated,
        metadata: {
          managerName: header.managerName || migrated.manager?.name,
          seasonNumber: migrated.season?.seasonNumber,
          exportedAt: header.exportedAt,
        },
      };
    }

    // Case 2: Legacy raw JSON save fallback (e.g. older versions or exported raw state)
    if (parsed && (parsed.manager || parsed.teams || parsed.season)) {
      const migrated = migrateSavePayload(parsed);
      return {
        success: true,
        data: migrated,
        metadata: {
          managerName: migrated.manager?.name,
          seasonNumber: migrated.season?.seasonNumber,
          exportedAt: 'نسخة سابقة (Legacy)',
        },
      };
    }

    return {
      success: false,
      error: 'الملف المختار ليس ملف حفظ معتمد للعبة "أنت المدرب".',
    };
  } catch (err: any) {
    return {
      success: false,
      error: `حدث خطأ أثناء قراءة الملف: ${err?.message || 'خطأ غير معروف'}`,
    };
  }
}
