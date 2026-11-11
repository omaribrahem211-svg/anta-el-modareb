import React, { useState } from 'react';
import { 
  History, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldBan, 
  UserCheck, 
  Clock, 
  Search, 
  RefreshCw,
  FileText
} from 'lucide-react';
import { AdminAuditLog } from '../../types/admin';

interface AdminAuditLogsTabProps {
  logs: AdminAuditLog[];
  loading: boolean;
  onRefresh: () => void;
}

export const AdminAuditLogsTab: React.FC<AdminAuditLogsTabProps> = ({
  logs,
  loading,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      log.adminEmail.toLowerCase().includes(term) ||
      log.targetUserEmail.toLowerCase().includes(term) ||
      log.targetUserId.toLowerCase().includes(term) ||
      (log.reason && log.reason.toLowerCase().includes(term)) ||
      log.action.toLowerCase().includes(term)
    );
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'suspend_user':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <ShieldAlert className="w-3 h-3" />
            <span>إيقاف حساب (Suspend)</span>
          </span>
        );
      case 'ban_user':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <ShieldBan className="w-3 h-3" />
            <span>حظر نهائي (Ban)</span>
          </span>
        );
      case 'unsuspend_user':
      case 'unban_user':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <UserCheck className="w-3 h-3" />
            <span>إلغاء الحظر / تفعيل</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            <FileText className="w-3 h-3" />
            <span>{action}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              <span>سجل التدقيق الإداري غير القابل للتعديل (Audit Trail)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              تسجيل مشفر وغير قابل للتلاعب لكل العمليات الإدارية وتغييرات حالة حسابات اللاعبين مرتبة من الأحدث إلى الأقدم.
            </p>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="self-start sm:self-auto px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="تحديث السجلات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث في السجلات بالبريد، السبب، أو نوع الإجراء..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span>جاري تحميل سجلات التدقيق...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>لا توجد سجلات تدقيق حتى الآن.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="p-4 font-semibold">التاريخ والوقت</th>
                  <th className="p-4 font-semibold">المسؤول المنفذ (Admin)</th>
                  <th className="p-4 font-semibold">نوع الإجراء</th>
                  <th className="p-4 font-semibold">المستخدم المستهدف</th>
                  <th className="p-4 font-semibold">سبب الإجراء / التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Timestamp */}
                    <td className="p-4 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                      {formatDate(log.timestamp)}
                    </td>

                    {/* Admin Email */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-200" dir="ltr">{log.adminEmail}</span>
                    </td>

                    {/* Action */}
                    <td className="p-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Target User */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-slate-200 font-medium" dir="ltr">{log.targetUserEmail}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{log.targetUserId}</div>
                    </td>

                    {/* Reason */}
                    <td className="p-4 text-slate-400 text-xs max-w-xs">
                      {log.reason || 'لا يوجد سبب مرفق'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
