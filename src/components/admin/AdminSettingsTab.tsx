import React from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Key, 
  Database, 
  Server, 
  Lock, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SUPER_ADMIN_EMAIL } from '../../services/adminService';

export const AdminSettingsTab: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <span>إعدادات النظام والأمان وحسابات الإدارة</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          معلومات تكوين الأمان، التحقق السحابي، وحساب المالك المعتمد (Super Admin).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Super Admin Ownership Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm pb-2 border-b border-slate-800">
            <Key className="w-4 h-4" />
            <span>مالك اللعبة المعتمد (Super Administrator)</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">البريد الإلكتروني المالك:</span>
              <span className="text-emerald-300 font-mono font-bold" dir="ltr">{SUPER_ADMIN_EMAIL}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">حسابك الحالي:</span>
              <span className="text-slate-200 font-mono" dir="ltr">{user?.email || user?.uid}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">مستوى الصلاحية:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Super Admin (كامل الصلاحيات)</span>
              </span>
            </div>
          </div>

          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl text-[11px] text-emerald-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              قواعد أمان Firestore مفعلة ومربوطة سيرفرياً بالبريد المالك، ولا يمكن لأي مستخدم عادي منح نفسه صلاحية المشرف عبر واجهة المتصفح أو أي طلب خارجي.
            </span>
          </div>
        </div>

        {/* Cloud Architecture Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm pb-2 border-b border-slate-800">
            <Database className="w-4 h-4" />
            <span>بنية الخدمات السحابية (Cloud Architecture)</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">مشروع Firebase:</span>
              <span className="text-slate-200 font-mono">lucid-trail-tf6jr</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">معرف قاعدة البيانات:</span>
              <span className="text-slate-200 font-mono text-[11px] truncate max-w-[150px]">ai-studio-antaelmodareb...</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">نسخة لوحة الإدارة:</span>
              <span className="text-slate-200 font-mono">V1.0 (Phase 3A)</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              في المراحل القادمة (Phase 3B & 4) سيتم تفعيل أدوات تعديل بطاقات اللاعبين وإرسال الرسائل الجماعية وإدارة أسعار المتجر من هذه اللوحة.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
