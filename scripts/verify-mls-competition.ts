import assert from 'node:assert/strict';
import { generateMLSRegularSeason } from '../src/utils/mlsCompetition';
import { MLS_CONFERENCE_BY_CLUB_ID as conferences } from '../src/data/mlsClubIds';
const clubs=Object.keys(conferences).map(id=>({id}));
for(let season=1;season<=3;season++){
 const fixtures=generateMLSRegularSeason(clubs,season);assert.equal(fixtures.length,510);assert.equal(new Set(fixtures.map(f=>f.id)).size,510);assert.equal(Math.max(...fixtures.map(f=>f.round)),34);
 for(let round=1;round<=34;round++){
  const games=fixtures.filter(f=>f.round===round);assert.equal(games.length,15);assert.equal(new Set(games.flatMap(f=>[f.homeTeamId,f.awayTeamId])).size,30,'one game per club per round');
 }
 for(const {id} of clubs){
  const games=fixtures.filter(f=>f.homeTeamId===id||f.awayTeamId===id);assert.equal(games.length,34);assert.equal(games.filter(f=>f.homeTeamId===id).length,17);
  const byOpponent=new Map<string,typeof fixtures>();for(const g of games){const other=g.homeTeamId===id?g.awayTeamId:g.homeTeamId;byOpponent.set(other,[...(byOpponent.get(other)||[]),g]);}
  assert.equal(byOpponent.size,20);let intra=0,cross=0;
  for(const [other,pair] of byOpponent){if(conferences[other]===conferences[id]){assert.equal(pair.length,2);assert.equal(pair.filter(f=>f.homeTeamId===id).length,1);intra++;}else{assert.equal(pair.length,1);cross++;}}
  assert.equal(intra,14);assert.equal(cross,6);
 }
 assert.deepEqual(generateMLSRegularSeason([...clubs].reverse(),season),fixtures,'stable across saved-team ordering');
}
assert.throws(()=>generateMLSRegularSeason(clubs.slice(0,29)));
console.log('PASS MLS 2026 adapted regular-season schedule: 30 clubs, 34 rounds, 510 matches, 17 home/17 away, 28 intra-conference + six different cross-conference opponents, no duplicate round appearances, stable ids and team-order independence');
