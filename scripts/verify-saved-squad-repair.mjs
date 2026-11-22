import {build} from 'esbuild';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const storage=new Map();
const buildModule=async(entry)=>{
 const result=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'isolated-save-test',setup(b){
  b.onResolve({filter:/initialData$/},()=>({path:'initialData',namespace:'test'}));
  b.onResolve({filter:/trainerProfileService$/},()=>({path:'trainerProfileService',namespace:'test'}));
  b.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='initialData'?'export const INITIAL_MANAGER={};':'export const generateTrainerId=()=>"test-trainer";'}));
 }}]});
 const context={module:{exports:{}},console,Date,Math,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
 vm.runInNewContext(result.outputFiles[0].text,context);return context.module.exports;
};
const {repairSavedClubSquad}=await buildModule('src/utils/savedSquadRepair.ts');
const {migrateWorldData,runOneTimeWorldMigration,MIGRATION_STORAGE_KEY}=await buildModule('src/utils/worldMigration.ts');
const {normalizeClub}=await buildModule('src/utils/dataNormalizer.ts');
const plain=v=>JSON.parse(JSON.stringify(v));
const categories=['GK','GK',...Array(6).fill('DEF'),...Array(6).fill('MID'),...Array(6).fill('FWD')];
const squad=(count=20)=>categories.slice(0,count).map((category,i)=>({
 id:i===2?'player_transferred_egyptian':i===3?'p_gen_career_graduate':`evolved_${i}`,
 name:i===4||i===5?'Two Players Same Name':`Career Player ${i}`,age:37+i%4,position:category==='GK'?'GK':category==='DEF'?'CB':category==='MID'?'CM':'ST',positionCategory:category,
 nationality:i===2?'مصر':'إسبانيا',nationalityCode:i===2?'EGY':'ESP',overallRating:83,potentialRating:87,marketValue:999999,salary:9999,number:i+1,
 stats:{appearances:100+i,starts:90,minutes:8500,goals:73+i,assists:39,cleanSheets:11,yellowCards:8,redCards:1,shots:120,shotsOnTarget:80,passes:5000,tackles:300,saves:70,averageRating:i===0?0:8.1,motm:17,customCareerStat:123},
 attributes:{pace:80,shooting:85,passing:84,dribbling:82,defending:81,physical:79,...(category==='GK'?{goalkeeping:83}:{})},injuryWeeks:3,careerHistory:[{season:8,clubId:'previous_club',goals:27}],contractMonthsRemaining:17,
}));
const club=(players=squad(),id='esp1_barca')=>({id,name:'Career Club',shortName:'Career',country:'إسبانيا',countryCode:'ESP',leagueId:'esp_tier_1',division:1,reputation:90,budget:0,transferBudget:0,wageBudgetMonthly:0,isUserClub:true,players,tactics:{formation:'4-4-2',mentality:'attacking',startingPlayerIds:players.slice(0,11).map(p=>p.id),benchPlayerIds:players.slice(11,18).map(p=>p.id)},customClubHistory:['season-8-title']});
const checkPreserved=(original,repaired)=>{
 for(const player of original.players){
  const got=repaired.players.find(p=>p.id===player.id);assert.ok(got,`lost ${player.id}`);
  for(const field of ['name','age','stats','attributes','careerHistory','injuryWeeks','contractMonthsRemaining'])assert.deepEqual(plain(got[field]),plain(player[field]),`changed ${player.id}.${field}`);
 }
 assert.equal(repaired.budget,original.budget);assert.equal(repaired.transferBudget,original.transferBudget);assert.equal(repaired.wageBudgetMonthly,original.wageBudgetMonthly);
 assert.deepEqual(plain(repaired.customClubHistory),plain(original.customClubHistory));
};
for(const [label,input] of [
 ['evolved real club + Egyptian transfer + generated ids',club()],
 ['small real club',club(squad(12))],
 ['small fictional international club',club(squad(10),'eng_generated_career_club')],
 ['small fictional Egyptian club',{...club(squad(8),'eg4_career'),country:'مصر',countryCode:'EGY',leagueId:'egy_tier_4'}],
]){
 const before=JSON.stringify(input);const out=migrateWorldData([input],[]).teams[0];checkPreserved(input,out);assert.equal(JSON.stringify(input),before,'migration mutated input');
 assert.ok(out.players.length>=20);assert.equal(new Set(out.players.map(p=>p.id)).size,out.players.length);
 const again=migrateWorldData([out],[]).teams[0];assert.deepEqual(plain(again.players),plain(out.players),'migration must be idempotent');
 console.log(`PASS ${label}: original records preserved, additive and idempotent`);
}
{
 const input=club();const out=repairSavedClubSquad(input);assert.equal(out.players.length,input.players.length);checkPreserved(input,out);assert.equal(out.players.filter(p=>p.name==='Two Players Same Name').length,2);
 assert.deepEqual(plain(out.tactics),plain(input.tactics));console.log('PASS healthy squads and same-name distinct players unchanged');
}
{
 const input=club(squad().filter(p=>p.positionCategory!=='GK'));const out=repairSavedClubSquad(input);checkPreserved(input,out);assert.ok(out.players.filter(p=>p.positionCategory==='GK').length>=2);
 console.log('PASS missing goalkeepers repaired without replacing outfield players');
}
{
 const out=repairSavedClubSquad(club([]));assert.ok(out.players.length>=20);assert.equal(out.tactics.startingPlayerIds.length,11);assert.equal(out.tactics.benchPlayerIds.length,7);
 assert.ok(out.players.every(p=>!p.id.startsWith('barca_')&&!p.id.startsWith('real_madrid_')));
 console.log('PASS empty saved squad gets new repair depth, never first-season seed stars');
}
{
 const input=club(squad(12));const out=normalizeClub(input);checkPreserved(input,out);
 const blank=normalizeClub(club([]));assert.ok(blank.players.length>=20);assert.ok(!blank.players.some(p=>p.id.includes('yamal')||p.id.includes('lewandowski')));
 console.log('PASS save-import normalization preserves evolved data and cannot reseed Barcelona');
}
{
 storage.clear();const input=club();const first=runOneTimeWorldMigration([input],[]);assert.equal(first.wasMigratedNow,true);assert.equal(storage.get(MIGRATION_STORAGE_KEY),'true');
 const next=runOneTimeWorldMigration(first.teams,[]);assert.equal(next.wasMigratedNow,false);assert.deepEqual(plain(next.teams),plain(first.teams));
 console.log('PASS completed v4 migration is not retriggered by nationality or legacy player ids');
}
{
 const source=fs.readFileSync('src/context/GameContext.tsx','utf8');const start=source.indexOf('  const normalizeClub =');const end=source.indexOf('  const [teams, setTeams]',start);const loading=source.slice(start,end);
 assert.ok(loading.includes('repairSavedClubSquad'));assert.ok(!loading.includes('loadRealClubSquad'));
 const migration=fs.readFileSync('src/utils/worldMigration.ts','utf8');assert.ok(!migration.includes('loadRealClubSquad'));assert.ok(!migration.includes('generateClubSquad'));
 console.log('PASS load and migration paths have no whole-squad seed/replacement call');
}
