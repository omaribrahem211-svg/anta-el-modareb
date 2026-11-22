import type { LocalGameSavePayload } from './gameStateRepository';

export const UPDATE_207_GIFT_AMOUNT = 50_000_000;
export const UPDATE_207_GIFT_MESSAGE_ID = 'msg_update_gift_207';
export const UPDATE_207_GIFT_TITLE = 'هدية التحديث الجديد';

type GiftState = Pick<LocalGameSavePayload, 'manager' | 'teams' | 'clubEconomy' | 'inbox'> & {
  season?: any;
  currentRound?: number;
};

/** The balance, receipt and message are one immutable save-state change. No local-only claim key. */
export function applyUpdate207Gift<T extends GiftState>(state: T): { state: T; granted: boolean } {
  if (!state?.manager || state.manager.updateGift207Received === true) return { state, granted: false };
  const clubId = state.manager.currentClubId || state.teams?.find(t => t?.isUserClub)?.id;
  const club = state.teams?.find(t => t?.id === clubId);
  if (!club) return { state, granted: false }; // Keep entitlement pending until a club exists.
  const inbox = Array.isArray(state.inbox) ? state.inbox : [];
  const hasMessage = inbox.some(m => m?.id === UPDATE_207_GIFT_MESSAGE_ID);
  const funds = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;
  const next: T = {
    ...state,
    manager: { ...state.manager, updateGift207Received: true },
    teams: hasMessage ? state.teams : state.teams.map(t => t?.id === club.id ? {
      ...t,
      budget: funds(t.budget) + UPDATE_207_GIFT_AMOUNT,
      transferBudget: funds(t.transferBudget) + UPDATE_207_GIFT_AMOUNT,
    } : t),
    clubEconomy: hasMessage ? state.clubEconomy : {
      ...(state.clubEconomy || {}),
      clubBudget: funds(club.budget) + UPDATE_207_GIFT_AMOUNT,
    },
    inbox: hasMessage ? inbox : [{
      id: UPDATE_207_GIFT_MESSAGE_ID,
      title: UPDATE_207_GIFT_TITLE,
      sender: 'إدارة اللعبة',
      date: `الموسم ${state.season?.seasonNumber || 1}`,
      type: 'board',
      read: false,
      content: 'هدية التحديث الجديد\n\nتمت إضافة 50,000,000 ج.م إلى خزينة ناديك وميزانية التعاقدات. هدية واحدة لكل مسيرة محفوظة، ولا تتكرر عند فتح اللعبة أو استعادة هذا الحفظ.',
    }, ...inbox],
  };
  return { state: next, granted: !hasMessage };
}
