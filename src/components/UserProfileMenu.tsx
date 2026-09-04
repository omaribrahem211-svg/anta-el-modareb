import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  LogOut, 
  LogIn, 
  ShieldCheck, 
  Mail, 
  Sparkles, 
  HardDrive,
  CheckCircle2,
  Shield,
  LayoutDashboard,
  CloudOff
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { isRecentQuotaExceeded } from '../utils/firestoreErrorHelper';

interface UserProfileMenuProps {
  onOpenAdmin?: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ onOpenAdmin }) => {
  const { user, isAdmin, isGuest, logout, hasExistingLocalCareer } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const isLocalMode = isRecentQuotaExceeded();

  return (
    <div className="relative">
      {user ? (
        // Authenticated User Button
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-right border ${
            isAdmin 
              ? 'bg-purple-950/40 hover:bg-purple-900/50 border-purple-500/40 text-purple-200' 
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700/80'
          }`}
          title="الملف الشخصي والحساب السحابي"
        >
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            isAdmin 
              ? 'bg-purple-500/30 border border-purple-400 text-purple-200' 
              : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
          }`}>
            {isAdmin ? <Shield className="w-3 h-3 text-purple-300" /> : (user.displayName ? user.displayName.charAt(0) : <User className="w-3 h-3 text-emerald-400" />)}
          </div>
          <div className="hidden md:flex flex-col leading-tight max-w-[85px]">
            <span className="text-[9px] text-slate-400 truncate">
              {isAdmin ? 'المسؤول' : 'سحابي'}
            </span>
            <span className="text-[11px] font-semibold text-slate-200 truncate">
              {user.displayName || 'المدرب'}
            </span>
          </div>
        </button>
      ) : (
        // Guest or Unauthenticated Button
        <button
          onClick={() => setShowAuthModal(true)}
          className="flex items-center gap-1 bg-slate-800/90 hover:bg-slate-700 border border-amber-600/40 px-2 py-1.5 rounded-lg transition-colors text-amber-300 text-xs font-semibold"
          title="تسجيل الدخول لحفظ التقدم سحابياً"
        >
          <LogIn className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">حفظ سحابي</span>
        </button>
      )}

      {/* Dropdown Menu */}
      {isDropdownOpen && user && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-3 text-slate-200 animate-fadeIn">
            {/* User Info Header */}
            <div className="p-2 border-b border-slate-800 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
                  isAdmin 
                    ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300' 
                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                }`}>
                  {user.displayName ? user.displayName.charAt(0) : <User className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-100 truncate">{user.displayName || 'المدرب'}</h4>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isAdmin ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isAdmin ? 'مسؤول النظام (Super Admin)' : 'مدرب (Player)'}
                  </span>
                </div>
              </div>
              {user.email && (
                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-1">
                  <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                  <span dir="ltr">{user.email}</span>
                </p>
              )}
            </div>

            {/* Admin Panel Direct Link Button if user is Admin */}
            {isAdmin && (
              <div className="mb-2">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onOpenAdmin) onOpenAdmin();
                    else window.location.hash = '#admin';
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-950/60"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>فتح لوحة الإدارة (Admin Panel)</span>
                </button>
              </div>
            )}

            {/* Account Status Items */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400">حالة الحساب</span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>نشط ومؤمن</span>
                </span>
              </div>

              {isLocalMode ? (
                <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300 flex items-start gap-2">
                  <CloudOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">حفظ محلي مستمر</span>
                    <span className="text-[10px] text-amber-400/80">
                      تقدمك محفوظ بأمان في المتصفح، وستتم المزامنة السحابية تلقائياً عند تجديد الحصة اليومية.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-400">الحفظ السحابي</span>
                  <span className="text-emerald-400 text-[11px] font-medium">متصل وسحابي</span>
                </div>
              )}

              {hasExistingLocalCareer && !isLocalMode && (
                <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>تم رصد مسيرة محفوظة محلياً على جهازك</span>
                </div>
              )}
            </div>

            {/* Logout Action */}
            <div className="mt-3 pt-2 border-t border-slate-800">
              <button
                onClick={async () => {
                  setIsDropdownOpen(false);
                  await logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 rounded-xl transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Auth Modal Trigger */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
};
