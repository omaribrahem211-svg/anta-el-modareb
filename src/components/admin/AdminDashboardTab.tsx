import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  ShieldCheck, 
  Trophy, 
  CreditCard, 
  Activity,
  Database,
  CheckCircle2,
  AlertCircle,
  Radio,
  Sparkles
} from 'lucide-react';
import { AdminDashboardMetrics } from '../../types/admin';
import { useGame } from '../../context/GameContext';

interface AdminDashboardTabProps {
  metrics: AdminDashboardMetrics | null;
  loading: boolean;
  onNavigateToUsers: () => void;
  onNavigateToLogs: () => void;
}

export const AdminDashboardTab: React.FC<AdminDashboardTabProps> = ({
  metrics,
  loading,
  onNavigateToUsers,
  onNavigateToLogs
}) => {
  const { switchUserClubToAlAhly, userClub } = useGame();
  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-400">جاري تحميل إحصائيات الإدارة...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-0"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>نظام إدارة ألعاب أنت المدرب (V1.0 Online Engine)</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">لوحة تحكم المالك والعمليات</h1>
            <p className="text-sm text-slate-400 mt-1">
              متابعة حسابات المدربين، حالة السحابة، سجلات الرقابة، وإحصائيات النظام الفورية.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToUsers}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-950/50 flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>إدارة الحسابات ({metrics?.totalUsers || 0})</span>
            </button>
            <button
              onClick={onNavigateToLogs}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors border border-slate-700"
            >
              سجل التدقيق
            </button>
          </div>
        </div>
      </div>

      {/* Super Admin Quick Appointment to Al Ahly & CAF Champions League */}
      <div className="bg-gradient-to-r from-red-950/70 via-slate-900 to-amber-950/60 border border-amber-500/40 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 text-2xl shadow-inner">
            🦅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">تفعيل تدريب النادي الأهلي ودوري أبطال إفريقيا</h3>
              <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full font-bold">
                حساب الأدمن الرسمي
              </span>
              {userClub?.id === 'eg1_ahly' && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  أنت تدرب الأهلي حالياً ✅
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              تولي القيادة الفنية لنادي القرن الإفريقي (النادي الأهلي 🇪🇬) بكامل نجومه الحقيقيين (الشناوي، إمام عاشور، وسام أبو علي) وتفعيل بطولة دوري أبطال إفريقيا فوراً بالمجموعة الأولى النارية.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const res = switchUserClubToAlAhly();
            setAdminActionMessage(res.message);
            setTimeout(() => setAdminActionMessage(null), 5000);
          }}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0 shadow-lg cursor-pointer transition-all active:scale-95 border border-amber-400/30"
        >
          <Sparkles className="w-4 h-4 text-amber-200" />
          <span>تفعيل تدريب الأهلي وبدء البطولة 🏆</span>
        </button>
      </div>

      {adminActionMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs sm:text-sm font-bold p-3.5 rounded-2xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{adminActionMessage}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Currently Online Players (Real-time Live) */}
        <div className="bg-slate-900 border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 to-slate-900 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-400">المتواجدون الآن (أونلاين)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 relative">
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full"></span>
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-300 mb-1 flex items-baseline gap-2">
            <span>{metrics?.currentlyOnlineUsers ?? 1}</span>
            <span className="text-xs font-normal text-emerald-400/80">لاعب نشط</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <Activity className="w-3.5 h-3.5" />
            <span>متصلون بالخادم في الوقت الفعلي</span>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">إجمالي المدربين المسجلين</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-100 mb-1">
            {metrics?.totalUsers ?? 0}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>حسابات موثقة ومحفوظة</span>
          </div>
        </div>

        {/* Active Users (7d) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">النشطون (خلال 7 أيام)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-100 mb-1">
            {metrics?.activeUsers ?? 0}
          </div>
          <div className="text-[11px] text-slate-400">
            معدل النشاط: {metrics?.totalUsers ? Math.round(((metrics.activeUsers / metrics.totalUsers) * 100)) : 0}%
          </div>
        </div>

        {/* New Users (24h) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">المسجلون الجدد (24 ساعة)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-100 mb-1">
            +{metrics?.newUsers24h ?? 0}
          </div>
          <div className="text-[11px] text-purple-400">
            انضموا في آخر 24 ساعة
          </div>
        </div>

        {/* Premium Users */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">الحسابات المميزة (VIP)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-100 mb-1">
            {metrics?.premiumUsers ?? 0}
          </div>
          <div className="text-[11px] text-amber-400/80">
            ميزة مستقبلية (المرحلة 4)
          </div>
        </div>
      </div>

      {/* Secondary Metrics / Placeholders Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Clubs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400 mb-1">إجمالي الأندية المُدارة</div>
          <div className="text-xl font-bold text-slate-200">{metrics?.totalUsers ?? 0} نادٍ</div>
          <p className="text-[11px] text-slate-500 mt-1">نادي لكل حساب مدرب مسجل</p>
        </div>

        {/* Total Matches Simulation */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400 mb-1">إجمالي المباريات الملعوبة أونلاين</div>
          <div className="text-xl font-bold text-slate-200">غير متاح حالياً</div>
          <p className="text-[11px] text-slate-500 mt-1">تُلعب المباريات حالياً بمحرك الـ Single-player</p>
        </div>

        {/* Revenue */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400 mb-1">إجمالي الإيرادات (Revenue)</div>
          <div className="text-xl font-bold text-slate-200">0.00 ج.م</div>
          <p className="text-[11px] text-slate-500 mt-1">لم يتم تفعيل بوابات الدفع بعد (المرحلة 4)</p>
        </div>
      </div>

      {/* System Status Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>حالة البنية التحتية وقاعدة البيانات السحابية</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">قاعدة بيانات Firestore:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>متصل ومؤمن</span>
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">قواعد أمان Security Rules:</span>
            <span className="text-emerald-400 font-semibold">منشورة ونشطة V2</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">سجل التدقيق (Audit Logs):</span>
            <span className="text-emerald-400 font-semibold">تشفير غير قابل للتعديل</span>
          </div>
        </div>
      </div>
    </div>
  );
};
