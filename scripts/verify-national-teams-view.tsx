// Render smoke for NationalTeamView (Stage 6): SSR-renders the real component
// with a stubbed GameContext and asserts the key UI sections render.
// Run: bash scripts/run-nt-view-test.sh
// jsdom globals first: some transitively imported services touch window at module load.
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true });
g.localStorage = dom.window.localStorage;
g.HTMLElement = dom.window.HTMLElement;
g.CustomEvent = dom.window.CustomEvent;
g.Event = dom.window.Event;
g.location = dom.window.location;

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Club, Player } from '../src/types/game';

const { REAL_SQUADS_BY_CLUB_ID } = await import('../src/data/realPlayersData');
const {
  acceptNationalTeamJob,
  advanceNationalTeamsToRound,
  createEmptyNationalTeamsState,
  generateNationalTeamJobOffer,
  initNationalTeamsForSeason,
} = await import('../src/services/nationalTeamsService');
const { __setMockGame } = await import('../src/context/GameContext');
const { NationalTeamView } = await import('../src/components/national/NationalTeamView');

let failures = 0;
const fail = (m: string) => { failures++; console.error('FAIL: ' + m); };
const ok = (m: string) => console.log('  ok: ' + m);

function clubsFromRealSquads(): Club[] {
  return Object.entries(REAL_SQUADS_BY_CLUB_ID).map(([clubId, squad]) => ({
    id: clubId, name: clubId, shortName: clubId.slice(0, 3), city: 'x', division: 1, reputation: 70,
    primaryColor: '#000', secondaryColor: '#fff', budget: 0, transferBudget: 0, wageBudgetMonthly: 0,
    facilities: { stadium: 1, youthAcademy: 1, trainingCenter: 1, medicalCenter: 1 },
    sponsors: [], isUserClub: false, players: squad as unknown as Player[],
  }) as unknown as Club);
}
const clubs = clubsFromRealSquads();

// Realistic mid-season state: season 2 (AFCON), user manages Egypt
let state = initNationalTeamsForSeason(createEmptyNationalTeamsState(), 2, 34, clubs, null).state;
state = generateNationalTeamJobOffer(state, 80, 'EGY', 2);
state = acceptNationalTeamJob(state, state.pendingJobOffers[0].id);
for (let r = 1; r <= 22; r++) {
  state = advanceNationalTeamsToRound(state, r, 34, 2, clubs).state;
}
const userNt = state.teams.find(t => t.id === 'nt_EGY')!;

const baseCtx = {
  nationalTeamsState: state,
  userNationalTeam: userNt,
  acceptNationalTeamJob: () => {},
  declineNationalTeamJob: () => {},
  resignFromNationalTeam: () => {},
  refreshNationalTeamCallUp: () => {},
};

function renderWith(ctx: any): string {
  __setMockGame(ctx);
  return renderToStaticMarkup(React.createElement(NationalTeamView));
}

// 1. Full state: user NT card, tournament groups, standings columns, banner
const html1 = renderWith(baseCtx);
if (!html1.includes('أنت المدرب الوطني')) fail('user NT card missing');
if (!html1.includes('كأس الأمم الإفريقية')) fail('AFCON title missing');
if (!html1.includes('المجموعة')) fail('group tables missing');
if (!html1.includes('نقاط')) fail('points column missing');
if (!html1.includes('تحديث قائمة الاستدعاء')) fail('call-up refresh button missing');
if (!html1.includes('لا تجري انتقالات')) fail('no-transfers banner missing');
if (/شراء|بيع اللاعب|انتقال الى/.test(html1)) fail('transfer-like CTA found in view');
ok('user-managed view: NT card, AFCON groups, standings table, no-transfers banner, zero transfer CTAs');

// 2. Squad data feeding the list tab
if (userNt.players.length !== 23) fail('user NT squad != 23 in render state');
ok('call-up list data: 23 players');

// 3. Offer state (no user NT yet)
let offerState = initNationalTeamsForSeason(createEmptyNationalTeamsState(), 2, 34, clubs, null).state;
offerState = generateNationalTeamJobOffer(offerState, 80, 'EGY', 2);
const html2 = renderWith({ ...baseCtx, nationalTeamsState: offerState, userNationalTeam: null });
if (!html2.includes('عرض تدريب منتخب')) fail('offer card missing');
if (!html2.includes('قبول العرض')) fail('accept button missing');
ok('job-offer view: offer card with accept/decline');

// 4. Low-reputation locked state
const html3 = renderWith({ ...baseCtx, nationalTeamsState: initNationalTeamsForSeason(createEmptyNationalTeamsState(), 1, 34, clubs, null).state, userNationalTeam: null });
if (!html3.includes('السمعة 70+')) fail('locked card missing');
ok('locked view: reputation gate message');

// 5. Null state: placeholder, no crash
const html4 = renderWith({ ...baseCtx, nationalTeamsState: null, userNationalTeam: null });
if (!html4.includes('جارٍ تجهيز')) fail('loading placeholder missing');
ok('null state: loading placeholder, no crash');

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
