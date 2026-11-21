// ============================================================================
// TEST BUILDS ONLY - this file must NEVER carry a non-null clubId on main.
// The combined test branch (test/all-features) sets a club so the reviewer
// can start a career instantly. Production keeps clubId: null, which makes
// every code path below behave exactly like the normal game (tier-4 start).
// ============================================================================
export const TEST_QUICK_START: { clubId: string | null; leagueId: string } = {
  clubId: 'eg1_ahly',      // TEST ONLY: start new careers at Al Ahly
  leagueId: 'egy_tier_1',  // TEST ONLY: Egyptian Premier League
};
