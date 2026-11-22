import React from 'react';
import { createRoot } from 'react-dom/client';
import { CoachCardModal } from '../../src/components/CoachCardModal';
const params = new URLSearchParams(location.search);
localStorage.setItem('premium_coach_owned', String(params.get('premium') === '1'));
const manager = { name: params.get('long') ? 'الكابتن الجديد محمد عبد الرحمن إبراهيم' : 'الكابتن الجديد', nationality: 'مصر', level: 1, managerRating: 71, worldRank: 584, matchesManaged: 0, wins: 0, draws: 0, losses: 0, trophies: [], license: 'A' } as any;
const club = { id: 'test', name: 'نادي نجم مصر الرياضي', tactics: { formation: '4-3-3', mentality: 'balanced', passingStyle: 'short' }, players: [], stats: {} } as any;
createRoot(document.getElementById('root')!).render(<CoachCardModal isOpen onClose={() => {}} manager={manager} userClub={club} worldRankings={null} />);
