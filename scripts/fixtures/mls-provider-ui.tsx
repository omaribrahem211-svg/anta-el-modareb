import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider, useGame } from '../../src/context/GameContext';
import { LanguageProvider } from '../../src/utils/i18n';
import { MLSCompetitionPanel } from '../../src/components/MLSCompetitionPanel';
import { MatchesTab } from '../../src/components/MatchesTab';
import { PlayerModal } from '../../src/components/PlayerModal';
import { GLOBAL_LEAGUES } from '../../src/data/leaguesData';
import { INITIAL_MANAGER } from '../../src/data/initialData';
import { CalendarManager } from '../../src/services/calendarManager';
import { ensureMLSPlayoffs } from '../../src/utils/mlsPlayoffs';
import { recalculateStandingsFromFixtures } from '../../src/utils/engine';
import { createInitialLiveMatchState } from '../../src/utils/engine';
import { formatCalendarDate, parseDateString } from '../../src/utils/calendarEngine';
import { gameStateRepository } from '../../src/services/gameStateRepository';

async function init() {
 if (!localStorage.getItem('mls_provider_seeded')) {
  const league=GLOBAL_LEAGUES.usa_tier_1;
  const teams=league.teams.map(c=>({...c,isUserClub:c.id==='mls_inter_miami_cf'}));
  const rank=(id:string)=>id==='mls_inter_miami_cf'?-1:teams.findIndex(c=>c.id===id);
  let fixtures:any[]=CalendarManager.generateMasterSchedule({seasonNumber:1,activeLeague:league,teams}).map(f=>({...f,isPlayed:true,homeScore:rank(f.homeTeamId)<rank(f.awayTeamId)?2:0,awayScore:rank(f.awayTeamId)<rank(f.homeTeamId)?2:0}));
  const standings=recalculateStandingsFromFixtures([],teams,fixtures);
  fixtures=ensureMLSPlayoffs(fixtures,standings).map(f=>f.mlsPlayoff?{...f,isPlayed:true,homeScore:2,awayScore:0,winnerTeamId:f.homeTeamId}:f);
  fixtures=ensureMLSPlayoffs(fixtures,standings);
  const semi=new URLSearchParams(location.search).has('semi');
  if(semi){
   for(let i=0;i<2;i++){fixtures=fixtures.map(f=>f.mlsPlayoff?.stage==='round_one'?{...f,isPlayed:true,homeScore:f.homeTeamId===f.mlsPlayoff.higherSeedTeamId?2:0,awayScore:f.awayTeamId===f.mlsPlayoff.higherSeedTeamId?2:0,winnerTeamId:f.mlsPlayoff.higherSeedTeamId}:f);fixtures=ensureMLSPlayoffs(fixtures,standings);}
  }
  const fixture=fixtures.find(f=>f.mlsPlayoff?.stage===(semi?'conference_semi':'round_one')&&(f.homeTeamId==='mls_inter_miami_cf'||f.awayTeamId==='mls_inter_miami_cf'));
  if(!fixture)throw Error('Missing provider test fixture');
  const season={seasonId:'test_mls_1',seasonNumber:1,startDate:'2026-08-15',endDate:'2027-05-30',currentRound:semi?39:36,totalRounds:41,status:'active',leagueId:league.id,leagueName:league.name,divisionTier:1};
  const manager={...INITIAL_MANAGER,name:'مدرب MLS',currentClubId:'mls_inter_miami_cf',userClubId:'mls_inter_miami_cf',reputation:85,level:10,isUnemployed:false,updateGift207Received:true,coachingLicense:'PRO',trophies:[]};
  const payload:any={schemaVersion:2,saveVersion:2,lastLocalSaveAt:Date.now(),activeLeague:league,teams,standings,fixtures,currentRound:semi?39:36,season,manager,transferMarket:[],incomingBids:[],inbox:[],cupTournament:null,jobOffers:[],seasonEndSummary:null,transferHistory:[],clubEconomy:{},calendarDate:formatCalendarDate(parseDateString(fixture.date)),activeNegotiations:[],boardSystem:null,dailyNews:[],retiredPlayers:[],worldRankings:{},scoutedOpponents:{}};
  for (const key of ['season','manager','currentRound','calendarDate']) localStorage.setItem('anta_el_modareb_save_v1_'+key,JSON.stringify(payload[key]));
  localStorage.setItem('anta_el_modareb_save_v1_activeLeague',JSON.stringify({id:league.id}));
  await gameStateRepository.saveLocalGameState(payload,{urgent:true});
  if(semi){const home=teams.find(t=>t.id===fixture.homeTeamId)!;const away=teams.find(t=>t.id===fixture.awayTeamId)!;let live=createInitialLiveMatchState(fixture,home,away,home.tactics,"mls_inter_miami_cf");live={...live,currentMinute:105,isExtraTime:true,isHalfTime:true,isPlaying:false,homeScore:1,awayScore:1,homeTactics:{...live.homeTactics,tacticalStyle:'wing_play'}};localStorage.setItem('anta_el_modareb_save_v1_active_live_match',JSON.stringify(live));}
  localStorage.setItem('mls_provider_seeded','yes');
 }
 function Harness(){
  const game=useGame();const [screen,setScreen]=useState<'league'|'match'|'player'>('league');
  (window as any).__game=game;(window as any).__screen=setScreen;
  return <div dir="rtl"><nav className="flex gap-2 mb-3 text-xs"><button className="bg-slate-800 p-2 rounded" onClick={()=>setScreen('league')}>الدوري</button><button className="bg-slate-800 p-2 rounded" onClick={()=>setScreen('match')}>المباراة</button><button className="bg-slate-800 p-2 rounded" onClick={()=>setScreen('player')}>ميسي</button></nav>
   <p id="provider-state" className="text-[10px] text-slate-400 mb-2">{game.activeLeague.id} • الجولة {game.currentRound} • {game.seasonFinished?'انتهى الموسم':'الموسم مستمر'}</p>
   {screen==='league'?<MLSCompetitionPanel standings={game.standings} fixtures={game.fixtures} teams={game.teams} userClubId={game.userClub?.id}/>:screen==='player'?<PlayerModal player={game.userClub?.players.find(p=>p.id==='mls_19054') || null} onClose={()=>setScreen('league')}/>:<MatchesTab/>}
  </div>;
 }
 createRoot(document.getElementById('root')!).render(<LanguageProvider><GameProvider><Harness/></GameProvider></LanguageProvider>);
}
init().catch(err=>{document.body.innerText=err.stack;throw err;});
