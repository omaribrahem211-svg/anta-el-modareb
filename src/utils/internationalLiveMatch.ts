import type { LiveSimulationState } from './engine';
import { Club, Fixture, TeamTactics } from '../types/game';
import { InternationalMatch, NationalTeam, NationalTeamsState } from '../types/nationalTeams';
import { nationalTeamToClub, buildNationalTeamTactics } from './nationalTeamsEngine';
import { generateClubSquad, withSeededRandom } from './playerGenerator';

export interface InternationalLiveContext {
  matchId: string;
  competitionId: InternationalMatch['competitionId'];
  stage: InternationalMatch['stage'];
  userTeamId: string;
  seasonNumber: number;
}

/** Statistical countries use visibly labelled, match-only slots, never invented real players or club transfers. */
export function nationalTeamForLivePlay(nt: NationalTeam): NationalTeam {
  let players = nt.players || [];
  if (nt.isStatistical || players.length < 11) {
    const generated = withSeededRandom(`national-live-${nt.id}`, () =>
      generateClubSquad(nt.id, nt.countryCode, 'international', nt.reputation, Math.max(40, Math.min(90, nt.reputation))));
    const target = 45 + Math.max(1, Math.min(100, nt.footballLevel)) * 0.45;
    players = generated.slice(0, 23).map((p, index) => {
      const overall = Math.max(40, Math.min(92, Math.round(target + (index * 7 % 5) - 2)));
      const delta = overall - p.overallRating;
      const adjust = (value: number) => Math.max(1, Math.min(99, value + delta));
      return ({
      ...p, id: `${nt.id}_match_slot_${index + 1}`,
      // Keep the generated regional name (not a real player); only the id marks it as a match-only slot.
      nationality: nt.name, nationalityCode: nt.countryCode,
      currentClubId: undefined, currentLeagueId: undefined,
      isNationalMatchPlaceholder: true,
      overallRating: overall, potentialRating: overall, salary: 0, marketValue: 0,
      attributes: { pace: adjust(p.attributes.pace), shooting: adjust(p.attributes.shooting), passing: adjust(p.attributes.passing), dribbling: adjust(p.attributes.dribbling), defending: adjust(p.attributes.defending), physical: adjust(p.attributes.physical) },
    }); });
  }
  const defaults = buildNationalTeamTactics(players);
  const validIds = new Set(players.map(p => p.id));
  const picked = (nt.userStartingIds || nt.tactics?.startingPlayerIds || []).filter(id => validIds.has(id));
  const starters = new Set(picked).size === 11 ? picked : defaults?.startingPlayerIds || [];
  const bench = players.filter(p => !starters.includes(p.id)).slice(0, 12).map(p => p.id);
  return { ...nt, players, tactics: { ...defaults, ...nt.tactics, startingPlayerIds: starters, benchPlayerIds: bench } as TeamTactics };
}

export function nationalTeamMatchClub(nt: NationalTeam): Club {
  return nationalTeamToClub(nationalTeamForLivePlay(nt));
}

export function findUserInternationalMatch(state: NationalTeamsState | null | undefined, matchId: string): InternationalMatch | undefined {
  if (!state?.userNationalTeamId) return;
  return [...(state.activeTournament?.matches || []), ...(state.friendlyMatches || [])].find(m =>
    m.id === matchId && !m.isPlayed && (m.homeTeamId === state.userNationalTeamId || m.awayTeamId === state.userNationalTeamId));
}

export function getDueUserInternationalMatch(state: NationalTeamsState | null | undefined, currentRound: number, postSeason = false): InternationalMatch | undefined {
  if (!state?.userNationalTeamId) return;
  return [...(state.activeTournament?.matches || []), ...(state.friendlyMatches || [])]
    .filter(m => !m.isPlayed && (postSeason || m.roundTrigger <= currentRound) &&
      (m.homeTeamId === state.userNationalTeamId || m.awayTeamId === state.userNationalTeamId))
    .sort((a, b) => a.roundTrigger - b.roundTrigger || a.id.localeCompare(b.id))[0];
}

export function hasPendingUserInternationalTournament(state: NationalTeamsState | null | undefined): boolean {
  const id = state?.userNationalTeamId;
  if (!id) return false;
  return [state?.activeTournament, state?.queuedTournament].some(t => t && !t.isCompleted &&
    t.participantTeamIds.includes(id) && !t.userEliminatedStage);
}

export function controlledLiveClub(match: LiveSimulationState | null | undefined, fallback: Club): Club {
  if (!match?.internationalContext) return fallback;
  const home = match.homeTeam.id === match.internationalContext.userTeamId;
  const team = home ? match.homeTeam : match.awayTeam;
  const lineup = home ? match.homeLineup : match.awayLineup;
  const reds = home ? match.homeReddedPlayerIds : match.awayReddedPlayerIds;
  return { ...team, tactics: { ...(home ? match.homeTactics : match.awayTactics), startingPlayerIds: lineup,
    benchPlayerIds: team.players.filter(p => !lineup.includes(p.id) && !(match.substitutedOutPlayerIds || []).includes(p.id) && !reds.includes(p.id)).map(p => p.id) } };
}

export function substituteInternationalPlayer(match: LiveSimulationState, outId: string, inId: string): { match: LiveSimulationState; success: boolean; message: string } {
  const fail = (message: string) => ({ match, success: false, message });
  if (!match.internationalContext || match.isFinished || match.substitutionsCount >= 5) return fail('لا يمكن إجراء التبديل الآن (الحد الأقصى 5 تبديلات).');
  const home = match.homeTeam.id === match.internationalContext.userTeamId;
  const team = home ? match.homeTeam : match.awayTeam;
  const lineup = home ? match.homeLineup : match.awayLineup;
  const reds = home ? match.homeReddedPlayerIds : match.awayReddedPlayerIds;
  const out = team.players.find(p => p.id === outId);
  const incoming = team.players.find(p => p.id === inId);
  if (!out || !incoming || !lineup.includes(outId) || lineup.includes(inId) || reds.includes(inId) ||
      (match.substitutedOutPlayerIds || []).includes(inId)) return fail('اختر لاعباً في الملعب وبديلاً متاحاً لم يخرج سابقاً.');
  const nextLineup = lineup.map(id => id === outId ? inId : id);
  const exited = [...(match.substitutedOutPlayerIds || []), outId];
  const tactics = { ...(home ? match.homeTactics : match.awayTactics), startingPlayerIds: nextLineup,
    benchPlayerIds: team.players.filter(p => !nextLineup.includes(p.id) && !exited.includes(p.id) && !reds.includes(p.id)).map(p => p.id) };
  return {
    success: true, message: `تم التبديل: ${incoming.name} بدلاً من ${out.name}`,
    match: { ...match, substitutionsCount: match.substitutionsCount + 1, substitutedOutPlayerIds: exited,
      homeLineup: home ? nextLineup : match.homeLineup, awayLineup: home ? match.awayLineup : nextLineup,
      homeTactics: home ? tactics : match.homeTactics, awayTactics: home ? match.awayTactics : tactics,
      events: [...match.events, { minute: match.currentMinute, type: 'substitution', teamId: team.id,
        inPlayerName: incoming.name, outPlayerName: out.name, description: `🔄 تبديل منتخب ${team.name}: دخول ${incoming.name} وخروج ${out.name}` }],
    },
  };
}

export function internationalMatchFixture(match: InternationalMatch): Fixture {
  const competitionName = match.competitionId === 'afcon' ? 'كأس الأمم الإفريقية' : match.competitionId === 'worldcup' ? 'كأس العالم' : 'ودية دولية';
  return {
    id: match.id, round: match.roundTrigger, homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId,
    isPlayed: false, competitionType: 'international', competitionName,
    tournamentId: match.competitionId, stage: match.stage, stageName: match.stageName,
  } as unknown as Fixture;
}
