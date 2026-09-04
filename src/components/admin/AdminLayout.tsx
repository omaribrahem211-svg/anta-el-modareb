import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  History, 
  Settings, 
  ArrowRight, 
  ShieldCheck, 
  LogOut,
  Menu,
  X,
  ExternalLink,
  Swords,
  Sliders,
  Radio,
  Globe2,
  AlertCircle
} from 'lucide-react';
import { AdminTab, AdminDashboardMetrics } from '../../types/admin';
import { UserProfile } from '../../types/auth';
import { useAuth } from '../../context/AuthContext';
import { 
  fetchAdminDashboardMetrics, 
  fetchAllUsers, 
  fetchAdminAuditLogs, 
  SUPER_ADMIN_EMAIL 
} from '../../services/adminService';
import { isRecentQuotaExceeded } from '../../utils/firestoreErrorHelper';
import { AdminDashboardTab } from './AdminDashboardTab';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminAuditLogsTab } from './AdminAuditLogsTab';
import { AdminSettingsTab } from './AdminSettingsTab';
import { AdminPvPMatchesTab } from './AdminPvPMatchesTab';
import { AdminRealismTab } from './AdminRealismTab';
import { AdminBroadcastsTab } from './AdminBroadcastsTab';
import { AdminWorldEditorTab } from './AdminWorldEditorTab';

interface AdminLayoutProps {
  onBackToGame: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onBackToGame }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [quotaNotice, setQuotaNotice] = useState(false);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [fetchedMetrics, fetchedUsers, fetchedLogs] = await Promise.all([
        fetchAdminDashboardMetrics(),
        fetchAllUsers(),
        fetchAdminAuditLogs()
      ]);

      setMetrics(fetchedMetrics);
      setUsers(fetchedUsers);
      setAuditLogs(fetchedLogs);
      setQuotaNotice(isRecentQuotaExceeded());
    } catch (error) {
      console.warn('Notice: loaded admin panel with resilient fallback cache:', error);
      setQuotaNotice(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const navItems: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'لوحة المؤشرات', icon: LayoutDashboard },
    { id: 'world_editor', label: 'محرر عالم كرة القدم', icon: Globe2 },
    { id: 'broadcasts', label: 'الرسائل الجماعية', icon: Radio },
    { id: 'users', label: 'إدارة المدربين', icon: Users },
    { id: 'pvp_matches', label: 'مباريات الأونلاين', icon: Swords },
    { id: 'realism_settings', label: 'توازن اللعبة والواقعية', icon: Sliders },
    { id: 'audit_logs', label: 'سجل التدقيق', icon: History },
    { id: 'settings', label: 'الأمان والإعدادات', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif]">
      
      {/* Admin Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Brand & Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-100">أنت المدرب</span>
                <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  لوحة الإدارة V1
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline" dir="ltr">
                {user?.email || SUPER_ADMIN_EMAIL}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToGame}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors"
            >
              <span>العودة للعبة</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Admin Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Cloud Quota Notice Banner (if active) */}
        {quotaNotice && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start sm:items-center gap-3.5 text-amber-200 text-xs">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1">
              <span className="font-bold">وضع الاستمرارية المحلي نشط:</span> تم تفعيل وضع الحماية والتخزين المحلي نظراً لوصول قاعدة البيانات السحابية المجانية (Firestore Free Tier) إلى حد القراءة اليومي المؤقت. جميع ميزات اللوحة (تعديل العالم، الرسائل، الإعدادات، التدقيق) تعمل بالكامل ومحفوظة بأمان محلياً.
            </div>
            <button
              onClick={() => {
                setQuotaNotice(false);
                loadAdminData();
              }}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-bold transition-colors whitespace-nowrap text-[11px]"
            >
              إعادة فحص الاتصال
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <AdminDashboardTab
            metrics={metrics}
            loading={loading}
            onNavigateToUsers={() => setActiveTab('users')}
            onNavigateToLogs={() => setActiveTab('audit_logs')}
          />
        )}

        {activeTab === 'world_editor' && (
          <AdminWorldEditorTab />
        )}

        {activeTab === 'broadcasts' && (
          <AdminBroadcastsTab />
        )}

        {activeTab === 'users' && (
          <AdminUsersTab
            users={users}
            totalCount={metrics?.totalUsers}
            loading={loading}
            onRefresh={loadAdminData}
          />
        )}

        {activeTab === 'pvp_matches' && (
          <AdminPvPMatchesTab />
        )}

        {activeTab === 'realism_settings' && (
          <AdminRealismTab />
        )}

        {activeTab === 'audit_logs' && (
          <AdminAuditLogsTab
            logs={auditLogs}
            loading={loading}
            onRefresh={loadAdminData}
          />
        )}

        {activeTab === 'settings' && (
          <AdminSettingsTab />
        )}
      </main>

      {/* Admin Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-[11px] text-slate-500">
        لوحة تحكم إدارة لعبة "أنت المدرب" — جميع الحقوق محفوظة لمالك اللعبة © 2026
      </footer>

    </div>
  );
};
