import { Club, Player, Position, PositionCategory } from '../types/game';
import { generatePlayer } from './playerGenerator';

/**
 * Saved squads are career records, not seed data. Never reload an official squad
 * because players transferred, aged, share a name, or have legacy generated ids.
 * Only add depth/positions that are actually missing; keep valid records intact.
 */
export function repairSavedClubSquad(club: Club): Club {
  if (!club?.id) return club;
  const seen = new Set<string>();
  const players: Player[] = [];
  for (const player of Array.isArray(club.players) ? club.players : []) {
    if (!player || typeof player !== 'object' || !player.id || seen.has(player.id)) continue;
    seen.add(player.id);
    players.push(player);
  }

  const slots: { position: Position; category: PositionCategory; minimum: number }[] = [
    { position: 'GK', category: 'GK', minimum: 2 },
    { position: 'CB', category: 'DEF', minimum: 6 },
    { position: 'CM', category: 'MID', minimum: 6 },
    { position: 'ST', category: 'FWD', minimum: 4 },
  ];
  const categoryOf = (p: Player): PositionCategory => p.positionCategory ||
    (p.position === 'GK' ? 'GK' : ['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(p.position) ? 'DEF' :
      ['CM', 'CDM', 'CAM', 'LM', 'RM'].includes(p.position) ? 'MID' : 'FWD');
  const depthPositions: Position[] = ['RB', 'LB', 'CDM', 'CAM', 'RW', 'LW', 'CB', 'CM', 'ST'];
  let sequence = 0;
  const addPlayer = (position: Position, positionCategory: PositionCategory) => {
    const player = generatePlayer({
      clubId: club.id,
      countryId: club.countryCode || 'EGY',
      leagueId: club.leagueId,
      clubReputation: club.reputation || 50,
      baseLevel: Math.max(50, Math.min(78, Math.round((club.reputation || 55) * 0.94))),
      position,
      positionCategory,
    });
    // A repair is not a resurrected real player or a deterministic seed identity.
    let id = player.id;
    while (seen.has(id)) id = `${player.id}_repair_${++sequence}`;
    const usedNumbers = new Set(players.map(p => p.number));
    let number = 1;
    while (usedNumbers.has(number)) number++;
    players.push({ ...player, id, number });
    seen.add(id);
  };

  for (const slot of slots) {
    let missing = slot.minimum - players.filter(p => categoryOf(p) === slot.category).length;
    while (missing-- > 0) {
      const position = slot.category === 'DEF' ? (['CB', 'RB', 'LB'] as Position[])[sequence++ % 3]
        : slot.category === 'MID' ? (['CM', 'CDM', 'CAM'] as Position[])[sequence++ % 3]
        : slot.category === 'FWD' ? (['ST', 'RW', 'LW'] as Position[])[sequence++ % 3] : slot.position;
      addPlayer(position, slot.category);
    }
  }
  while (players.length < 20) {
    const position = depthPositions[sequence++ % depthPositions.length];
    const category: PositionCategory = ['CB', 'RB', 'LB'].includes(position) ? 'DEF'
      : ['CM', 'CDM', 'CAM'].includes(position) ? 'MID' : 'FWD';
    addPlayer(position, category);
  }

  const distinctValid = (ids: string[]) => [...new Set(ids)].filter(id => seen.has(id));
  const starting = distinctValid(Array.isArray(club.tactics?.startingPlayerIds) ? club.tactics.startingPlayerIds : []).slice(0, 11);
  const available = players.filter(p => !starting.includes(p.id));
  if (starting.length < 11 && !starting.some(id => categoryOf(players.find(p => p.id === id)!) === 'GK')) {
    const keeper = available.find(p => categoryOf(p) === 'GK');
    if (keeper) starting.unshift(keeper.id);
  }
  for (const player of available) if (starting.length < 11 && !starting.includes(player.id)) starting.push(player.id);
  const bench = distinctValid(Array.isArray(club.tactics?.benchPlayerIds) ? club.tactics.benchPlayerIds : []).filter(id => !starting.includes(id)).slice(0, 7);
  for (const player of players) if (bench.length < 7 && !starting.includes(player.id) && !bench.includes(player.id)) bench.push(player.id);
  return {
    ...club,
    players,
    tactics: {
      ...(club.tactics || { formation: '4-3-3', mentality: 'balanced', passingStyle: 'mixed', pressingIntensity: 'balanced', tempo: 'balanced' }),
      startingPlayerIds: starting,
      benchPlayerIds: bench,
    } as Club['tactics'],
  };
}
