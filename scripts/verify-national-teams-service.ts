// End-to-end service flow verification (Stage 3).
// Run: npx tsx scripts/verify-national-teams-service.ts
import { Club, Player } from '../src/types/game';
import { REAL_SQUADS_BY_CLUB_ID } from '../src/data/realPlayersData';
import {
  acceptNationalTeamJob,
  advanceNationalTeamsToRound,
  applyTournamentContractOutcome,
  completePostSeasonTournament,
  createEmptyNationalTeamsState,
  declineNationalTeamJob,
  generateNationalTeamJobOffer,
  initNationalTeamsForSeason,
  rehydrateNationalTeams,
  resignFromNationalTeam,
  stripNationalTeamsForSave,
} from '../src/services/nationalTeamsService';
import {
  defaultAfconSchedule,
  defaultWorldCupSchedule,
  shouldHoldAfcon,
  shouldHoldWorldCup,
} from '../src/utils/internationalTournamentEngine';

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
// Canada joins with MLS; USA replaces its former statistical entry, never duplicates it.
if (state.teams.length !== 41) fail(`universe size ${state.teams.length} != 41`);
if(new Set(state.teams.map(t=>t.countryCode)).size!==state.teams.length) fail('duplicate national country');
for(const code of ['USA','CAN']) if(state.teams.filter(t=>t.countryCode===code).length!==1) fail('expected one '+code+' team');
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

// --- job offers: tiered gate (50+ score), progression, accept/decline/resign ---
let s2 = initNationalTeamsForSeason(createEmptyNationalTeamsState(), 1, TOTAL_ROUNDS, clubs, null).state;
const lowRep = generateNationalTeamJobOffer(s2, 49, 'EGY', 1);
if (lowRep.pendingJobOffers.length !== 0) fail('offer generated below score 50');
// Entry level (rep 55, no trophies): weak NTs only (< 780 pts), Egypt (820) out of reach
s2 = generateNationalTeamJobOffer(s2, 55, 'EGY', 1);
if (s2.pendingJobOffers.length !== 1) fail('no offer at score 55');
const entryPick = s2.teams.find(t => t.id === s2.pendingJobOffers[0].nationalTeamId)!;
if (entryPick.rankingPoints >= 780) fail(`entry-level offer too strong: ${entryPick.name} (${entryPick.rankingPoints})`);
if (entryPick.id === 'nt_EGY') fail('entry-level offer should not reach Egypt-tier teams');
// Progression via trophies: rep 50 + 4 trophies => score 62 => mid tier (< 850)
const s2b = generateNationalTeamJobOffer(initNationalTeamsForSeason(createEmptyNationalTeamsState(), 1, TOTAL_ROUNDS, clubs, null).state, 50, 'BRA', 1, 4);
const midPick = s2b.teams.find(t => t.id === s2b.pendingJobOffers[0]?.nationalTeamId);
if (!midPick || midPick.rankingPoints >= 850 || midPick.rankingPoints < 780) fail(`trophy-boosted offer not in mid band: ${midPick?.name} (${midPick?.rankingPoints})`);
// Home preference when home country is within reach: rep 75 Egyptian gets Egypt (820 < 900 ceiling)
const s2c = generateNationalTeamJobOffer(initNationalTeamsForSeason(createEmptyNationalTeamsState(), 1, TOTAL_ROUNDS, clubs, null).state, 75, 'EGY', 1);
if (s2c.pendingJobOffers[0]?.nationalTeamId !== 'nt_EGY') fail(`home preference within reach failed: ${s2c.pendingJobOffers[0]?.nationalTeamId}`);
// Elite: rep 90 with a home country in the universe gets home (Brazil); with none, the strongest NT overall
const s2home = generateNationalTeamJobOffer(initNationalTeamsForSeason(createEmptyNationalTeamsState(), 1, TOTAL_ROUNDS, clubs, null).state, 90, 'BRA', 1);
if (s2home.pendingJobOffers[0]?.nationalTeamId !== 'nt_BRA') fail(`elite home preference failed: ${s2home.pendingJobOffers[0]?.nationalTeamId}`);
const s2d = generateNationalTeamJobOffer(initNationalTeamsForSeason(createEmptyNationalTeamsState(), 1, TOTAL_ROUNDS, clubs, null).state, 90, 'ZZZ', 1);
const elitePick = s2d.teams.find(t => t.id === s2d.pendingJobOffers[0]?.nationalTeamId)!;
const strongest = [...s2d.teams].sort((a, b) => b.rankingPoints - a.rankingPoints)[0];
if (elitePick.id !== strongest.id) fail(`elite offer not the strongest NT: ${elitePick.name} vs ${strongest.name}`);
ok('tiered offers: gate 50, weak-first, trophy progression, home preference, elite ceiling');

// accept / resign / decline (declined + resigned teams are not re-offered this season)
const accepted = acceptNationalTeamJob(s2c, s2c.pendingJobOffers[0].id);
if (accepted.userNationalTeamId !== 'nt_EGY') fail('accept did not set user NT');
if (!accepted.teams.find(t => t.id === 'nt_EGY')?.isUserManaged) fail('isUserManaged not set');
const resigned = resignFromNationalTeam(accepted);
if (resigned.userNationalTeamId !== null) fail('resign failed');
if (!(resigned.declinedOfferTeamIds || []).includes('nt_EGY')) fail('resigned team not excluded from future offers');
const reOffered = generateNationalTeamJobOffer(resigned, 90, 'EGY', 1);
if (reOffered.pendingJobOffers[0]?.nationalTeamId === 'nt_EGY') fail('resigned team re-offered in same season');
const declined = declineNationalTeamJob(s2c);
if (declined.pendingJobOffers.length !== 0) fail('decline failed');
if (!(declined.declinedOfferTeamIds || []).includes('nt_EGY')) fail('declined team not recorded');
ok('accept/resign/decline with same-season re-offer exclusion');

// --- contract ends after a completed tournament, next offer lined up ---
const afconDoneTournament = {
  id: 'afcon_s2', competitionId: 'afcon' as const, name: 'كأس الأمم الإفريقية', trophyName: 'كأس الأمم الإفريقية',
  seasonNumber: 2, groups: [], matches: [], participantTeamIds: ['nt_EGY'],
  currentStage: 'completed' as const, isCompleted: true, winnerTeamId: 'nt_SDN', runnerUpTeamId: 'nt_EGY', userTeamId: 'nt_EGY',
};
const contractRes = applyTournamentContractOutcome(accepted, afconDoneTournament as any, { reputation: 56, trophiesCount: 0, nationalityCode: 'EGY' }, 2);
if (contractRes.state.userNationalTeamId !== null) fail('contract not ended after tournament');
if (contractRes.state.teams.find(t => t.id === 'nt_EGY')?.isUserManaged) fail('isUserManaged not cleared at contract end');
if (!contractRes.messages.some(m => m.title.includes('انتهى عقدك'))) fail('no contract-end message');
if (contractRes.state.pendingJobOffers.length !== 1) fail('no replacement offer after contract end');
const replPick = contractRes.state.teams.find(t => t.id === contractRes.state.pendingJobOffers[0].nationalTeamId)!;
if (replPick.rankingPoints >= 780) fail('replacement offer should be entry band at score 56');
// champion boost: winning the tournament credits +6 rep +1 trophy before the next offer (56 -> 65: mid band)
const wonRes = applyTournamentContractOutcome(accepted, { ...afconDoneTournament, winnerTeamId: 'nt_EGY' } as any, { reputation: 56, trophiesCount: 0, nationalityCode: 'BRA' }, 2);
const wonPick = wonRes.state.pendingJobOffers[0] ? wonRes.state.teams.find(t => t.id === wonRes.state.pendingJobOffers[0].nationalTeamId)! : null;
if (!wonPick || wonPick.rankingPoints < 780 || wonPick.rankingPoints >= 850) fail(`champion-boosted offer not mid band: ${wonPick?.name} (${wonPick?.rankingPoints})`);
// idempotent: no user NT -> no-op
const noop = applyTournamentContractOutcome(contractRes.state, afconDoneTournament as any, { reputation: 90, trophiesCount: 9 }, 2);
if (noop.state !== contractRes.state || noop.messages.length !== 0) fail('contract outcome not idempotent');
ok('contract ends after tournament, boosted next offer, idempotent');

// --- calendar alignment: cycles and schedules ---
for (const [s, exp] of [[1, false], [2, true], [3, false], [4, true], [6, true]] as const) {
  if (shouldHoldAfcon(s) !== exp) fail(`AFCON cycle wrong for season ${s}`);
}
for (const [s, exp] of [[2, false], [4, true], [6, false], [8, true]] as const) {
  if (shouldHoldWorldCup(s) !== exp) fail(`World Cup cycle wrong for season ${s}`);
}
const afSched = defaultAfconSchedule(TOTAL_ROUNDS);
const afTriggers = [...afSched.groupMatchdays, ...Object.values(afSched.knockout)] as number[];
if (afTriggers.some(t => t < 1 || t > TOTAL_ROUNDS)) fail(`AFCON triggers out of season: ${afTriggers}`);
if (![...afTriggers].every((t, i) => i === 0 || t > afTriggers[i - 1])) fail(`AFCON triggers not ascending: ${afTriggers}`);
const wcSched = defaultWorldCupSchedule(TOTAL_ROUNDS);
const wcTriggers = [...wcSched.groupMatchdays, ...Object.values(wcSched.knockout)] as number[];
if (wcTriggers.some(t => t <= TOTAL_ROUNDS)) fail(`WC triggers should all be post-season: ${wcTriggers}`);
if (![...wcTriggers].every((t, i) => i === 0 || t > wcTriggers[i - 1])) fail(`WC triggers not ascending: ${wcTriggers}`);
// every AFCON match is played by the last league round (no unfinished business mid-season)
let calState = initNationalTeamsForSeason(createEmptyNationalTeamsState(), 2, TOTAL_ROUNDS, clubs, null).state;
for (let r = 1; r <= TOTAL_ROUNDS; r++) calState = advanceNationalTeamsToRound(calState, r, TOTAL_ROUNDS, 2, clubs).state;
const unfinishedAfcon = (calState.activeTournament?.matches || []).filter(m => !m.isPlayed);
if (unfinishedAfcon.length > 0) fail(`${unfinishedAfcon.length} AFCON matches unplayed after round ${TOTAL_ROUNDS}`);
if (!calState.activeTournament?.isCompleted) fail('AFCON not completed within the season calendar');
// friendly history survives season rollover (record vs visible matches consistency)
if ((calState.friendlyMatches || []).length === 0) fail('no friendlies recorded during season 2');
const calNext = initNationalTeamsForSeason(calState, 3, TOTAL_ROUNDS, clubs, null).state;
if ((calNext.friendlyMatches || []).length === 0) fail('friendly history wiped at season rollover');
if ((calNext.declinedOfferTeamIds || []).length !== 0) fail('declined offers should reset each season');
ok('calendar: cycles, in-season AFCON schedule, post-season WC, full completion, friendly history kept');

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
