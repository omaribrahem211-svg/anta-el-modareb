import React, { useState } from 'react';
import { Mail, Coins, ShieldCheck, X, Send, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { createFriendInvitation } from '../../services/pvpService';
import { PvPMatch } from '../../types/pvp';

interface PvPFriendInviteModalProps {
  onClose: () => void;
  onMatchCreated: (match: PvPMatch) => void;
}

export const PvPFriendInviteModal: React.FC<PvPFriendInviteModalProps> = ({
  onClose,
  onMatchCreated
}) => {
  const { user } = useAuth();
  const { userClub, manager } = useGame();
  
  const [friendEmail, setFriendEmail] = useState('');
  const [prizeAmount, setPrizeAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userCoins = user?.virtualCoins !== undefined ? user.virtualCoins : 1000;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!friendEmail.trim()) {
      setError('يرجى إدخال البريد الإلكتروني للمدرب الصديق.');
      return;
    }
    if (friendEmail.trim().toLowerCase() === user.email?.toLowerCase()) {
      setError('لا يمكنك دعوة نفسك لمباراة!');
      return;
    }
    if (prizeAmount > 0 && userCoins < prizeAmount) {
      setError(`رصيدك الحالي (${userCoins} كوينز) لا يكفي لاختيار جائزة تحدي ${prizeAmount.toLocaleString()} كوينز.`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const match = await createFriendInvitation(
        user,
        userClub,
        userClub?.tactics || {
          formation: '4-3-3',
          mentality: 'balanced',
          passingStyle: 'short',
          pressingIntensity: 'balanced',
          tempo: 'balanced',
          startingPlayerIds: userClub?.players ? userClub.players.slice(0, 11).map(p => p.id) : [],
          benchPlayerIds: userClub?.players ? userClub.players.slice(11, 18).map(p => p.id) : [],
          captainId: userClub?.players?.[0]?.id || '',
          penaltyTakerId: userClub?.players?.[0]?.id || '',
          freeKickTakerId: userClub?.players?.[0]?.id || '',
          cornerTakerId: userClub?.players?.[0]?.id || '',
        },
        friendEmail.trim(),
        prizeAmount,
        manager.level,
        manager.reputation
      );

      onMatchCreated(match);
    } catch (err: any) {
      console.error('Failed to create friend invite:', err);
      setError(err.message || 'حدث خطأ أثناء إرسال الدعوة.');
    } finally {
      setLoading(false);
    }
  };

  const prizeOptions = [
    { label: 'ودية مجانية (بدون جائزة)', value: 0 },
    { label: '500 كوينز', value: 500 },
    { label: '1,000 كوينز', value: 1000 },
    { label: '5,000 كوينز', value: 5000 },
    { label: '10,000 كوينز', value: 10000 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-5 p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">دعوة صديق لمباراة تحدي</h2>
              <p className="text-xs text-slate-400">أرسل دعوة خاصة ومباشرة لمدرب آخر عبر بريده الإلكتروني</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSendInvite} className="space-y-4 text-right">
          {/* Friend Email Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              البريد الإلكتروني للمدرب الصديق:
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none font-mono"
                dir="ltr"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              سيتمكن صديقك من قبول الدعوة مباشرة بمجرد دخوله قسم المباريات الأونلاين.
            </p>
          </div>

          {/* Prize Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>نوع المباراة وقيمة الجائزة الافتراضية:</span>
              </label>
              <span className="text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-lg font-mono">
                رصيدك: {userCoins} 🪙
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {prizeOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setPrizeAmount(opt.value)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    prizeAmount === opt.value
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.value > 0 ? (
                    <span className="text-[10px] text-amber-400 font-normal">
                      جائزة الفائز: {(opt.value * 2).toLocaleString()} 🪙
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-normal">
                      ودية بدون جائزة
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Prize Info Alert */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>نظام الجوائز الافتراضية الآمن</span>
            </div>
            <p>
              الكوينز هي عملة افتراضية داخل اللعبة فقط ولا تمثل أموالاً حقيقية. في حالة إلغاء الدعوة أو انتهاء صلاحيتها أو التعادل يتم استرداد الكوينز المحجوزة تلقائياً.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>إرسال دعوة التحدي</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
