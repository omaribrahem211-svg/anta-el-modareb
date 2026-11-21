// End-to-end verification for the international tournament engine (Stage 2).
// Run: npx tsx scripts/verify-international-tournaments.ts
import { Club, Player } from '../src/types/game';
import { REAL_SQUADS_BY_CLUB_ID } from '../src/data/realPlayersData';
import { buildNationalTeams } from '../src/utils/nationalTeamsEngine';
import {
  defaultAfconSchedule,
  defaultWorldCupSchedule,
  initInternationalTournament,
  processInternationalRound,
  recalculateInternationalGroupStandings,
  shouldHoldAfcon,
  shouldHoldWorldCup,
} from '../src/utils/internationalTournamentEngine';
import { InternationalGroup, InternationalMatch } from '../src/types/nationalTeams';

let failures = 0;
const fail = (msg: string) => { failures++; console.error('FAIL: ' + msg); };
const ok = (msg: string) => console.log('  ok: ' + msg);

// ---- cycle predicates ----
if (!shouldHoldAfcon(2) || shouldHoldAfcon(3) || !shouldHoldAfcon(4)) fail('AFCON cycle wrong');
else ok('AFCON every 2 seasons');
if (!shouldHoldWorldCup(4) || shouldHoldWorldCup(2) || !shouldHoldWorldCup(8)) fail('World Cup cycle wrong');
else ok('World Cup every 4 seasons');

// ---- standings correctness (constraint: points system must be correct) ----
const grp: InternationalGroup = {
  id: 'g0',
  name: 'test',
  teamIds: ['nt_A', 'nt_B', 'nt_C', 'nt_D'],
  standings: [],
};
const fake = (h: string, a: string, hs: number, as: number): InternationalMatch => ({
  id: `${h}${a}`, competitionId: 'afcon', stage: 'group', stageName: '', groupId: 'g0',
  roundTrigger: 1, homeTeamId: h, awayTeamId: a, homeScore: hs, awayScore: as, isPlayed: true,
});
// A wins all (9); B and C both reach 4 (B ahead on GD); D last with 1
const m = [
  fake('nt_A', 'nt_B', 2, 0), fake('nt_C', 'nt_D', 2, 1),
  fake('nt_A', 'nt_C', 3, 1), fake('nt_B', 'nt_D', 2, 0),
  fake('nt_A', 'nt_D', 1, 0), fake('nt_B', 'nt_C', 1, 1),
];
const table = recalculateInternationalGroupStandings(grp, m);
const pts = table.map(r => `${r.teamId}:${r.points}`);
console.log('  table:', pts.join(' '));
if (table[0].teamId !== 'nt_A' || table[0].points !== 9) fail('A should top with 9');
if (table[1].teamId !== 'nt_B' || table[1].points !== 4) fail('B should be 2nd with 4 (GD tiebreak)');
if (table[2].teamId !== 'nt_C' || table[2].points !== 4) fail('C should be 3rd with 4');
if (table[3].teamId !== 'nt_D' || table[3].points !== 0) fail('D should be last with 0');
if (table[0].won !== 3 || table[1].drawn !== 1) fail('W/D counts wrong');
else ok('standings: 3/1/0 points, ordering, W/D/L correct');

// GD tiebreak: X and Y both 4 pts, X better GD
const m2 = [
  fake('nt_A', 'nt_B', 4, 0), fake('nt_C', 'nt_D', 1, 0),
  fake('nt_A', 'nt_C', 0, 2), fake('nt_B', 'nt_D', 0, 1),
  fake('nt_A', 'nt_D', 1, 0), fake('nt_B', 'nt_C', 1, 0),
];
const t2 = recalculateInternationalGroupStandings(grp, m2);
// A: W4-0 L0-2 W1-0 = 6pts GD+3 ; B: L0-4 L0-1 W1-0 = 3pts ; C: W1-0 W2-0 L0-1 = 6pts GD+2 ; D: 3 losses 0
if (t2[0].teamId !== 'nt_A' || t2[1].teamId !== 'nt_C') fail(`GD tiebreak wrong: ${t2.map(r => r.teamId).join(',')}`);
else ok('goal-difference tiebreak correct');

// ---- full tournament runs ----
function clubsFromRealSquads(): Club[] {
  return Object.entries(REAL_SQUADS_BY_CLUB_ID).map(([clubId, squad]) => ({
    id: clubId, name: clubId, shortName: clubId.slice(0, 3), city: 'x', division: 1, reputation: 70,
    primaryColor: '#000', secondaryColor: '#fff', budget: 0, transferBudget: 0, wageBudgetMonthly: 0,
    facilities: { stadium: 1, youthAcademy: 1, trainingCenter: 1, medicalCenter: 1 },
    sponsors: [], isUserClub: false, players: squad as unknown as Player[],
  }) as unknown as Club);
}
const nts = buildNationalTeams(clubsFromRealSquads());
const TOTAL_ROUNDS = 34;

function runTournament(comp: 'afcon' | 'worldcup', season: number, expectedMatches: number, expectedGroups: number) {
  const schedule = comp === 'afcon' ? defaultAfconSchedule(TOTAL_ROUNDS) : defaultWorldCupSchedule(TOTAL_ROUNDS);
  let t = initInternationalTournament(comp, season, nts, schedule, comp === 'afcon' ? 'nt_EGY' : 'nt_GER');
  console.log(`\n${comp}: field=${t.participantTeamIds.length} groups=${t.groups.length} groupMatches=${t.matches.length}`);
  if (t.groups.length !== expectedGroups) fail(`${comp}: ${t.groups.length} groups, expected ${expectedGroups}`);
  if (t.groups.some(g => g.teamIds.length !== 4)) fail(`${comp}: a group does not have exactly 4 teams`);
  if (t.groups.some(g => new Set(g.teamIds).size !== 4)) fail(`${comp}: duplicate team in a group`);
  const allTeams = new Set(t.groups.flatMap(g => g.teamIds));
  if (allTeams.size !== t.participantTeamIds.length) fail(`${comp}: a team appears in two groups`);

  let guard = 0;
  while (!t.isCompleted && ++guard < 100) {
    for (let r = 0; r <= TOTAL_ROUNDS + 14; r++) {
      const res = processInternationalRound(t, r, nts, schedule);
      t = res.tournament;
    }
    break;
  }
  if (!t.isCompleted) fail(`${comp}: did not complete`);
  if (t.matches.length !== expectedMatches) fail(`${comp}: ${t.matches.length} matches, expected ${expectedMatches}`);
  const unplayed = t.matches.filter(x => !x.isPlayed);
  if (unplayed.length) fail(`${comp}: ${unplayed.length} unplayed matches`);
  const knockoutNoWinner = t.matches.filter(x => x.stage !== 'group' && !x.winnerTeamId);
  if (knockoutNoWinner.length) fail(`${comp}: ${knockoutNoWinner.length} knockout matches without winner`);
  if (!t.winnerTeamId || !t.runnerUpTeamId) fail(`${comp}: missing winner/runner-up`);
  // each team played exactly 3 group matches
  for (const g of t.groups) {
    for (const row of g.standings) {
      if (row.played !== 3) fail(`${comp}: ${row.teamId} played ${row.played} group matches`);
      const calcPts = row.won * 3 + row.drawn;
      if (row.points !== calcPts) fail(`${comp}: ${row.teamId} points ${row.points} != ${calcPts}`);
      if (row.goalDifference !== row.goalsFor - row.goalsAgainst) fail(`${comp}: GD mismatch for ${row.teamId}`);
      if (row.played !== row.won + row.drawn + row.lost) fail(`${comp}: W+D+L != played for ${row.teamId}`);
    }
  }
  const winner = nts.find(n => n.id === t.winnerTeamId);
  console.log(`  champion: ${winner?.flag} ${winner?.name} (rank ${winner?.worldRank})`);
  ok(`${comp} completed correctly`);
}

runTournament('afcon', 2, 31, 4);   // 24 group + 4 QF + 2 SF + 1 F
runTournament('worldcup', 4, 63, 8); // 48 group + 8 R16 + 4 QF + 2 SF + 1 F

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
