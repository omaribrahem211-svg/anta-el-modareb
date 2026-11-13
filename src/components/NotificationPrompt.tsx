import React from 'react';
import { Bell } from 'lucide-react';
import { notificationService } from '../services/notificationService';

/**
 * Friendly one-time pre-prompt shown after the player has played a match. The system permission dialog is only opened
 * when the player taps "تفعيل". Declining never asks again by itself (the settings screen can re-enable it).
 */
export const NotificationPrompt: React.FC<{ onDone: (granted: boolean) => void }> = ({ onDone }) => {
  return (
    <div className="fixed inset-0 z-[75] bg-black/70 flex items-end sm:items-center justify-center p-3" dir="rtl">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
          <Bell className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-white font-black text-lg">عايز توصلك أخبار ناديك؟</h3>
          <p className="text-slate-400 text-xs leading-relaxed mt-1.5">
            هنبعتلك إشعار أو اتنين في اليوم بس: أخبار حماسية عن الماتش الجاي، وتصريحات المنافسين، وتذكير بمكافأتك اليومية قبل ما سلسلتك تضيع. تقدر تقفلها في أي وقت.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => { const ok = await notificationService.requestPermissions(); onDone(ok); }}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold active:scale-[0.98]"
          >
            تفعيل
          </button>
          <button
            type="button"
            onClick={() => { notificationService.markAsked(); onDone(false); }}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-bold"
          >
            مش دلوقتي
          </button>
        </div>
      </div>
    </div>
  );
};
