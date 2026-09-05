import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { 
  User, 
  Settings,
  HardDrive,
  CheckCircle2,
  Shield,
  LayoutDashboard,
  Download,
  Upload,
  RotateCcw
} from 'lucide-react';
import { getLocalTrainerProfile } from '../services/trainerProfileService';
import { SettingsBackupModal } from './SettingsBackupModal';

interface UserProfileMenuProps {
  onOpenAdmin?: () => void;
  onOpenResetConfirm?: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ onOpenAdmin, onOpenResetConfirm }) => {
  const { user, isAdmin } = useAuth();
  const { manager } = useGame();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const trainerProfile = getLocalTrainerProfile();
  const trainerName = manager.name || trainerProfile?.name || 'المدرب';
  const trainerId = trainerProfile?.trainerId || manager.trainerId || 'TRN-LOCAL-READY';

  return (
    <div className="relative">
      {/* Main Profile & Settings Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-right border ${
          isAdmin 
            ? 'bg-purple-950/40 hover:bg-purple-900/50 border-purple-500/40 text-purple-200' 
            : 'bg-slate-800 hover:bg-slate-700 border-slate-700/80 text-slate-200'
        }`}
        title="ملف المدرب والإعدادات"
      >
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
          isAdmin 
            ? 'bg-purple-500/30 border border-purple-400 text-purple-200' 
            : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
        }`}>
          {isAdmin ? (
            <Shield className="w-3 h-3 text-purple-300" />
          ) : (
            trainerName.charAt(0) || <User className="w-3 h-3 text-emerald-400" />
          )}
        </div>
        <div className="hidden md:flex flex-col leading-tight max-w-[95px]">
          <span className="text-[9px] text-emerald-400 font-bold truncate">
            {isAdmin ? 'المسؤول' : 'محلي • نشط'}
          </span>
          <span className="text-[11px] font-semibold text-slate-200 truncate">
            {trainerName}
          </span>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-3 text-slate-200 animate-fadeIn text-right" dir="rtl">
            
            {/* Trainer Info Header */}
            <div className="p-2.5 border-b border-slate-800 mb-2 bg-slate-950/50 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                  isAdmin 
                    ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300' 
                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                }`}>
                  {trainerName.charAt(0) || <User className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate">{trainerName}</h4>
                  <span className="text-[10px] text-slate-400 block">
                    {manager.nationality || 'مصري'} • {manager.age || 35} سنة
                  </span>
                </div>
              </div>

              {/* Trainer ID */}
              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">معرّف المدرب:</span>
                <span className="text-slate-200 font-bold tracking-wider">{trainerId}</span>
              </div>
            </div>

            {/* Admin Panel Link if Admin */}
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

            {/* Backup & Settings Primary Action */}
            <div className="space-y-1.5 text-xs">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setShowSettingsModal(true);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-emerald-500/30 text-white font-bold transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
                  <span>إعدادات النسخ الاحتياطي</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">.anta-save</span>
              </button>

              {/* System Architecture Status */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px]">
                <span className="text-slate-400">نظام الحفظ</span>
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>محلي فوري (Local-First)</span>
                </span>
              </div>
            </div>

            {/* Danger Zone: Reset Career */}
            {onOpenResetConfirm && (
              <div className="mt-2.5 pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenResetConfirm();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>إعادة ضبط المسيرة</span>
                </button>
              </div>
            )}

          </div>
        </>
      )}

      {/* Settings & Backup Modal */}
      <SettingsBackupModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onOpenResetConfirm={onOpenResetConfirm}
      />
    </div>
  );
};
