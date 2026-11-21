// End-to-end service flow verification (Stage 3).
// Run: npx tsx scripts/verify-national-teams-service.ts
import { Club, Player } from '../src/types/game';
import { REAL_SQUADS_BY_CLUB_ID } from '../src/data/realPlayersData';
import {
  acceptNationalTeamJob,
  advanceNationalTeamsToRound,
  completePostSeasonTournament,
  createEmptyNationalTeamsState,
  declineNationalTeamJob,
  generateNationalTeamJobOffer,
  initNationalTeamsForSeason,
  rehydrateNationalTeams,
  resignFromNationalTeam,
  stripNationalTeamsForSave,
} from '../src/services/nationalTeamsService';

let failures = 0;
const fail = (msg: string) => { failures++; console.error('FAIL: ' + msg); };
const ok = (msg: string) => console.log('  ok: ' + msg);

function clubsFromRealSquads(): Club[] {
  return Object.entries(REAL_SQUADS_BY_CLUB_ID).map(([clubId, squad]) => ({
    id: clubId, name: clubId, shortName: clubId.slice(0, 3), city: 'x', division: 1, reputation: 70,
    primaryColor: '#000', secondaryColor: '#fff', budget: 0, transferBudget: 0, wageBudgetMonthly: 0,
    facilities: { stadium: 1, youthAcademy: 1, trainingCenter: 1, medicalCenter: 1 },
    sponsors: [], isUserClub: false, players: squad as unknown as Player[],
  }) as unknown as Club);
}
const clubs = clubsFromRealSquads();
const TOTAL_ROUNDS = 34;

// --- Season 4: AFCON (even) + World Cup (div by 4) ---
const t0 = Date.now();
let res = initNationalTeamsForSeason(createEmptyNationalTeamsState(), 4, TOTAL_ROUNDS, clubs, null);
let state = res.state;
if (state.teams.length !== 40) fail(`universe size ${state.teams.length} != 40`);
if (!state.activeTournament || state.activeTournament.competitionId !== 'afcon') fail('AFCON should be active in season 4');
if (!state.queuedTournament || state.queuedTournament.competitionId !== 'worldcup') fail('World Cup should be queued in season 4');
ok('season 4 init: AFCON active, World Cup queued');

// idempotent re-init
const again = initNationalTeamsForSeason(state, 4, TOTAL_ROUNDS, clubs, null);
if (again.state !== state && again.messages.length !== 0) fail('re-init not idempotent');
ok('init idempotent for same season');

// advance through the whole season (league rounds + post-season window rounds)
let sawAfconChampion = false;
let sawWcChampion = false;
for (let r = 1; r <= TOTAL_ROUNDS + 13; r++) {
  const step = advanceNationalTeamsToRound(state, r, TOTAL_ROUNDS, 4, clubs);
  state = step.state;
  for (const m of step.messages) {
    if (m.title.includes('بطل') && m.content.includes('الأمم')) sawAfconChampion = true;
    if (m.title.includes('بطل') && m.content.includes('العالم')) sawWcChampion = true;
  }
}
if (!state.activeTournament || state.activeTournament.competitionId !== 'worldcup') fail('World Cup should be the active tournament after AFCON finished');
if (!state.activeTournament.isCompleted) fail('World Cup should complete within the post-season window rounds');
if (!sawAfconChampion) fail('no AFCON champion message during the season');
if (!sawWcChampion) fail('no World Cup champion message during the post-season window');
const afconDone = state.lastTournamentSeasonByCompetition.afcon === 4;
if (!afconDone) fail('AFCON season marker missing');
ok('mid-season AFCON completed, World Cup played and completed in the post-season window');

// idempotency: re-processing the same round changes nothing
const playedBefore = state.activeTournament.matches.filter(m => m.isPlayed).length;
const dup = advanceNationalTeamsToRound(state, TOTAL_ROUNDS + 13, TOTAL_ROUNDS, 4, clubs);
const playedAfter = dup.state.activeTournament?.matches.filter(m => m.isPlayed).length || 0;
if (playedAfter !== playedBefore) fail(`double-processing played extra matches (${playedBefore} -> ${playedAfter})`);
ok('round processing idempotent (StrictMode-safe)');

// season finished -> safety net is a no-op because the WC already completed
const fin = completePostSeasonTournament(state, TOTAL_ROUNDS, 4, clubs);
state = fin.state;
if (!state.activeTournament?.isCompleted || !state.activeTournament.winnerTeamId) fail('World Cup record lost at season end');
ok('post-season completion safety net is a no-op when the WC already finished');

// perf: whole-season NT processing time
console.log(`  (season NT processing took ${Date.now() - t0}ms)`);

// --- save/load round trip: stripped players rehydrate from club rosters ---
const stripped = stripNationalTeamsForSave(state);
if (stripped!.teams.some(t => t.players.length > 0)) fail('strip should empty player snapshots');
const jsonSize = JSON.stringify(stripped).length;
console.log(`  (stripped save size: ${(jsonSize / 1024).toFixed(0)} KB)`);
if (jsonSize > 400 * 1024) fail(`stripped save too large: ${jsonSize}`);
const rehydrated = rehydrateNationalTeams(stripped, clubs)!;
const egy = rehydrated.teams.find(t => t.countryCode === 'EGY');
if (!egy || egy.players.length !== 23) fail('rehydrated EGY squad != 23');
ok('save strip + rehydrate round-trip works');

// --- job offers: reputation gate, accept/decline/resign ---
let s2 = initNationalTeamsForSeason(createEmptyNationalTeamsState(), 1, TOTAL_ROUNDS, clubs, null).state;
const lowRep = generateNationalTeamJobOffer(s2, 55, 'EGY', 1);
if (lowRep.pendingJobOffers.length !== 0) fail('offer generated below reputation 70');
s2 = generateNationalTeamJobOffer(s2, 75, 'EGY', 1);
if (s2.pendingJobOffers.length !== 1) fail('no offer at reputation 75');
if (s2.pendingJobOffers[0].nationalTeamId !== 'nt_EGY') fail(`home-country preference failed: ${s2.pendingJobOffers[0].nationalTeamId}`);
const accepted = acceptNationalTeamJob(s2, s2.pendingJobOffers[0].id);
if (accepted.userNationalTeamId !== 'nt_EGY') fail('accept did not set user NT');
if (!accepted.teams.find(t => t.id === 'nt_EGY')?.isUserManaged) fail('isUserManaged not set');
const resigned = resignFromNationalTeam(accepted);
if (resigned.userNationalTeamId !== null) fail('resign failed');
const declined = declineNationalTeamJob(s2);
if (declined.pendingJobOffers.length !== 0) fail('decline failed');
ok('job offer gate (70+), home-country preference, accept/decline/resign all work');

// --- user NT result messages on advance ---
let s3 = initNationalTeamsForSeason(createEmptyNationalTeamsState(), 2, TOTAL_ROUNDS, clubs, 'nt_EGY').state;
let userMsgs = 0;
for (let r = 1; r <= TOTAL_ROUNDS + 2; r++) {
  const step = advanceNationalTeamsToRound(s3, r, TOTAL_ROUNDS, 2, clubs);
  s3 = step.state;
  userMsgs += step.messages.filter(m => m.content.includes('منتخبك')).length;
}
if (userMsgs === 0) fail('no user-NT match messages generated');
else ok(`user NT received ${userMsgs} match/friendly result messages`);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
