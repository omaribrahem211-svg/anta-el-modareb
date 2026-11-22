import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider } from '../../src/utils/i18n';
import { NationalTeamView } from '../../src/components/national/NationalTeamView';
import { MatchesTab } from '../../src/components/MatchesTab';
import { initNationalTeamsForSeason } from '../../src/services/nationalTeamsService';
import { nationalTeamForLivePlay, nationalTeamMatchClub, internationalMatchFixture, controlledLiveClub, substituteInternationalPlayer } from '../../src/utils/internationalLiveMatch';
import { createInitialLiveMatchState } from '../../src/utils/engine';
const initial=initNationalTeamsForSeason(null,2,38,[]).state;
const home=initial.teams.find(t=>t.countryCode==='EGY')!;
const away=initial.teams.find(t=>t.countryCode==='NGA')!;
initial.userNationalTeamId=home.id;home.isUserManaged=true;
const pending={id:'nt_visual',competitionId:'afcon',stage:'quarter',stageName:'ربع النهائي',homeTeamId:home.id,awayTeamId:away.id,roundTrigger:28,isPlayed:false} as any;
initial.friendlyMatches=[pending];
const career={...nationalTeamMatchClub(home),id:'career_control',name:'نادي الاختبار',budget:50000000};
const noop=()=>{};
function Harness(){
 const [nt,setNt]=useState(home),[live,setLive]=useState<any>(null),[screen,setScreen]=useState('national');
 const calls=(window as any).calls ||= [];
 const change=(t:any)=>{calls.push({action:'tactics',tactics:t});if(live)setLive({...live,homeTactics:t});else setNt({...nt,tactics:t});};
 const ctx:any={nationalTeamsState:initial,userNationalTeam:nationalTeamForLivePlay(nt),pendingInternationalMatch:pending,
  setNationalTeamLineup:(ids:any)=>{calls.push({action:'lineup',ids});setNt({...nt,userStartingIds:ids});},
  setNationalTeamTactics:change,refreshNationalTeamCallUp:noop,resignFromNationalTeam:noop,liveMatch:live,
  startNationalTeamLiveMatch:()=>{let m=createInitialLiveMatchState(internationalMatchFixture(pending),nationalTeamMatchClub(nt),nationalTeamMatchClub(away),nt.tactics,home.id);m={...m,internationalContext:{matchId:pending.id,competitionId:'afcon',stage:'quarter',userTeamId:home.id,seasonNumber:2},autoSubsEnabled:false,currentMinute:32,isPlaying:false};setLive(m);setScreen('match');return true;},
  userClub:career,manager:{name:'مدرب الاختبار',reputation:70,dailyPoints:0},teams:[career],fixtures:[],currentRound:28,totalRounds:38,season:{seasonNumber:2},userCalendarSchedule:[],calendarSchedule:[],scoutedOpponents:[],
  updateTactics:change,setFormation:(f:any)=>change({...controlledLiveClub(live,career).tactics,formation:f}),changeLiveMentality:(v:any)=>change({...controlledLiveClub(live,career).tactics,mentality:v}),changeLivePressing:(v:any)=>change({...controlledLiveClub(live,career).tactics,pressingIntensity:v}),
  toggleLiveAutoSubs:()=>setLive({...live,autoSubsEnabled:!live.autoSubsEnabled}),
  makeLiveSubstitution:(out:string,inc:string)=>{const r=substituteInternationalPlayer(live,out,inc);if(r.success)setLive(r.match);calls.push({action:'sub',success:r.success,out,inc});return r;},
  pauseLiveMatch:()=>setLive({...live,isPlaying:false}),resumeLiveMatch:()=>setLive({...live,isPlaying:true}),setMatchSpeed:noop,skipLiveMatchToEnd:noop,finishLiveMatchAndAdvance:noop,
  resumeSecondHalf:()=>{calls.push({action:'resume',minute:live.currentMinute});setLive({...live,isHalfTime:false,isPlaying:false});},recordUserMatchAction:noop,
 };
 (window as any).__ntCtx=ctx;
 (window as any).setMode=(mode:string)=>{setScreen('match');setLive((m:any)=>({...m,currentMinute:mode==='extra'?90:mode==='finished'?120:32,isHalfTime:mode==='extra',isExtraTime:mode==='extra'||mode==='finished',isFinished:mode==='finished',isPlaying:false,homeScore:1,awayScore:1,homePenalties:mode==='finished'?3:undefined,awayPenalties:mode==='finished'?4:undefined}));};
 return <div dir="rtl">{screen==='national'?<NationalTeamView/>:<MatchesTab/>}</div>;
}
createRoot(document.getElementById('root')!).render(<LanguageProvider><Harness/></LanguageProvider>);
