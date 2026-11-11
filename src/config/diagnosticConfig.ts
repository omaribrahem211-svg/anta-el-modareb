/**
 * Diagnostic Configuration for Match Ending & Advance White Screen Isolation
 *
 * Current Stage: TEST_A
 * In TEST_A: Heavy post-match operations inside finishLiveMatchAndAdvance are bypassed:
 *  - CPU other matches simulation
 *  - processPostMatchPlayerUpdates
 *  - generateIncomingAiBids
 *  - Board system & Economy updates
 *  - Standings updates
 *  - Full game state local save
 *
 * This allows isolating whether the crash/white screen originates from
 * post-match background processing or from the UI/WebView render layer.
 */

export type DiagnosticStage = 'TEST_A' | 'TEST_B' | 'TEST_C' | 'TEST_D' | 'ALL_ACTIVE';

export const DIAGNOSTIC_CONFIG = {
  CURRENT_STAGE: 'ALL_ACTIVE' as DiagnosticStage,

  // All gameplay operations active:
  ENABLE_CPU_SIMULATION: true,
  ENABLE_PLAYER_PROCESSING: true,
  ENABLE_STANDINGS_UPDATE: true,
  ENABLE_BOARD_AND_ECONOMY: true,
  ENABLE_INCOMING_BIDS: true,
  ENABLE_SAVE: true,
};

console.log(`[DIAG] Diagnostic Mode Initialized: ${DIAGNOSTIC_CONFIG.CURRENT_STAGE}`);
