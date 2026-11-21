import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { OnlineMatchPitch3D } from '../../src/components/pvp/OnlineMatchPitch3D';
const squad = (side: string) => Array.from({ length: 11 }, (_, i) => ({ id: `${side}${i}`, name: `لاعب ${i + 1}`, number: i + 1, position: i === 0 ? 'GK' : i < 5 ? 'CB' : i < 8 ? 'CM' : 'ST', rating: 80 }));
const home = squad('h'), away = squad('a');
function Harness() {
  const [mode, setMode] = useState('playing');
  (window as any).setMatchMode = setMode;
  return <OnlineMatchPitch3D homeClubName="الأهلي" awayClubName="الترجي" homeScore={2} awayScore={1} minute={mode === 'halftime' ? 45 : mode === 'finished' ? 90 : 32} currentBallZone="guest_half" momentum={35} homePossession={58} awayPossession={42} homeSquad={home} awaySquad={away} status={mode === 'halftime' ? 'halftime' : mode === 'finished' ? 'finished' : 'playing'} isPaused={mode === 'paused'} isFinished={mode === 'finished'} isSimulationRunning={mode === 'processing'} userResultType="win" onFinishMatch={() => { (window as any).confirmed = true; }} onStartSecondHalf={() => setMode('playing')} recentEvents={[]} />;
}
createRoot(document.getElementById('root')!).render(<Harness />);
