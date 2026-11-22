import type { Club, Fixture } from '../types/game';
import { MLS_CONFERENCE_BY_CLUB_ID } from '../data/mlsClubIds';

export const isFullMLSField = (teams: Pick<Club, 'id'>[]) => teams.length === 30 && new Set(teams.map(t => t.id)).size === 30 && teams.every(t => t.id in MLS_CONFERENCE_BY_CLUB_ID);

/** Game-generated opponents/rounds, not the published real-world fixture dates.
 * Matches the official 2026 format: 28 intra-conference + six different cross-conference opponents,
 * 17 home / 17 away. Pair the conferences' byes, then add four cross-conference rounds.
 */
export function generateMLSRegularSeason(teams: Pick<Club, 'id'>[], seasonNumber = 1): Fixture[] {
  if (!isFullMLSField(teams)) throw new Error('MLS requires all 30 distinct clubs');
  const ids = (conference: 'Eastern' | 'Western') => teams.filter(t => MLS_CONFERENCE_BY_CLUB_ID[t.id] === conference).map(t => t.id).sort();
  const east = ids('Eastern'), west = ids('Western');
  if (east.length !== 15 || west.length !== 15) throw new Error('MLS requires 15 clubs per conference');
  const conferenceRounds = (field: string[]) => {
    const rotating: (string | null)[] = [...field, null];
    const rounds: { pairs: [string, string][]; bye: string }[] = [];
    for (let r = 0; r < 15; r++) {
      const pairs: [string, string][] = []; let bye = '';
      for (let i = 0; i < 8; i++) {
        const a = rotating[i], b = rotating[15 - i];
        if (!a || !b) { bye = (a || b)!; continue; }
        pairs.push(r % 2 ? [b, a] : [a, b]);
      }
      rounds.push({ pairs, bye });
      rotating.splice(1, 0, rotating.pop()!);
    }
    return rounds;
  };
  const e = conferenceRounds(east), w = conferenceRounds(west), fixtures: Fixture[] = [];
  const add = (round: number, home: string, away: string) => fixtures.push({
    id: `mls_${seasonNumber}_reg_${round}_${home}_${away}`, round, homeTeamId: home, awayTeamId: away,
    isPlayed: false, competitionType: 'league', competitionName: 'الدوري الأمريكي MLS',
  } as Fixture);
  for (let r = 0; r < 15; r++) {
    e[r].pairs.forEach(([h, a]) => add(r + 1, h, a));
    w[r].pairs.forEach(([h, a]) => add(r + 1, h, a));
    add(r + 1, e[r].bye, w[r].bye);
    e[r].pairs.forEach(([h, a]) => add(r + 16, a, h));
    const shifted = w[(r + 1) % 15];
    shifted.pairs.forEach(([h, a]) => add(r + 16, a, h));
    add(r + 16, shifted.bye, e[r].bye);
  }
  for (let shift = 2; shift <= 5; shift++) {
    for (let i = 0; i < 15; i++) {
      const homeEast = shift % 2 === 0;
      add(29 + shift, homeEast ? e[i].bye : w[(i + shift) % 15].bye, homeEast ? w[(i + shift) % 15].bye : e[i].bye);
    }
  }
  return fixtures.sort((a, b) => a.round - b.round || a.id.localeCompare(b.id));
}
