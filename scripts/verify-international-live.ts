import assert from 'node:assert/strict';
import { createInitialLiveMatchState, simulateMatchStep } from '../src/utils/engine';
import { controlledLiveClub, findUserInternationalMatch, getDueUserInternationalMatch, hasPendingUserInternationalTournament, internationalMatchFixture, nationalTeamForLivePlay, nationalTeamMatchClub, substituteInternationalPlayer } from '../src/utils/internationalLiveMatch';
import { advanceNationalTeamsToRound, completePostSeasonTournament, initNationalTeamsForSeason, recordUserInternationalResult, stripNationalTeamsForSave } from '../src/services/nationalTeamsService';
import type { InternationalMatch, NationalTeamsState } from '../src/types/nationalTeams';

const plain=(v:any)=>JSON.parse(JSON.stringify(v));
const managedState=(season:number):NationalTeamsState=>{
 const state=initNationalTeamsForSeason(null,season,38,[]).state;
 const id=state.queuedTournament?.participantTeamIds.find(id=>state.activeTournament?.participantTeamIds.includes(id)) || state.activeTournament?.participantTeamIds[0] || state.queuedTournament?.participantTeamIds[0] || state.teams[0].id;
 state.userNationalTeamId=id;state.teams=state.teams.map(t=>({...t,isUserManaged:t.id===id}));
 if(state.activeTournament)state.activeTournament={...state.activeTournament,userTeamId:id};
 if(state.queuedTournament)state.queuedTournament={...state.queuedTournament,userTeamId:id};
 return state;
};
const liveFixture=(stage:InternationalMatch['stage']='group')=>{
 const state=managedState(2);const home=state.teams.find(t=>t.id===state.userNationalTeamId)!;const away=state.teams.find(t=>t.id!==home.id)!;
 const match:InternationalMatch={id:`nt_test_${stage}`,competitionId:'worldcup',stage,stageName:'كأس العالم',roundTrigger:39,homeTeamId:home.id,awayTeamId:away.id,isPlayed:false};
 const homeClub=nationalTeamMatchClub(home),awayClub=nationalTeamMatchClub(away);
 const live=createInitialLiveMatchState(internationalMatchFixture(match),homeClub,awayClub,homeClub.tactics,home.id);
 live.internationalContext={matchId:match.id,competitionId:match.competitionId,stage,userTeamId:home.id,seasonNumber:2};live.autoSubsEnabled=false;
 return live;
};
{
 const state=managedState(2),before=JSON.stringify(state);const nt={...state.teams.find(t=>t.id===state.userNationalTeamId)!,isStatistical:true,players:[]};
 const a=nationalTeamForLivePlay(nt),b=nationalTeamForLivePlay(nt);
 assert.ok(a.players.length>=18);assert.deepEqual(a.players.map(p=>p.id),b.players.map(p=>p.id));assert.ok(a.players.every(p=>(p as any).isNationalMatchPlaceholder));
 assert.equal(JSON.stringify(state),before);assert.ok(a.players.every(p=>!p.currentClubId));
 console.log('PASS statistical NT: deterministic labelled match slots; original NT/club data untouched');
}
{
 // World-pool call-ups: countries built from the world database get real players, never generic "لاعب <country> N" names.
 const state=managedState(2);const nt=state.teams.find(t=>t.id===state.userNationalTeamId)!;
 const a=nationalTeamForLivePlay(nt);
 assert.ok(a.players.length>=18);assert.ok(a.players.every(p=>!/^(لاعب|حارس) /.test(p.name)),'no generic placeholder names');
 console.log('PASS world-pool NT: live squad keeps real call-up names');
}
{
 const state=managedState(2),before=JSON.stringify(state);const advanced=advanceNationalTeamsToRound(state,30,38,2,[],undefined,true).state;
 const due=getDueUserInternationalMatch(advanced,30);assert.ok(due);assert.equal(due.isPlayed,false);
 assert.equal(advanced.teams.find(t=>t.id===advanced.userNationalTeamId)!.stats.played,0);
 assert.ok(advanced.activeTournament!.matches.some(m=>m.isPlayed));assert.equal(JSON.stringify(state),before);
 console.log('PASS international-break advancement simulates AI, holds every due user match, never mutates input');
 let current=advanced,played=0;
 while(!current.activeTournament!.isCompleted&&played<10){
  const match=getDueUserInternationalMatch(current,30);assert.ok(match,'next user knockout/group game must stay playable');
  const home=match.homeTeamId===current.userNationalTeamId;
  const result=recordUserInternationalResult(current,match.id,{homeScore:home?3:0,awayScore:home?0:3},30,38,2);
  const again=recordUserInternationalResult(result.state,match.id,{homeScore:0,awayScore:0},30,38,2);
  assert.equal(again.state,result.state,'double result commit must be a no-op');current=result.state;played++;
 }
 assert.equal(current.activeTournament!.isCompleted,true);assert.equal(current.activeTournament!.winnerTeamId,current.userNationalTeamId);assert.equal(current.activeTournament!.matches.filter(m=>m.isPlayed&&(m.homeTeamId===current.userNationalTeamId||m.awayTeamId===current.userNationalTeamId)).length,6);
 assert.equal(current.teams.find(t=>t.id===current.userNationalTeamId)!.stats.played,played);
 assert.equal(hasPendingUserInternationalTournament(current),false);
 console.log('PASS AFCON groups through final: six controlled results, correct bracket, rankings and idempotent commits');
}
{
 const state=managedState(1);const advanced=advanceNationalTeamsToRound(state,6,38,1,[],undefined,true).state;
 const match=getDueUserInternationalMatch(advanced,6);assert.ok(match);assert.equal(match.competitionId,'friendly');
 const result=recordUserInternationalResult(advanced,match.id,{homeScore:1,awayScore:1},6,38,1);
 assert.equal(result.state.friendlyMatches.find(m=>m.id===match.id)!.isPlayed,true);assert.equal(getDueUserInternationalMatch(result.state,6),undefined);
 assert.equal(result.state.teams.find(t=>t.id===state.userNationalTeamId)!.stats.drawn,1);
 console.log('PASS friendly waits for user and records a normal draw once');
}
{
 const state=managedState(4);const first=completePostSeasonTournament(state,38,4,[],undefined,true).state;
 assert.ok(getDueUserInternationalMatch(first,38,true));assert.notEqual(first.postSeasonCompletedForSeason,4);
 assert.equal(hasPendingUserInternationalTournament(first),true);
 assert.ok(stripNationalTeamsForSave(first)!.teams.every(t=>t.players.length===0));
 let current=first, played=0;
 while(hasPendingUserInternationalTournament(current)&&played<20){
  const match=getDueUserInternationalMatch(current,38,true);
  if(match){const home=match.homeTeamId===current.userNationalTeamId;current=recordUserInternationalResult(current,match.id,{homeScore:home?2:0,awayScore:home?0:2},38,38,4,true).state;played++;}
  current=completePostSeasonTournament(current,38,4,[],undefined,true).state;
 }
 assert.equal(hasPendingUserInternationalTournament(current),false,'both tournaments must complete without skipping a controlled match');
 assert.equal(current.activeTournament?.competitionId,'worldcup');assert.equal(current.activeTournament?.winnerTeamId,state.userNationalTeamId);
 assert.equal(current.postSeasonCompletedForSeason,4);assert.equal(played,13);
 console.log('PASS post-season AFCON and queued World Cup: all 13 controlled games, safe season gate and final completion marker; compact save');
}
{
 const group=liveFixture('group');group.currentMinute=90;group.homeScore=1;group.awayScore=1;
 const result=simulateMatchStep(group,group.homeTactics);assert.equal(result.isFinished,true);assert.equal(result.homePenalties,undefined);assert.equal(result.isExtraTime,undefined);
 console.log('PASS World Cup group draw stays a draw, despite cup wording in fixture branding');
}
{
 let live=liveFixture('quarter');live.currentMinute=90;live.homeScore=1;live.awayScore=1;
 live=simulateMatchStep(live,live.homeTactics);assert.equal(live.isExtraTime,true);assert.equal(live.isHalfTime,true);assert.equal(live.isFinished,false);
 live={...live,isHalfTime:false,isPlaying:true,currentMinute:104};live=simulateMatchStep(live,live.homeTactics);assert.equal(live.currentMinute,105);assert.equal(live.isHalfTime,true);
 live={...live,isHalfTime:false,isPlaying:true,currentMinute:120};live=simulateMatchStep(live,live.homeTactics);
 assert.equal(live.isFinished,true);assert.equal(live.currentMinute,120);assert.notEqual(live.homePenalties,live.awayPenalties);
 console.log('PASS knockout tie: playable extra-time halves, 105-minute break and decisive penalties after 120');
}
{
 let live=liveFixture();const club=controlledLiveClub(live,{} as any);const before=JSON.stringify(live.homeTeam.players);
 const out=live.homeLineup[2],incoming=club.tactics!.benchPlayerIds[0];let result=substituteInternationalPlayer(live,out,incoming);assert.equal(result.success,true);live=result.match;
 assert.ok(live.homeLineup.includes(incoming));assert.ok(!live.homeLineup.includes(out));assert.equal(live.substitutionsCount,1);assert.equal(JSON.stringify(live.homeTeam.players),before);
 assert.equal(substituteInternationalPlayer(live,incoming,out).success,false,'exited player must never re-enter');
 assert.equal(substituteInternationalPlayer({...live,substitutionsCount:5},live.homeLineup[3],club.tactics!.benchPlayerIds[1]).success,false);
 const afterStep=simulateMatchStep({...live,isHalfTime:false},live.homeTactics);assert.ok(afterStep.homeLineup.includes(incoming));assert.ok(!afterStep.homeLineup.includes(out));
 console.log('PASS live substitution persists through engine steps, respects five-sub limit and prevents re-entry');
}
{
 const live=liveFixture();const changed={...live.homeTactics,mentality:'attacking' as const,pressingIntensity:'high' as const,tacticalStyle:'counter_attack' as const};
 const after=simulateMatchStep(live,changed);assert.equal(after.homeTactics.mentality,'attacking');assert.equal(after.homeTactics.pressingIntensity,'high');assert.equal(after.homeTactics.tacticalStyle,'counter_attack');
 console.log('PASS same league engine applies national mentality, pressing and match style');
}
{
 let live=liveFixture();const awayId=live.awayTeam.id;
 live={...live,homeTeam:{...live.homeTeam,isUserClub:false},awayTeam:{...live.awayTeam,isUserClub:true},userClubId:awayId,internationalContext:{...live.internationalContext!,userTeamId:awayId}};
 const away=controlledLiveClub(live,{} as any);assert.equal(away.id,awayId);
 const out=live.awayLineup[2],incoming=away.tactics!.benchPlayerIds[0];const result=substituteInternationalPlayer(live,out,incoming);assert.equal(result.success,true);
 assert.deepEqual(result.match.homeLineup,live.homeLineup);assert.ok(result.match.awayLineup.includes(incoming));assert.ok(!result.match.awayLineup.includes(out));
 const updated=simulateMatchStep(result.match,{...away.tactics!,tacticalStyle:'wing_play',mentality:'attacking'});
 assert.equal(updated.awayTactics.tacticalStyle,'wing_play');assert.equal(updated.awayTactics.mentality,'attacking');
 console.log('PASS away-team control: correct XI, substitutions and live tactics; home lineup unchanged');
}
{
 let live=liveFixture('quarter');const excluded=live.homeLineup.slice(0,2);live={...live,currentMinute:120,homeScore:1,awayScore:1,isExtraTime:true,homeLineup:live.homeLineup.filter(id=>!excluded.includes(id)),homeReddedPlayerIds:excluded};
 const random=Math.random;let result;try{Math.random=()=>0.1;result=simulateMatchStep(live,live.homeTactics);}finally{Math.random=random;}
 const names=new Set(live.homeTeam.players.filter(p=>live.homeLineup.includes(p.id)).map(p=>p.name));
 for(const event of result!.events.filter(e=>e.type==='goal'&&e.teamId===live.homeTeam.id))assert.ok(names.has(event.playerName!),'shootout must use only active players, without reds, exited players or invented replacement takers');
 assert.equal(result!.isFinished,true);assert.notEqual(result!.homePenalties,result!.awayPenalties);
 console.log('PASS shootout uses active players only, including sudden-death repeat with nine available');
}
console.log('PASS all international live-match core regressions');
