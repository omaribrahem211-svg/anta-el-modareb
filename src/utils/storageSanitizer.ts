/**
 * Automatic Storage Sanitizer & Safe Recovery Engine
 * Defensively cleans and repairs corrupted localStorage entries to guarantee 0 render crashes.
 */

export interface StorageRepairResult {
  success: boolean;
  repairedItems: string[];
  message: string;
}

export function autoRepairStorage(): StorageRepairResult {
  const repairedItems: string[] = [];
  const STORAGE_KEY = 'anta_el_modareb';

  try {
    // 1. Remove stuck live match state
    if (localStorage.getItem(`${STORAGE_KEY}_active_live_match`)) {
      localStorage.removeItem(`${STORAGE_KEY}_active_live_match`);
      repairedItems.push('حذف حالة المباراة العالقة');
    }

    // 2. Clear corrupted session storage
    try {
      sessionStorage.clear();
    } catch {}

    // 3. Sanitize teams in localStorage
    const savedTeamsRaw = localStorage.getItem(`${STORAGE_KEY}_teams`);
    if (savedTeamsRaw) {
      try {
        const parsed = JSON.parse(savedTeamsRaw);
        if (Array.isArray(parsed)) {
          let hasCorruptEntry = false;
          const cleanTeams = parsed.filter(Boolean).map((t: any) => {
            if (!t || typeof t !== 'object') {
              hasCorruptEntry = true;
              return null;
            }

            const rawPlayers = Array.isArray(t.players) ? t.players : [];
            const validPlayers = rawPlayers
              .filter((p: any) => p && typeof p === 'object' && p.id)
              .map((p: any, idx: number) => ({
                ...p,
                id: p.id || `p_${t.id || 'club'}_${idx}`,
                name: p.name || 'لاعب',
                position: p.position || 'CM',
                positionCategory: p.positionCategory || 'MID',
                overallRating: Number.isFinite(p.overallRating) ? p.overallRating : 60,
                isGuestStar: Boolean(p.isGuestStar),
                fitness: Number.isFinite(p.fitness) ? p.fitness : 100,
                morale: Number.isFinite(p.morale) ? p.morale : 85,
              }));

            const validIds = new Set(validPlayers.map((p: any) => p.id));
            const rawStarting = Array.isArray(t.tactics?.startingPlayerIds) ? t.tactics.startingPlayerIds : [];
            const rawBench = Array.isArray(t.tactics?.benchPlayerIds) ? t.tactics.benchPlayerIds : [];

            let starting = rawStarting.filter((id: string) => validIds.has(id));
            let bench = rawBench.filter((id: string) => validIds.has(id) && !starting.includes(id));

            if (starting.length < 11 && validPlayers.length > 0) {
              for (const p of validPlayers) {
                if (starting.length >= 11) break;
                if (!starting.includes(p.id) && !bench.includes(p.id)) {
                  starting.push(p.id);
                }
              }
            }

            return {
              ...t,
              players: validPlayers,
              tactics: {
                ...(t.tactics || {}),
                formation: t.tactics?.formation || '4-3-3',
                mentality: t.tactics?.mentality || 'balanced',
                startingPlayerIds: starting,
                benchPlayerIds: bench,
                captainId: (validIds.has(t.tactics?.captainId) ? t.tactics.captainId : null) || validPlayers[0]?.id || '',
              },
            };
          }).filter(Boolean);

          localStorage.setItem(`${STORAGE_KEY}_teams`, JSON.stringify(cleanTeams));
          repairedItems.push('فحص وتطهير بيانات الأندية وتشكيلاتها');
        }
      } catch (err) {
        console.warn('[AutoRepair] Failed sanitizing teams:', err);
      }
    }

    // 4. Sanitize fixtures in localStorage
    const savedFixturesRaw = localStorage.getItem(`${STORAGE_KEY}_fixtures`);
    if (savedFixturesRaw) {
      try {
        const parsedFix = JSON.parse(savedFixturesRaw);
        if (Array.isArray(parsedFix)) {
          const cleanFixtures = parsedFix.filter((f: any) => f && typeof f === 'object' && f.id);
          localStorage.setItem(`${STORAGE_KEY}_fixtures`, JSON.stringify(cleanFixtures));
          repairedItems.push('تطهير جدول المباريات');
        }
      } catch (err) {
        console.warn('[AutoRepair] Failed sanitizing fixtures:', err);
      }
    }

    // 5. Sanitize calendar date
    const savedCalRaw = localStorage.getItem(`${STORAGE_KEY}_calendarDate`);
    if (savedCalRaw) {
      try {
        const parsedCal = JSON.parse(savedCalRaw);
        if (!parsedCal || !parsedCal.rawDateStr || typeof parsedCal.rawDateStr !== 'string') {
          localStorage.removeItem(`${STORAGE_KEY}_calendarDate`);
          repairedItems.push('إعادة ضبط تاريخ التقويم الزمني');
        }
      } catch {
        localStorage.removeItem(`${STORAGE_KEY}_calendarDate`);
        repairedItems.push('إعادة ضبط تاريخ التقويم الزمني');
      }
    }

    // 6. Reset navigation tab to dashboard
    try {
      window.dispatchEvent(new CustomEvent('set-active-tab', { detail: { tab: 'dashboard' } }));
    } catch {}

    return {
      success: true,
      repairedItems,
      message: 'تم فحص وإصلاح ملفات اللعبة بأمان دون فقدان مسيرتك التدريبية.',
    };
  } catch (err: any) {
    console.error('[AutoRepair] Critical error during storage repair:', err);
    return {
      success: false,
      repairedItems,
      message: err?.message || 'حدث خطأ أثناء فحص البيانات.',
    };
  }
}
