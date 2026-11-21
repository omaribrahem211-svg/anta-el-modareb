#!/usr/bin/env bash
# Render smoke for NationalTeamView. Temporarily swaps GameContext for a test
# double (the component is coupled to the app-wide context module), runs the
# SSR render assertions, and ALWAYS restores the real file afterwards.
set -u
cd "$(dirname "$0")/.."
BAK=$(mktemp)
cp src/context/GameContext.tsx "$BAK"
restore() {
  cp "$BAK" src/context/GameContext.tsx
  rm -f "$BAK"
}
trap restore EXIT
cat > src/context/GameContext.tsx <<'MOCK'
// TEMPORARY TEST DOUBLE — restored by run-nt-view-test.sh
import React from 'react';
let current: any = null;
export function __setMockGame(v: any) { current = v; }
export function useGame() { return current; }
export function GameProvider({ children }: { children: React.ReactNode }) { return React.createElement(React.Fragment, null, children); }
MOCK
npx tsx scripts/verify-national-teams-view.tsx
