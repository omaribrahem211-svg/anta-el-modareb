// Pure helper (no imports) so calendarManager and cupEngine can both use it without a circular import.

/**
 * Settles a knockout result: returns the winner and, for a draw, an instant penalty shootout.
 * Used by every code path that finishes a cup tie (calendar simulation, live match, quick sim).
 */
export function settleCupResult(
  homeScore: number,
  awayScore: number,
  homeTeamId: string,
  awayTeamId: string,
  shootout?: { homePenalties: number; awayPenalties: number }
): { homePenalties?: number; awayPenalties?: number; winnerTeamId: string } {
  if (homeScore > awayScore) return { winnerTeamId: homeTeamId };
  if (awayScore > homeScore) return { winnerTeamId: awayTeamId };
  let hp = shootout ? shootout.homePenalties : Math.random() < 0.5 ? 5 : 4;
  let ap = shootout ? shootout.awayPenalties : hp === 5 ? 4 : 5;
  if (hp === ap) hp = ap + 1;
  return { homePenalties: hp, awayPenalties: ap, winnerTeamId: hp > ap ? homeTeamId : awayTeamId };
}
