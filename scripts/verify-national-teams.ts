// Sanity verification for the national-teams engine (Stage 1).
// Run: npx tsx scripts/verify-national-teams.ts
import { Club, Player } from '../src/types/game';
import { REAL_SQUADS_BY_CLUB_ID } from '../src/data/realPlayersData';
import {
  buildNationalTeams,
  nationalTeamToClub,
  selectCallUpSquad,
  collectNationalPool,
} from '../src/utils/nationalTeamsEngine';
import { simulateMatch } from '../src/utils/engine';

function clubsFromRealSquads(): Club[] {
  return Object.entries(REAL_SQUADS_BY_CLUB_ID).map(([clubId, squad]) => ({
    id: clubId,
    name: clubId,
    shortName: clubId.slice(0, 3),
    city: 'x',
    division: 1,
    reputation: 70,
    primaryColor: '#000',
    secondaryColor: '#fff',
    budget: 0,
    transferBudget: 0,
    wageBudgetMonthly: 0,
    facilities: { stadium: 1, youthAcademy: 1, trainingCenter: 1, medicalCenter: 1 },
    sponsors: [],
    isUserClub: false,
    players: squad as unknown as Player[],
  }) as unknown as Club);
}

const clubs = clubsFromRealSquads();
const pool = collectNationalPool(clubs);
console.log(`clubs=${clubs.length} players=${clubs.reduce((s, c) => s + c.players.length, 0)} nationalities=${pool.size}`);

const nts = buildNationalTeams(clubs);
console.log(`nationalTeams=${nts.length} real=${nts.filter(t => !t.isStatistical).length} statistical=${nts.filter(t => t.isStatistical).length}`);

let failures = 0;
const fail = (msg: string) => { failures++; console.error('FAIL: ' + msg); };

for (const nt of nts) {
  if (!nt.isStatistical) {
    if (nt.players.length !== 23) fail(`${nt.countryCode}: squad size ${nt.players.length} != 23`);
    const ids = new Set(nt.players.map(p => p.id));
    if (ids.size !== nt.players.length) fail(`${nt.countryCode}: duplicate player ids in squad`);
    const gks = nt.players.filter(p => p.positionCategory === 'GK' || p.position === 'GK');
    if (gks.length < 1) fail(`${nt.countryCode}: no goalkeeper`);
    const wrongNat = nt.players.filter(p => (p.nationalityCode || '').toUpperCase() !== nt.countryCode);
    if (wrongNat.length) fail(`${nt.countryCode}: ${wrongNat.length} players with wrong nationality`);
  } else if (nt.players.length !== 0) {
    fail(`${nt.countryCode}: statistical team has players`);
  }
  if (!nt.worldRank) fail(`${nt.countryCode}: missing worldRank`);
}

// AFCON field check: 16 African teams
const african = nts.filter(t => t.continent === 'AFRICA');
console.log(`africanTeams=${african.length} (need 16 for AFCON)`);
if (african.length !== 16) fail(`AFCON field is ${african.length}, expected 16`);

// World Cup field: 32 strongest
const wc = [...nts].sort((a, b) => b.rankingPoints - a.rankingPoints).slice(0, 32);
console.log(`worldCupField=${wc.length} weakest=${wc[31]?.countryCode}(${wc[31]?.footballLevel})`);

// Adapter + match sim: real squad (ESP or EGY) vs statistical team (SEN)
const real = nts.find(t => !t.isStatistical && t.players.length === 23)!;
const stat = nts.find(t => t.countryCode === 'SEN')!;
const res = simulateMatch(nationalTeamToClub(real), nationalTeamToClub(stat));
console.log(`sim ${real.countryCode} ${res.homeScore}-${res.awayScore} ${stat.countryCode} events=${res.events.length}`);
if (res.homeScore < 0 || res.awayScore < 0) fail('simulateMatch returned invalid score');

console.log('\nReal-squad national teams:');
for (const nt of nts.filter(t => !t.isStatistical)) {
  const top11 = [...nt.players].sort((a, b) => b.overallRating - a.overallRating).slice(0, 11);
  const avg = (top11.reduce((s, p) => s + p.overallRating, 0) / top11.length).toFixed(1);
  console.log(`  ${nt.flag} ${nt.countryCode} ${nt.name}: rep=${nt.reputation} topXIavg=${avg}`);
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
