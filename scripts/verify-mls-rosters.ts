import assert from 'node:assert/strict';
import { buildMLSRealSquads, MLS_DATA_NOTE } from '../src/data/mlsSquads';
import facts from '../src/data/mls2026RosterFacts.json';
const first = buildMLSRealSquads(), second = buildMLSRealSquads();
assert.deepEqual(first, second, 'conversion must be deterministic');
assert.equal(Object.keys(first).length, 30);
const players = Object.values(first).flat();
assert.equal(players.length, 832);
assert.equal(new Set(players.map(p => p.id)).size, 832, 'no player may be assigned to two clubs');
for (const club of facts.clubs) {
  const squad = first[club.id];
  assert.equal(squad.length, club.players.length);
  assert.equal(new Set(squad.map(p => p.number)).size, squad.length, 'game shirt assignments must be unique');
  for (const player of squad) {
    const source = club.players.find(p => p.id === player.id)!;
    assert.equal(player.birthDate, source.birthDate);
    assert.equal(player.nationalityCode, source.nationalityCode);
    assert.equal(player.clubId, club.id);
    assert.equal(player.isGameFiller, false);
    assert.equal(player.gameDataNote, MLS_DATA_NOTE);
    assert.equal(player.isPreferredFootEstimated, source.preferredFoot == null);
    assert.equal(player.sourceShirtNumber, source.number);
    if (source.preferredFoot) assert.equal(player.preferredFoot, source.preferredFoot);
    if (source.position) assert.equal(player.position, source.position);
    assert.ok(player.nationalityCode.match(/^[A-Z]{3}$/));
    assert.ok(player.age >= 15 && player.age <= 46);
    assert.ok(['GK','CB','RB','LB','CDM','CM','CAM','RW','LW','ST'].includes(player.position));
    assert.ok(player.rosterSourceUrls.length >= 2);
    assert.ok(Number.isFinite(player.overallRating));
    assert.ok(Number.isFinite(player.marketValue));
  }
}
const messi = first.mls_inter_miami_cf.find(p => p.id === 'mls_19054')!;
assert.ok(messi);
assert.equal(messi.name, 'ليونيل ميسي');
assert.equal(messi.age, 39);
assert.equal(messi.position, 'RW');
assert.equal(messi.preferredFoot, 'left');
assert.equal(messi.number, 10);
assert.equal(messi.nationalityCode, 'ARG');
assert.equal(messi.overallRating, 91, 'same balancing baseline as the existing in-game Messi');
assert.equal(players.filter(p => p.isPositionAdapted).length, 19);
assert.equal(first.mls_la_galaxy.filter(p => p.position === 'GK').length, 1, 'known depth gap must not silently create another real goalkeeper');
console.log(`MLS roster conversion passed: ${players.length} supported biographies, 30 clubs, stable IDs, explicit game parameters and Messi.`);
