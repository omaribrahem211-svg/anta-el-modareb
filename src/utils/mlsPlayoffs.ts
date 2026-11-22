import type { Fixture, LeagueStanding } from '../types/game';
import { MLS_CONFERENCE_BY_CLUB_ID } from '../data/mlsClubIds';
export type MLSPlayoffStage = 'wildcard' | 'round_one' | 'conference_semi' | 'conference_final' | 'mls_cup';
export interface MLSPlayoffMetadata {
  stage: MLSPlayoffStage;
  conference?: 'Eastern' | 'Western';
  seriesId: string;
  gameNumber: number;
  higherSeedTeamId: string;
  lowerSeedTeamId: string;
  seasonNumber: number;
}
export const MLS_MAX_ROUNDS = 41;
export const isMLSPlayoff = (fixture?: Fixture | null) => !!fixture?.mlsPlayoff;
export const mlsUsesExtraTime = (fixture?: Fixture | null) => !!fixture?.mlsPlayoff && !['wildcard', 'round_one'].includes(fixture.mlsPlayoff.stage);
export const mlsChampionId = (fixtures: Fixture[]) => fixtures.find(f => f.mlsPlayoff?.stage === 'mls_cup' && f.isPlayed)?.winnerTeamId;
const stableDraw = (s: string) => [...s].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 17);

/** MLS points, wins, goal difference, goals, then tied-club intraconference mini-table.
 * Discipline is modelled from recorded match stats/cards; missing staff warnings count as zero.
 * Remaining full ties use a stable seeded draw, not the real league's actual coin toss.
 */
export function sortMLSStandings(rows: LeagueStanding[], fixtures: Fixture[] = []): LeagueStanding[] {
  const regular = fixtures.filter(f => !f.mlsPlayoff && f.isPlayed && f.homeScore != null && f.awayScore != null);
  const groups = new Map<string, LeagueStanding[]>();
  for (const row of rows) {
    const key = `${row.points}/${row.won}/${row.goalDifference}/${row.goalsFor}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  const data = new Map(rows.map(r => [r.teamId, { h2hPoints: 0, h2hGD: 0, discipline: 0, awayGD: 0, awayGF: 0, homeGD: 0, homeGF: 0 }]));
  for (const group of groups.values()) {
    if (group.length < 2 || new Set(group.map(r => MLS_CONFERENCE_BY_CLUB_ID[r.teamId])).size !== 1) continue;
    const ids = new Set(group.map(r => r.teamId));
    for (const f of regular.filter(f => ids.has(f.homeTeamId) && ids.has(f.awayTeamId))) {
      const h = data.get(f.homeTeamId)!, a = data.get(f.awayTeamId)!;
      h.h2hPoints += f.homeScore! > f.awayScore! ? 3 : f.homeScore === f.awayScore ? 1 : 0;
      a.h2hPoints += f.awayScore! > f.homeScore! ? 3 : f.homeScore === f.awayScore ? 1 : 0;
      h.h2hGD += f.homeScore! - f.awayScore!; a.h2hGD += f.awayScore! - f.homeScore!;
    }
  }
  for (const f of regular) {
    const h = data.get(f.homeTeamId), a = data.get(f.awayTeamId);
    if (h) { h.homeGF += f.homeScore!; h.homeGD += f.homeScore! - f.awayScore!; h.discipline += (f.stats?.homeFouls || 0) + 3 * (f.stats?.homeYellowCards || 0) + 7 * (f.stats?.homeRedCards || 0); }
    if (a) { a.awayGF += f.awayScore!; a.awayGD += f.awayScore! - f.homeScore!; a.discipline += (f.stats?.awayFouls || 0) + 3 * (f.stats?.awayYellowCards || 0) + 7 * (f.stats?.awayRedCards || 0); }
  }
  return [...rows].sort((a, b) => {
    const x = data.get(a.teamId)!, y = data.get(b.teamId)!;
    return b.points - a.points || b.won - a.won || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || y.h2hPoints - x.h2hPoints || y.h2hGD - x.h2hGD || x.discipline - y.discipline || y.awayGD - x.awayGD || y.awayGF - x.awayGF || y.homeGD - x.homeGD || y.homeGF - x.homeGF || stableDraw(a.teamId) - stableDraw(b.teamId) || a.teamId.localeCompare(b.teamId);
  });
}
export const mlsConferenceStandings = (rows: LeagueStanding[], fixtures: Fixture[], conference: 'Eastern' | 'Western') => sortMLSStandings(rows.filter(r => MLS_CONFERENCE_BY_CLUB_ID[r.teamId] === conference), fixtures);

/** Append only newly-earned rounds. Everything needed to resume is in saved Fixture records.
 * No real fixture dates are claimed: uses the career's adapted August-May calendar.
 */
export function ensureMLSPlayoffs(fixtures: Fixture[], standings: LeagueStanding[]): Fixture[] {
  const regular = fixtures.filter(f => !f.mlsPlayoff && f.homeTeamId in MLS_CONFERENCE_BY_CLUB_ID && f.awayTeamId in MLS_CONFERENCE_BY_CLUB_ID);
  if (regular.length !== 510 || regular.some(f => !f.isPlayed) || standings.length !== 30) return fixtures;
  let out = [...fixtures];
  const globalRanking = sortMLSStandings(standings, regular).map(r => r.teamId);
  const rank = (id: string) => globalRanking.indexOf(id);
  const lastDate = regular.map(f => f.date || '').filter(Boolean).sort().at(-1);
  const seasonNumber = fixtures.find(f => f.mlsPlayoff)?.mlsPlayoff?.seasonNumber || Number(regular[0]?.id.match(/_s(\d+)$/)?.[1] || regular[0]?.id.match(/^mls_(\d+)_reg/)?.[1] || 1);
  const add = (stage: MLSPlayoffStage, round: number, conference: 'Eastern' | 'Western' | undefined, seriesId: string, gameNumber: number, higher: string, lower: string, reverse = false) => {
    const id = `mls_playoff_s${seasonNumber}_${seriesId}_g${gameNumber}`;
    if (out.some(f => f.id === id)) return;
    const date = lastDate ? new Date(`${lastDate}T12:00:00`) : undefined;
    if (date) date.setDate(date.getDate() + (round - 34) * 7);
    const dateStr = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : undefined;
    const stageName = ({ wildcard: 'البطاقة الأخيرة', round_one: 'الدور الأول - الأفضل من 3', conference_semi: 'نصف نهائي المنطقة', conference_final: 'نهائي المنطقة', mls_cup: 'نهائي كأس MLS' })[stage];
    out.push({ id, round, homeTeamId: reverse ? lower : higher, awayTeamId: reverse ? higher : lower, isPlayed: false,
      competitionType: 'playoff', competitionId: 'mls_playoffs', competitionName: 'ملحق MLS', tournamentId: 'league', tournamentBadge: '🏆 ملحق MLS', stageName,
      date: dateStr, timestamp: date?.getTime(), mlsPlayoff: { stage, conference, seriesId, gameNumber, higherSeedTeamId: higher, lowerSeedTeamId: lower, seasonNumber } });
  };
  const seriesWinner = (seriesId: string) => {
    const games = out.filter(f => f.mlsPlayoff?.seriesId === seriesId);
    const wins = new Map<string, number>();
    for (const f of games.filter(f => f.isPlayed && f.winnerTeamId)) wins.set(f.winnerTeamId!, (wins.get(f.winnerTeamId!) || 0) + 1);
    return [...wins].find(([, won]) => won >= 2)?.[0];
  };
  const conferenceChampions: string[] = [];
  for (const conference of ['Eastern', 'Western'] as const) {
    const seeds = mlsConferenceStandings(standings, regular, conference).map(r => r.teamId);
    if (seeds.length !== 15) return fixtures;
    const wcSeries = `${conference}_wildcard`;
    add('wildcard', 35, conference, wcSeries, 1, seeds[7], seeds[8]);
    const wild = out.find(f => f.mlsPlayoff?.seriesId === wcSeries);
    if (!wild?.isPlayed || !wild.winnerTeamId) continue;
    const pairs = [[seeds[0], wild.winnerTeamId], [seeds[1], seeds[6]], [seeds[2], seeds[5]], [seeds[3], seeds[4]]];
    const winners: string[] = [];
    for (let i = 0; i < 4; i++) {
      const [higher, lower] = pairs[i], seriesId = `${conference}_round1_${i}`;
      add('round_one', 36, conference, seriesId, 1, higher, lower);
      const g1 = out.find(f => f.mlsPlayoff?.seriesId === seriesId && f.mlsPlayoff.gameNumber === 1);
      if (g1?.isPlayed) add('round_one', 37, conference, seriesId, 2, higher, lower, true);
      const g2 = out.find(f => f.mlsPlayoff?.seriesId === seriesId && f.mlsPlayoff.gameNumber === 2);
      if (g2?.isPlayed && !seriesWinner(seriesId)) add('round_one', 38, conference, seriesId, 3, higher, lower);
      const winner = seriesWinner(seriesId);
      if (winner) winners[i] = winner;
    }
    if (winners.filter(Boolean).length !== 4) continue;
    const semifinalWinners: string[] = [];
    for (const [i, j] of [[0, 3], [2, 1]]) {
      const pair = [winners[i], winners[j]].sort((a, b) => seeds.indexOf(a) - seeds.indexOf(b));
      const seriesId = `${conference}_semi_${i}`;
      add('conference_semi', 39, conference, seriesId, 1, pair[0], pair[1]);
      const game = out.find(f => f.mlsPlayoff?.seriesId === seriesId);
      if (game?.isPlayed && game.winnerTeamId) semifinalWinners.push(game.winnerTeamId);
    }
    if (semifinalWinners.length !== 2) continue;
    const pair = semifinalWinners.sort((a, b) => seeds.indexOf(a) - seeds.indexOf(b));
    const seriesId = `${conference}_final`;
    add('conference_final', 40, conference, seriesId, 1, pair[0], pair[1]);
    const game = out.find(f => f.mlsPlayoff?.seriesId === seriesId);
    if (game?.isPlayed && game.winnerTeamId) conferenceChampions.push(game.winnerTeamId);
  }
  if (conferenceChampions.length === 2) {
    const pair = conferenceChampions.sort((a, b) => rank(a) - rank(b));
    add('mls_cup', 41, undefined, 'mls_cup', 1, pair[0], pair[1]);
  }
  return out.length === fixtures.length ? fixtures : out.sort((a, b) => a.round - b.round || a.id.localeCompare(b.id));
}
