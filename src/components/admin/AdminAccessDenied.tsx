import React from 'react';
import { ShieldAlert, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminAccessDeniedProps {
  onBackToGame: () => void;
}

export const AdminAccessDenied: React.FC<AdminAccessDeniedProps> = ({ onBackToGame }) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100 font-['Cairo',sans-serif]">
      <div className="bg-slate-900 border border-rose-900/50 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold text-slate-100 mb-2">منطقة إدارية مقيدة</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          عذراً، هذه اللوحة مخصصة فقط لمالك وإدارة لعبة <strong>أنت المدرب</strong>. الحسابات العادية لا تملك تصريح الدخول.
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-6 text-right text-xs space-y-1.5 text-slate-400">
          <div className="flex items-center justify-between">
            <span>حالة الدخول:</span>
            <span className="text-rose-400 font-semibold flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>مرفوض (Forbidden 403)</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>الحساب الحالي:</span>
            <span className="text-slate-200 font-mono" dir="ltr">{user?.email || 'غير مسجل'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>الرتبة المعينة:</span>
            <span className="text-slate-300">{user?.role || 'لاعب (Player)'}</span>
          </div>
        </div>

        <button
          onClick={onBackToGame}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
        >
          <span>العودة إلى اللعبة</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
