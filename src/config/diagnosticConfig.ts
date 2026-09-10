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
  CURRENT_STAGE: 'TEST_A' as DiagnosticStage,

  // Stages control:
  // TEST_A: All false
  // TEST_B: ENABLE_CPU_SIMULATION = true
  // TEST_C: ENABLE_PLAYER_PROCESSING = true
  // TEST_D: ENABLE_SAVE = true
  ENABLE_CPU_SIMULATION: false,
  ENABLE_PLAYER_PROCESSING: false,
  ENABLE_STANDINGS_UPDATE: false,
  ENABLE_BOARD_AND_ECONOMY: false,
  ENABLE_INCOMING_BIDS: false,
  ENABLE_SAVE: false,
};

console.log(`[DIAG] Diagnostic Mode Initialized: ${DIAGNOSTIC_CONFIG.CURRENT_STAGE}`);
