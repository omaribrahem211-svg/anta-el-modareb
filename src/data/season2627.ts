import { Club } from '../types/game';
import { createClub } from './realClubsData';
import { EGYPT_PREMIER_CLUBS, EGYPT_TIER_2_CLUBS, SAUDI_PRO_CLUBS, SAUDI_TIER_2_CLUBS } from './arabClubsData';
import {
  SPAIN_LA_LIGA_CLUBS, ENGLAND_PREMIER_CLUBS, ITALY_SERIE_A_CLUBS,
  GERMANY_BUNDESLIGA_CLUBS, FRANCE_LIGUE_1_CLUBS,
} from './europeanClubsData';
import { SPAIN_LA_LIGA_2_CLUBS, ENGLAND_CHAMPIONSHIP_CLUBS } from './europeanClubsData2';
import {
  GERMANY_TIER_2_CLUBS, ITALY_SERIE_B_CLUBS, FRANCE_LIGUE_2_CLUBS, SAUDI_TIER_3_CLUBS,
} from './lowerTiersData';

/**
 * تركيبة الدوريات لموسم 2026/27 (الصاعدون والهابطون الفعليون).
 * تُطبَّق مرة واحدة على المصفوفات نفسها (in-place) فتنعكس على كل مكان يستخدمها.
 */
let applied = false;

function mk(id: string, name: string, short: string, city: string, country: string, code: string,
  tier: number, league: string, rep: number, lvl: number, c1: string, c2: string,
  budget: number, stadium: string, cap: number): Club {
  return createClub(id, name, short, city, country, code, tier, league, rep, lvl, c1, c2,
    budget, Math.round(budget * 0.45), Math.round(budget * 0.045), stadium, cap, tier === 1 ? 4 : 3);
}

export function applySeason2627(egyptTier3: Club[]): void {
  if (applied) return;
  applied = true;

  const lists: Record<string, Club[]> = {
    egy1: EGYPT_PREMIER_CLUBS, egy2: EGYPT_TIER_2_CLUBS, egy3: egyptTier3,
    sau1: SAUDI_PRO_CLUBS, sau2: SAUDI_TIER_2_CLUBS, sau3: SAUDI_TIER_3_CLUBS,
    esp1: SPAIN_LA_LIGA_CLUBS, esp2: SPAIN_LA_LIGA_2_CLUBS,
    eng1: ENGLAND_PREMIER_CLUBS, eng2: ENGLAND_CHAMPIONSHIP_CLUBS,
    ita1: ITALY_SERIE_A_CLUBS, ita2: ITALY_SERIE_B_CLUBS,
    ger1: GERMANY_BUNDESLIGA_CLUBS, ger2: GERMANY_TIER_2_CLUBS,
    fra1: FRANCE_LIGUE_1_CLUBS, fra2: FRANCE_LIGUE_2_CLUBS,
  };
  const leagueOf = (key: string) => `${key.slice(0, 3)}_tier_${key.slice(3)}`;

  const find = (id: string): { key: string; club: Club } | null => {
    for (const key of Object.keys(lists)) {
      const club = lists[key].find(c => c.id === id);
      if (club) return { key, club };
    }
    return null;
  };

  const move = (id: string, toKey: string) => {
    const f = find(id);
    if (!f) { console.warn('[season2627] missing club', id); return; }
    if (f.key === toKey) return;
    lists[f.key].splice(lists[f.key].indexOf(f.club), 1);
    const tier = Number(toKey.slice(3));
    const lg = leagueOf(toKey);
    f.club.leagueId = lg;
    f.club.division = tier;
    (f.club as any).divisionTier = tier;
    f.club.players?.forEach((p: any) => { if (p && 'leagueId' in p) p.leagueId = lg; });
    lists[toKey].push(f.club);
  };
  const drop = (id: string) => {
    const f = find(id);
    if (f) lists[f.key].splice(lists[f.key].indexOf(f.club), 1);
  };
  const add = (key: string, club: Club) => { lists[key].push(club); };

  // ---------------- إنجلترا ----------------
  ['eng1_westham', 'eng1_wolves', 'eng1_leicester', 'eng1_southampton'].forEach(id => move(id, 'eng2'));
  ['eng2_coventry', 'eng2_hull', 'eng2_leeds', 'eng2_sunderland'].forEach(id => move(id, 'eng1'));

  // ---------------- إسبانيا ----------------
  ['esp1_girona', 'esp1_mallorca', 'esp1_laspalmas', 'esp1_valladolid', 'esp1_leganes'].forEach(id => move(id, 'esp2'));
  ['esp2_depor', 'esp2_elche', 'esp2_levante', 'esp2_malaga', 'esp2_racing'].forEach(id => move(id, 'esp1'));

  // ---------------- ألمانيا (18 ناديًا) ----------------
  drop('ger2_hamburg'); drop('ger2_schalke'); // مكررين مع أندية الدرجة الأولى
  ['ger_wolfsburg', 'ger_heidenheim', 'ger_stpauli', 'ger_bochum', 'ger_holstein'].forEach(id => move(id, 'ger2'));
  ['ger2_koln', 'ger2_paderborn'].forEach(id => move(id, 'ger1'));
  add('ger1', mk('ger_elversberg', 'إس في إلفرسبيرغ', 'إلفرسبيرغ', 'سبيشيرن', 'ألمانيا', 'GER', 1, 'ger_tier_1',
    66, 70, '#dc2626', '#ffffff', 14000000, 'ستاد أن دير ألتن فورستري', 10000));
  add('ger2', mk('ger2_munster', 'بروسن مونستر', 'مونستر', 'مونستر', 'ألمانيا', 'GER', 2, 'ger_tier_2',
    56, 63, '#15803d', '#000000', 6000000, 'ستاد بروسن', 15000));

  // ---------------- إيطاليا ----------------
  ['ita_empoli', 'ita_verona'].forEach(id => move(id, 'ita2'));
  ['ita2_frosinone', 'ita2_sassuolo'].forEach(id => move(id, 'ita1'));

  // ---------------- فرنسا (18 ناديًا) ----------------
  drop('fra_metz'); // مكرر مع fra2_metz
  ['fra_reims', 'fra_nantes', 'fra_montpellier', 'fra_stetienne', 'fra_bordeaux'].forEach(id => move(id, 'fra2'));
  ['fra2_lorient', 'fra2_paris_fc'].forEach(id => move(id, 'fra1'));
  add('fra1', mk('fra_lemans', 'لومان إف سي', 'لومان', 'لومان', 'فرنسا', 'FRA', 1, 'fra_tier_1',
    60, 66, '#facc15', '#dc2626', 9000000, 'ستاد مارسيل ساوبان', 25000));
  add('fra1', mk('fra_troyes', 'إيه إس تروا', 'تروا', 'تروا', 'فرنسا', 'FRA', 1, 'fra_tier_1',
    62, 67, '#2563eb', '#ffffff', 10000000, 'ستاد دي لوبه', 20000));

  add('fra2', mk('fra2_rodez', 'رودز إيه إف', 'رودز', 'رودز', 'فرنسا', 'FRA', 2, 'fra_tier_2',
    52, 60, '#dc2626', '#facc15', 5000000, 'ستاد پول لينتييه', 5000));

  // ---------------- السعودية (18 ناديًا) ----------------
  ['sau1_damac', 'sau1_wehda', 'sau1_raed', 'sau1_okhdood', 'sau1_orobah'].forEach(id => move(id, 'sau2'));
  ['sau1_najran', 'sau1_baha'].forEach(id => move(id, 'sau3'));
  ['sau2_neom', 'sau2_hazem', 'sau2_faisaly', 'sau2_abha'].forEach(id => move(id, 'sau1'));
  add('sau1', mk('sau1_diriyah', 'الدرعية', 'الدرعية', 'الدرعية', 'المملكة العربية السعودية', 'SAU', 1, 'sau_tier_1',
    64, 68, '#7c2d12', '#facc15', 9000000, 'استاد الدرعية', 12000));
  // أضعف أندية الدرجة الأولى يتراجع للثانية ليبقى العدد زوجيًا (20)
  while (lists.sau2.length > 20) {
    const weakest = [...lists.sau2].sort((a, b) => a.reputation - b.reputation)[0];
    move(weakest.id, 'sau3');
  }

  // ---------------- مصر (20 ناديًا) ----------------
  ['eg1_pharco', 'eg1_petrojet', 'eg1_haras', 'eg1_elentag', 'eg1_eastern'].forEach(id => move(id, 'egy2'));
  ['eg2_degla', 'eg2_arabcont', 'eg2_qanah', 'eg3_petrol'].forEach(id => move(id, 'egy1'));
  add('egy1', mk('eg1_abuqir', 'أبو قير للأسمدة', 'أبو قير للأسمدة', 'الإسكندرية', 'مصر', 'EGY', 1, 'egy_tier_1',
    68, 70, '#16a34a', '#ffffff', 1300000, 'استاد الإسكندرية', 12000));

  // ترتيب القوائم المتأثرة بالسمعة (الأقوى أولاً)
  Object.values(lists).forEach(l => l.sort((a, b) => b.reputation - a.reputation));
}
