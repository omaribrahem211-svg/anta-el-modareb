import assert from 'node:assert/strict';
import { MLS_CLUBS } from '../src/data/mlsClubsData';
import { GLOBAL_LEAGUES } from '../src/data/leaguesData';
import { generateMLSRegularSeason } from '../src/utils/mlsCompetition';
import { ensureMLSPlayoffs, sortMLSStandings, mlsChampionId, mlsConferenceStandings } from '../src/utils/mlsPlayoffs';
import { recalculateStandingsFromFixtures, createInitialLiveMatchState, simulateMatchStep } from '../src/utils/engine';
import { processMatchResult } from '../src/services/tournamentDispatcher';
import { calculateSeasonEndSummary } from '../src/utils/seasonEngine';
import { INITIAL_MANAGER } from '../src/data/initialData';
import { pruneFixturesForStorage } from '../src/utils/storage/indexedDbStorage';
import { simulateMultipleLeagueRounds } from '../src/utils/batchSimulationEngine';
import { CalendarManager } from '../src/services/calendarManager';
import { migrateWorldData } from '../src/utils/worldMigration';
import type { Fixture } from '../src/types/game';

async function main() {
 const clubs=MLS_CLUBS;
 assert.equal(clubs.length,30);
 const migrated=migrateWorldData(clubs,[],'usa_tier_1').teams;
 for(const c of migrated){assert.equal(c.countryCode,clubs.find(t=>t.id===c.id)!.countryCode);assert.equal(c.players.length,clubs.find(t=>t.id===c.id)!.players.length);}
 assert.equal(migrated.find(c=>c.id==='mls_inter_miami_cf')!.countryCode,'USA');
 assert.equal(migrated.find(c=>c.id==='mls_inter_miami_cf')!.players.find(p=>p.id==='mls_19054')!.countryOfBirth,undefined);
 assert.equal(clubs.filter(c=>c.countryCode==='CAN').length,3);
 for(const c of clubs){ assert.equal(c.continent,'NORTH_AMERICA'); assert.ok(c.players.filter(p=>p.position==='GK').length>=3); assert.equal(new Set(c.players.map(p=>p.id)).size,c.players.length); assert.equal(c.tactics.startingPlayerIds.length,11); assert.equal(new Set(c.tactics.startingPlayerIds).size,11);assert.ok(c.players.filter(p=>p.isGameFiller).every(p=>p.name.includes('افتراضي'))); }
 assert.equal(clubs.flatMap(c=>c.players).filter(p=>p.isGameFiller===false).length,832);
 const messi=clubs.find(c=>c.id==='mls_inter_miami_cf')!.players.find(p=>p.id==='mls_19054')!;
 assert.equal(messi.overallRating,91); assert.equal(messi.birthDate,'1987-06-24'); assert.equal(messi.isGuestStar,undefined); assert.equal(messi.currentClubId,'mls_inter_miami_cf');
 const calendar=CalendarManager.generateMasterSchedule({seasonNumber:1,activeLeague:GLOBAL_LEAGUES.usa_tier_1,teams:clubs});
 assert.equal(calendar.length,510);assert.equal(Math.max(...calendar.map(f=>f.round)),34);assert.ok(calendar.every(f=>f.date));
 const regular=calendar.map((f,i)=>({...f,isPlayed:true,homeScore:(i%4===0?0:2),awayScore:1}));
 const table=recalculateStandingsFromFixtures([],clubs,regular);
 assert.ok(table.every(r=>r.played===34));
 const sorted=sortMLSStandings(table,regular); const east=mlsConferenceStandings(table,regular,'Eastern'),west=mlsConferenceStandings(table,regular,'Western');
 assert.equal(east.length,15);assert.equal(west.length,15);
 assert.equal(ensureMLSPlayoffs(regular.slice(1),table).length,509,'no bracket before all 510 regular games');
 let fixtures=ensureMLSPlayoffs(regular,table);
 assert.equal(fixtures.length,512);assert.equal(ensureMLSPlayoffs(fixtures,table),fixtures,'idempotent append');
 for(const rows of [east,west]){const wc=fixtures.find(f=>f.homeTeamId===rows[7].teamId&&f.mlsPlayoff?.stage==='wildcard')!;assert.ok(wc);assert.equal(wc.awayTeamId,rows[8].teamId);}
 const draw=fixtures.find(f=>f.mlsPlayoff?.stage==='wildcard')!;
 const home=clubs.find(c=>c.id===draw.homeTeamId)!,away=clubs.find(c=>c.id===draw.awayTeamId)!;
 let live=createInitialLiveMatchState(draw,home,away,home.tactics,home.id);live={...live,currentMinute:90,homeScore:1,awayScore:1,autoSubsEnabled:false};
 live=simulateMatchStep(live);assert.equal(live.isFinished,true);assert.equal(live.isExtraTime,undefined);assert.notEqual(live.homePenalties,live.awayPenalties);assert.ok(live.events.filter(e=>e.isPenaltyShootout).every(e=>e.minute===90));assert.equal(live.events.filter(e=>e.type==='goal'&&!e.isPenaltyShootout).length,0);
 let games=0;
 while(!mlsChampionId(fixtures)&&games<34){
  const f=fixtures.filter(f=>f.mlsPlayoff&&!f.isPlayed).sort((a,b)=>a.round-b.round)[0];assert.ok(f,'bracket must not stall');
  // Deliberately force every Round One series to three games, and one wildcard upset.
  const chooseAway=f.mlsPlayoff!.stage==='wildcard';
  const played={...f,isPlayed:true,homeScore:chooseAway?0:2,awayScore:chooseAway?2:0,winnerTeamId:chooseAway?f.awayTeamId:f.homeTeamId};
  const result=await processMatchResult(played,{fixtures,standings:table,teams:clubs,cupTournament:null,continentalTournament:null});
  assert.deepEqual(result.updatedStandings,table,'playoff must not add standings points or appearances');
  fixtures=JSON.parse(JSON.stringify(pruneFixturesForStorage(result.updatedFixtures,f.round)));
  assert.equal(new Set(fixtures.map(f=>f.id)).size,fixtures.length);games++;
 }
 assert.equal(games,33);assert.ok(mlsChampionId(fixtures));
 assert.equal(fixtures.filter(f=>f.mlsPlayoff?.stage==='round_one').length,24);
 for(const f of fixtures.filter(f=>f.mlsPlayoff?.stage==='round_one')){
  const m=f.mlsPlayoff!;assert.equal(f.homeTeamId,m.gameNumber===2?m.lowerSeedTeamId:m.higherSeedTeamId);
 }
 const final=fixtures.find(f=>f.mlsPlayoff?.stage==='mls_cup')!;
 assert.ok(sorted.findIndex(r=>r.teamId===final.homeTeamId)<sorted.findIndex(r=>r.teamId===final.awayTeamId));
 assert.equal(recalculateStandingsFromFixtures(table,clubs,fixtures).every(r=>r.played===34),true);
 const champion=clubs.find(c=>c.id===mlsChampionId(fixtures))!;
 const summary=calculateSeasonEndSummary({seasonNumber:1,totalRounds:41,currentRound:42,status:'completed'} as any,table,champion,GLOBAL_LEAGUES.usa_tier_1,null,INITIAL_MANAGER,null,fixtures);
 assert.equal(summary.resultStatus,'champion');assert.equal(summary.leagueTrophyAwarded,'كأس MLS');
 const premature=calculateSeasonEndSummary({seasonNumber:1,totalRounds:34,currentRound:35,status:'completed'} as any,table,clubs.find(c=>c.id===table[0].teamId)!,GLOBAL_LEAGUES.usa_tier_1,null,INITIAL_MANAGER,null,regular);
 assert.equal(premature.leagueTrophyAwarded,undefined,'Supporters Shield must not become a premature MLS Cup');
 const sf=fixtures.find(f=>f.mlsPlayoff?.stage==='conference_semi')!;
 let extra=createInitialLiveMatchState(sf,clubs.find(c=>c.id===sf.homeTeamId)!,clubs.find(c=>c.id===sf.awayTeamId)!);
 extra={...extra,currentMinute:90,homeScore:0,awayScore:0,autoSubsEnabled:false};extra=simulateMatchStep(extra);assert.equal(extra.currentMinute,90);assert.equal(extra.isExtraTime,true);assert.equal(extra.isHalfTime,true);assert.equal(extra.isFinished,false);
 extra={...extra,currentMinute:104,isHalfTime:false};extra=simulateMatchStep(extra);assert.equal(extra.currentMinute,105);assert.equal(extra.isHalfTime,true);
 extra={...extra,currentMinute:120,isHalfTime:false,homeScore:0,awayScore:0};extra=simulateMatchStep(extra);assert.equal(extra.isFinished,true);assert.notEqual(extra.homePenalties,extra.awayPenalties);
 const batch=simulateMultipleLeagueRounds(41,1,41,clubs,recalculateStandingsFromFixtures([],clubs,[]),generateMLSRegularSeason(clubs),GLOBAL_LEAGUES.usa_tier_1);
 assert.ok(mlsChampionId(batch.nextFixtures),'bulk simulation must advance all playoff stages');assert.ok(batch.nextStandings.every(r=>r.played===34));assert.equal(batch.seasonFinished,true);
 console.log('PASS MLS full competition: real squads/depth, calendar, 34-game standings, wildcard, best-of-3, ET, hosting, saved bracket, champion versus Shield, and bulk season.');
}
main().catch(err=>{console.error(err);process.exit(1);});
