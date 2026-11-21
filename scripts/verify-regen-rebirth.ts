// Verification for the regen-rebirth system (feature/regen-rebirth).
// Run with: npx tsx scripts/verify-regen-rebirth.ts
import { buildRebornPlayer, shouldRebornPlayer, REBIRTH_MIN_RATING, REBIRTH_MAX_POTENTIAL } from '../src/utils/regenRebirthEngine';
import { advanceWorldEra, agePlayer } from '../src/utils/worldTransferEngine';
import { GLOBAL_LEAGUES, EGYPT_TIER_4_LEAGUE } from '../src/data/leaguesData';
import type { Player, Club } from '../src/types/game';

let failures = 0;
function check(cond: boolean, label: string) {
  if (cond) console.log(`  PASS ${label}`);
  else { failures++; console.error(`  FAIL ${label}`); }
}

const stats = (g = 0, a = 0, apps = 0): Player['stats'] => ({
  appearances: apps, starts: apps, minutes: apps * 90, goals: g, assists: a, cleanSheets: 0,
  yellowCards: 0, redCards: 0, shots: 0, shotsOnTarget: 0, passes: 0, tackles: 0, saves: 0,
  averageRating: 7.4, motm: 3,
});

function fakeStar(over: Partial<Player> = {}): Player {
  return {
    id: 'star_1', name: 'محمد صلاح', firstName: 'محمد', lastName: 'صلاح',
    age: 36, position: 'RW', positionCategory: 'FWD',
    overallRating: 90, potentialRating: 90,
    attributes: { pace: 91, shooting: 88, passing: 84, dribbling: 90, defending: 45, physical: 75, goalkeeping: 20 },
    nationality: 'مصر', nationalityCode: 'EGY',
    currentClubId: 'club_x', currentLeagueId: 'league_x',
    marketValue: 5000000, salary: 60000, contractYears: 1,
    fitness: 95, morale: 88, form: 8, number: 11, stats: stats(24, 11, 34),
    ...over,
  } as Player;
}

console.log('== 1) shouldRebornPlayer threshold ==');
check(shouldRebornPlayer(fakeStar({ overallRating: 78 })) === true, 'rating 78 -> reborn');
check(shouldRebornPlayer(fakeStar({ overallRating: 92 })) === true, 'rating 92 -> reborn');
check(shouldRebornPlayer(fakeStar({ overallRating: 77 })) === false, 'rating 77 -> no reborn');
check(shouldRebornPlayer(null) === false, 'null -> no reborn');
check(REBIRTH_MIN_RATING === 78, 'threshold constant = 78');

console.log('== 2) buildRebornPlayer profile copy (200 runs) ==');
{
  let ok = true;
  for (let i = 0; i < 200; i++) {
    const rb = buildRebornPlayer(fakeStar(), { idSuffix: 's5', clubId: 'club_x', leagueId: 'league_x' });
    if (rb.name !== 'محمد صلاح') ok = false;                       // same name (the reborn concept)
    if (rb.nationality !== 'مصر' || rb.nationalityCode !== 'EGY') ok = false; // same nationality
    if (rb.position !== 'RW' || rb.positionCategory !== 'FWD') ok = false;    // same position
    if (rb.age < 17 || rb.age > 19) ok = false;                               // 17-19
    if (rb.potentialRating < 87 || rb.potentialRating > 90) ok = false;       // within 0-3 of the 90 peak
    const gap = rb.potentialRating - rb.overallRating;
    if (gap < 10 || gap > 14) ok = false;                                     // starts 10-14 below potential
    if (rb.overallRating < 55) ok = false;
    if (rb.id === 'star_1' || !rb.id.startsWith('reborn_star_1_')) ok = false; // new unique id
    if ((rb as any)._rebornOf !== 'star_1') ok = false;                        // archive link only
    if (rb.stats.appearances !== 0 || rb.stats.goals !== 0) ok = false;        // fresh career stats
    if (rb.contractYears !== 3 || rb.fitness !== 100) ok = false;
    if ((rb as any).isLegend) ok = false;                                      // reborn is mortal, not a legend card
    if (rb.firstName !== 'محمد' || rb.lastName !== 'صلاح') ok = false;
  }
  check(ok, 'reborn keeps name/nationality/position, 17-19, potential near peak, fresh stats, new id, mortal');
}
{
  // Legend (105 rated) rebirth: potential capped at 92 like regular youth.
  const rb = buildRebornPlayer(fakeStar({ overallRating: 105, isLegend: true } as any), { idSuffix: 's9', clubId: 'club_x' });
  check(rb.potentialRating === REBIRTH_MAX_POTENTIAL, `legend reborn potential capped at ${REBIRTH_MAX_POTENTIAL} (got ${rb.potentialRating})`);
  check(rb.overallRating >= 78 && rb.overallRating <= 82, `legend reborn starts 78-82 (got ${rb.overallRating})`);
  check((rb as any).isLegend !== true, 'reborn does NOT inherit isLegend');
}
{
  // 78-rated borderline retiree.
  const rb = buildRebornPlayer(fakeStar({ overallRating: 78, potentialRating: 78 }), { idSuffix: 's2', clubId: 'club_x' });
  check(rb.potentialRating >= 75 && rb.potentialRating <= 78, `78-rated retiree -> potential within 0-3 of peak (got ${rb.potentialRating})`);
  check(rb.overallRating >= 61 && rb.overallRating <= 68, `78-rated retiree -> starts 10-14 below potential (got ${rb.overallRating})`);
}

console.log('== 3) agePlayer retirement curve shifted one year ==');
{
  const club = { id: 'club_x', name: 'X', players: [] } as unknown as Club;
  let retiredAt35 = 0, retiredAt40 = 0;
  for (let era = 1; era <= 60; era++) {
    if (agePlayer(fakeStar({ id: `p35_${era}`, age: 34, overallRating: 80, potentialRating: 80 }), era, club) === null) retiredAt35++; // turns 35: must NEVER retire
    if (agePlayer(fakeStar({ id: `p41_${era}`, age: 40, overallRating: 80, potentialRating: 80 }), era, club) === null) retiredAt40++; // turns 41: mandatory
  }
  check(retiredAt35 === 0, `age 35 never retires across 60 seeds (retired ${retiredAt35})`);
  check(retiredAt40 === 60, `age 41 mandatory across 60 seeds (retired ${retiredAt40})`);
  const survivor = agePlayer(fakeStar({ id: 'grow_1', age: 22, overallRating: 70, potentialRating: 85 }), 1, club);
  check(survivor !== null && survivor.age === 23, 'young player ages +1 and survives');
}

console.log('== 4) advanceWorldEra end-to-end on the real static database ==');
{
  const before: { id: string; name: string; pos: string; nat?: string; rating: number; clubId: string }[] = [];
  const leagues = [...Object.values(GLOBAL_LEAGUES || {}), EGYPT_TIER_4_LEAGUE];
  {
    const seen0 = new Set<string>();
    leagues.forEach(l => (l?.teams || []).forEach(c => {
      if (!c?.id || seen0.has(c.id)) return;
      seen0.add(c.id);
      (c.players || []).forEach(p => {
        if ((p.age || 0) >= 35 && p.overallRating >= REBIRTH_MIN_RATING) {
          before.push({ id: p.id, name: p.name, pos: p.position, nat: p.nationalityCode, rating: p.overallRating, clubId: c.id });
        }
      });
    }));
  }
  console.log(`  notable players (78+) aged 35+ in the world before era 1: ${before.length}`);

  // The static data has pre-existing cross-file duplicates (same real player in two data files) -
  // count them BEFORE the era so we only assert the rebirth path adds none of its own.
  const forEachUniqueClub = (fn: (c: any) => void) => {
    const seenClubs = new Set<string>();
    leagues.forEach(l => (l?.teams || []).forEach(c => { if (c?.id && !seenClubs.has(c.id)) { seenClubs.add(c.id); fn(c); } }));
  };
  const ids0 = new Set<string>();
  let dupBaseline = 0;
  forEachUniqueClub(c => (c.players || []).forEach((p: Player) => { if (ids0.has(p.id)) dupBaseline++; ids0.add(p.id); }));
  console.log(`  pre-existing duplicate ids in static data: ${dupBaseline}`);

  const r1 = advanceWorldEra(1);
  console.log(`  era 1: retired=${r1.retired} youth=${r1.youth} retiredStars=${r1.retiredStars.length}`);

  // Collect every reborn now living in the static squads.
  const reborns: (Player & { _rebornOf?: string })[] = [];
  const allIds = new Set<string>();
  let dupIds = 0;
  forEachUniqueClub(c => (c.players || []).forEach((p: Player) => {
    if (allIds.has(p.id)) dupIds++;
    allIds.add(p.id);
    if (p.id.startsWith('reborn_')) reborns.push(p as any);
  }));
  console.log(`  reborns created in era 1: ${reborns.length}`);
  check(dupIds === dupBaseline, `rebirth added no new duplicate player ids (baseline ${dupBaseline}, after era 1: ${dupIds})`);
  const rebornIds = reborns.map(rb => rb.id);
  check(new Set(rebornIds).size === rebornIds.length, 'reborn ids are all unique');
  check(reborns.length > 0, 'at least one reborn was created');

  // Every reborn: profile must match a real retiree from the pre-era snapshot.
  const byId = new Map(before.map(b => [b.id, b]));
  let mismatch = 0;
  const rebornOfSeen = new Set<string>();
  for (const rb of reborns) {
    const orig = byId.get((rb as any)._rebornOf || '');
    if (!orig) { mismatch++; continue; }
    if (rb.name !== orig.name || rb.position !== orig.pos) mismatch++;
    if (rb.age < 17 || rb.age > 19) mismatch++;
    if (rb.potentialRating < orig.rating - 3 || rb.potentialRating > Math.min(REBIRTH_MAX_POTENTIAL, orig.rating)) mismatch++;
    if (rb.stats.appearances !== 0 || rb.stats.goals !== 0) mismatch++;
    if (rebornOfSeen.has(orig.id)) mismatch++; // one reborn per retiree
    rebornOfSeen.add(orig.id);
    // the retiree himself must be GONE from the squads (no two of the same player at once)
    if (allIds.has(orig.id)) mismatch++;
  }
  check(mismatch === 0, `every reborn matches his retiree (name/position/age/potential/fresh stats), one per retiree, retiree removed (mismatches: ${mismatch})`);

  // Every retired star named in the report (80+) must have a reborn successor.
  const missing = r1.retiredStars.filter(s => !reborns.some(rb => rb.name === s.name));
  check(missing.length === 0, `every reported retired star has a reborn successor (missing: ${missing.map(m => m.name).join(', ') || 'none'})`);

  // Eras 2+3 still run cleanly and ids stay unique.
  advanceWorldEra(2);
  advanceWorldEra(3);
  const ids2 = new Set<string>();
  let dup2 = 0;
  forEachUniqueClub(c => (c.players || []).forEach((p: Player) => { if (ids2.has(p.id)) dup2++; ids2.add(p.id); }));
  check(dup2 === dupBaseline, `rebirth added no new duplicate ids after 3 eras (baseline ${dupBaseline}, now ${dup2})`);
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
