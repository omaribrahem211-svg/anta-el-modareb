import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  Coins, 
  ShieldAlert, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Filter,
  Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PvPMatch } from '../../types/pvp';
import { fetchAdminPvPMatches, adminCancelAndRefundMatch } from '../../services/adminService';

export const AdminPvPMatchesTab: React.FC = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<PvPMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Refund modal state
  const [refundTargetMatch, setRefundTargetMatch] = useState<PvPMatch | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminPvPMatches();
      setMatches(data);
    } catch (err: any) {
      console.error('Failed to load pvp matches for admin:', err);
      setError(err.message || 'فشل تحميل سجل مباريات الأونلاين.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const handleExecuteRefund = async () => {
    if (!refundTargetMatch || !user) return;
    if (!refundReason.trim()) {
      setError('يرجى كتابة سبب الإلغاء والاسترداد.');
      return;
    }

    const prize = refundTargetMatch.prizeAmount || refundTargetMatch.stakeAmount || 0;

    try {
      setProcessingRefund(true);
      setError(null);
      await adminCancelAndRefundMatch(refundTargetMatch, refundReason.trim(), user);
      setActionSuccess(`تم إلغاء المباراة واسترداد ${prize} كوينز للمشاركين بنجاح.`);
      setRefundTargetMatch(null);
      setRefundReason('');
      await loadMatches();
    } catch (err: any) {
      setError(err.message || 'فشل تنفيذ عملية الاسترداد.');
    } finally {
      setProcessingRefund(false);
    }
  };

  // Filter matches
  const filteredMatches = matches.filter(m => {
    const matchesSearch = 
      m.player1.clubName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.player1.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.player2 && m.player2.clubName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.player2 && m.player2.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-right animate-fade-in">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Swords className="w-5 h-5 text-indigo-400" />
            <span>مراقبة مباريات الأونلاين والتحديات (PvP Matches)</span>
          </h2>
          <p className="text-xs text-slate-400">
            متابعة غرف المباريات الحية، سجل المواجهات، والتدخل لإلغاء واسترداد الجوائز الافتراضية عند النزاعات
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم النادي أو المدرب أو المعرف..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
          >
            <option value="all">جميع الحالات</option>
            <option value="waiting_for_opponent">في الانتظار</option>
            <option value="ready">جاهزة</option>
            <option value="completed">منتهية</option>
            <option value="cancelled">ملغاة</option>
          </select>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-2xl text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800 rounded-2xl text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Matches Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs">جاري جلب بيانات مباريات الأونلاين...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            لا توجد مباريات مطابقة للبحث.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">معرف المباراة</th>
                  <th className="py-3 px-4">الفريق المضيف (اللاعب 1)</th>
                  <th className="py-3 px-4">الفريق الضيف (اللاعب 2)</th>
                  <th className="py-3 px-4 text-center">النوع وقيمة الجائزة</th>
                  <th className="py-3 px-4 text-center">النتيجة</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredMatches.map((m) => {
                  const prize = m.prizeAmount || m.stakeAmount || 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {m.id.substring(0, 14)}...
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-white">{m.player1.clubName}</div>
                        <div className="text-[11px] text-slate-400">{m.player1.displayName} ({m.player1.eloRating} Elo)</div>
                      </td>

                      <td className="py-3 px-4 font-sans">
                        {m.player2 ? (
                          <>
                            <div className="font-bold text-white">{m.player2.clubName}</div>
                            <div className="text-[11px] text-slate-400">{m.player2.displayName} ({m.player2.eloRating} Elo)</div>
                          </>
                        ) : (
                          <span className="text-slate-500 text-[11px]">في الانتظار...</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {prize > 0 ? (
                          <span className="text-amber-400 font-bold bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded-lg text-[11px]">
                            تحدي: {prize.toLocaleString()} 🪙
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold text-[11px]">
                            ودية مجانية
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-white">
                        {m.status === 'completed' && m.score ? (
                          <span className="bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                            {m.score.player1} - {m.score.player2}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-sans">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          m.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : m.status === 'waiting_for_opponent'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : m.status === 'cancelled'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {m.status === 'completed' ? 'مكتملة' : m.status === 'waiting_for_opponent' ? 'في الانتظار' : m.status === 'cancelled' ? 'ملغاة' : 'جاهزة'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-sans">
                        {m.status !== 'completed' && m.status !== 'cancelled' && (
                          <button
                            onClick={() => setRefundTargetMatch(m)}
                            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 text-xs font-semibold flex items-center gap-1 mx-auto cursor-pointer transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>إلغاء واسترداد</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Refund & Cancel Modal */}
      {refundTargetMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold border-b border-slate-800 pb-3">
              <ShieldAlert className="w-5 h-5" />
              <h3>إلغاء المباراة واسترداد الجائزة الافتراضية</h3>
            </div>

            <p className="text-xs text-slate-300">
              سيتم إلغاء المباراة <span className="font-mono text-slate-100">{refundTargetMatch.id}</span> وإعادة قيمة الجائزة المحجوزة ({refundTargetMatch.prizeAmount || refundTargetMatch.stakeAmount || 0} كوينز) فوراً لحساب اللاعبين.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">سبب الإلغاء (يُسجل في سجل التدقيق):</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="اكتب سبب الإلغاء الإداري..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setRefundTargetMatch(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                تراجع
              </button>
              <button
                onClick={handleExecuteRefund}
                disabled={processingRefund}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {processingRefund ? 'جاري التنفيذ...' : 'تأكيد الإلغاء والاسترداد'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
