import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  User, 
  Shield, 
  Calendar, 
  Clock, 
  ChevronLeft, 
  HardDrive,
  CheckCircle2,
  AlertCircle,
  ShieldBan,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import { UserProfile } from '../../types/auth';
import { UserInspectorModal } from './UserInspectorModal';

interface AdminUsersTabProps {
  users: UserProfile[];
  totalCount?: number;
  loading: boolean;
  onRefresh: () => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  totalCount,
  loading,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const displayTotalCount = totalCount ?? users.length;

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.uid.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'غير متوفر';
    return new Date(timestamp).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>إدارة المدربين والمستخدمين ({displayTotalCount})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              استعراض حسابات اللاعبين في قاعدة بيانات Firestore، فحص التقدم، وتطبيق إجراءات الرقابة.
            </p>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="self-start sm:self-auto px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>

        {/* Search Bar & Status Filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث بالاسم، البريد الإلكتروني، أو معرف المستخدم (UID)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">جميع الحسابات ({users.length})</option>
              <option value="active">الحسابات النشطة ({users.filter(u => u.status === 'active').length})</option>
              <option value="suspended">الموقوفة مؤقتاً ({users.filter(u => u.status === 'suspended').length})</option>
              <option value="banned">المحظورة ({users.filter(u => u.status === 'banned').length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span>جاري جلب قائمة المستخدمين من السحابة...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>لم يتم العثور على أي مستخدم يطابق معايير البحث.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="p-4 font-semibold">المستخدم / المدرب</th>
                  <th className="p-4 font-semibold">الحالة</th>
                  <th className="p-4 font-semibold">الرتبة</th>
                  <th className="p-4 font-semibold">تاريخ التسجيل</th>
                  <th className="p-4 font-semibold">آخر نشاط</th>
                  <th className="p-4 font-semibold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => (
                  <tr 
                    key={u.uid} 
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedUser(u)}
                  >
                    {/* User Info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-xs shrink-0">
                          {u.displayName ? u.displayName.charAt(0) : <User className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-100 text-xs truncate">{u.displayName || 'مدرب الفريق'}</div>
                          <div className="text-[11px] text-slate-400 font-mono truncate" dir="ltr">{u.email || u.uid}</div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        u.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : u.status === 'suspended'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {u.status === 'active' && <CheckCircle2 className="w-3 h-3" />}
                        {u.status === 'suspended' && <ShieldAlert className="w-3 h-3" />}
                        {u.status === 'banned' && <ShieldBan className="w-3 h-3" />}
                        <span>{u.status === 'active' ? 'نشط' : u.status === 'suspended' ? 'موقوف' : 'محظور'}</span>
                      </span>
                    </td>

                    {/* Role */}
                    <td className="p-4 whitespace-nowrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        u.role === 'admin' ? 'bg-purple-950/80 text-purple-300 border border-purple-800' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {u.role === 'admin' ? 'مسؤول (Admin)' : 'مدرب (Player)'}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="p-4 text-slate-300 whitespace-nowrap">
                      {formatDate(u.createdAt)}
                    </td>

                    {/* Last Login */}
                    <td className="p-4 text-slate-400 whitespace-nowrap">
                      {formatDate(u.lastLoginAt)}
                    </td>

                    {/* Action Button */}
                    <td className="p-4 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(u);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 mx-auto"
                      >
                        <span>فحص الملف</span>
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Inspector Modal */}
      {selectedUser && (
        <UserInspectorModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUserUpdated={() => {
            onRefresh();
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};
