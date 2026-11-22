// Executes the current provider's international start/commit branches, not copied implementations.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { advanceNationalTeamsToRound, initNationalTeamsForSeason, recordUserInternationalResult, stripNationalTeamsForSave } from '../src/services/nationalTeamsService';
import { createInitialLiveMatchState } from '../src/utils/engine';
import { findUserInternationalMatch, getDueUserInternationalMatch, internationalMatchFixture, nationalTeamMatchClub } from '../src/utils/internationalLiveMatch';
const source=fs.readFileSync('src/context/GameContext.tsx','utf8');
const extract=(from:string,to:string)=>{const start=source.indexOf(from);assert.ok(start>=0);const end=source.indexOf(to,start);assert.ok(end>start);return source.slice(start,end);};
const startBranch=extract('  const startNationalTeamLiveMatch =','  // ================== END NATIONAL TEAMS WIRING');
const finishBranch=extract('  const finishLiveMatchAndAdvance =','    // Continental tournament leg watched live:')+'\n};';
const code=ts.transpileModule(startBranch+'\n'+finishBranch+'\nglobalThis.start=startNationalTeamLiveMatch;globalThis.finish=finishLiveMatchAndAdvance;', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
let state=initNationalTeamsForSeason(null,1,38,[]).state;state.userNationalTeamId='nt_EGY';state.teams=state.teams.map(t=>({...t,isUserManaged:t.id==='nt_EGY'}));state=advanceNationalTeamsToRound(state,6,38,1,[],undefined,true).state;
const due=getDueUserInternationalMatch(state,6)!;assert.ok(due);
const club={id:'club_control',budget:50000000,players:[{id:'club_player',age:30,goals:8}],tablePoints:45,date:'2026-09-20'};const before=JSON.stringify(club);
const calls:any[]=[];let saved:any,saveOverrides:any,inbox:any[]=[];
const ctx:any={console:{log(){},warn(){},error(...v:any[]){throw new Error(JSON.stringify(v));}},
 nationalTeamsRef:{current:state},liveMatchRef:{current:{fixture:{id:'active_club'}}},manager:{name:'مدرب الاختبار'},season:{seasonNumber:1},currentRound:6,totalRounds:38,seasonFinished:false,
 window:{dispatchEvent:(e:any)=>calls.push({action:'navigate',tab:e.detail?.tab})},CustomEvent:class{type:string;detail:any;constructor(type:string,v:any){this.type=type;this.detail=v?.detail;}},
 findUserInternationalMatch,getDueUserInternationalMatch,nationalTeamMatchClub,createInitialLiveMatchState,internationalMatchFixture,recordUserInternationalResult,stripNationalTeamsForSave,
 completedMatchFixtureIdRef:{current:null},isMatchFinishedRef:{current:false},isFinishingMatchRef:{current:false},liveMatchSkippedRef:{current:false},isSimulationRunningRef:{current:false},
 clearMatchSimulationTimers:()=>calls.push({action:'stopTimers'}),setLiveMatch:(v:any)=>{ctx.liveMatch=v;ctx.liveMatchRef.current=v;},saveActiveLiveMatchToDb:async(v:any)=>{saved=v;},clearActiveLiveMatchFromDb:async()=>{saved=null;},
 applyNtChampionReward:()=>calls.push({action:'championCheck'}),setNationalTeamsState:(v:any)=>{ctx.nationalTeamsRef.current=v;},setLatestNationalTeamsSnapshot:(v:any)=>calls.push({action:'ntSnapshot'}),setInbox:(fn:any)=>{inbox=fn(inbox);},flushLocalSaveImmediate:(v:any)=>{saveOverrides=v;},openNationalTeamView:()=>calls.push({action:'nationalView'}),buildNtJobCtx:()=>({reputation:75,trophiesCount:0,nationalityCode:'EGY'}),
 setTeams:()=>{throw Error('NT touched club squads');},setStandings:()=>{throw Error('NT touched league table');},setCurrentRound:()=>{throw Error('NT advanced league round');},setClubEconomy:()=>{throw Error('NT touched club finances');},
};
vm.runInNewContext(code,ctx);
assert.equal(ctx.start(due.id),false,'a club match must not be replaced');assert.equal(ctx.liveMatchRef.current.fixture.id,'active_club');
ctx.liveMatchRef.current=null;assert.equal(ctx.start(due.id),true);assert.equal(ctx.liveMatch.internationalContext.matchId,due.id);assert.equal(ctx.liveMatch.autoSubsEnabled,false);assert.equal(saved.fixture.id,due.id);
const snapshot=ctx.liveMatch;assert.equal(ctx.start(due.id),true);assert.equal(ctx.liveMatch,snapshot,'resume must not recreate the match');
ctx.liveMatch={...ctx.liveMatch,currentMinute:90,isFinished:true,isPlaying:false,homeScore:due.homeTeamId===state.userNationalTeamId?2:0,awayScore:due.awayTeamId===state.userNationalTeamId?2:0};ctx.liveMatchRef.current=ctx.liveMatch;
await ctx.finish();assert.equal(ctx.liveMatch,null);assert.equal(saved,null);assert.ok(saveOverrides.nationalTeams.friendlyMatches.find((m:any)=>m.id===due.id).isPlayed);assert.equal(ctx.nationalTeamsRef.current.teams.find((t:any)=>t.id==='nt_EGY').stats.won,1);assert.equal(inbox.length,1);assert.ok(calls.some(c=>c.action==='nationalView'));
await ctx.finish();assert.equal(ctx.nationalTeamsRef.current.teams.find((t:any)=>t.id==='nt_EGY').stats.won,1);assert.equal(JSON.stringify(club),before);
console.log('PASS actual GameContext branches: no active-club overwrite, NT start/resume, result saved once, snapshot cleared after commit, return to NT; no club squad/table/finances/date/round mutation');
