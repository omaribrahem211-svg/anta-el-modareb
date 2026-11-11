import React, { useState, useMemo } from 'react';
import { Club } from '../types/game';
import { INITIAL_TEAMS } from '../data/initialData';
import { 
  Shield, 
  MapPin, 
  Coins, 
  Users, 
  Building2, 
  Star, 
  Search, 
  CheckCircle2, 
  ArrowLeft,
  X,
  Trophy
} from 'lucide-react';
import { ModalPortal } from './common/ModalPortal';

interface ClubSelectionModalProps {
  onClubSelected: (clubId: string) => void;
  onClose?: () => void;
  initialSelectedClubId?: string;
  isMandatory?: boolean;
}

export const ClubSelectionModal: React.FC<ClubSelectionModalProps> = ({
  onClubSelected,
  onClose,
  initialSelectedClubId,
  isMandatory = false,
}) => {
  // Available 4th Tier Clubs strictly from the database
  const tier4Clubs: Club[] = useMemo(() => {
    return INITIAL_TEAMS.filter(t => t.division === 4 || t.leagueId === 'egy_tier_4');
  }, []);

  const [selectedClubId, setSelectedClubId] = useState<string>(
    initialSelectedClubId || tier4Clubs[0]?.id || 'team_user'
  );
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClubs = useMemo(() => {
    if (!searchQuery.trim()) return tier4Clubs;
    const q = searchQuery.trim().toLowerCase();
    return tier4Clubs.filter(
      c => c.name.toLowerCase().includes(q) || 
           c.shortName.toLowerCase().includes(q) || 
           c.city.toLowerCase().includes(q)
    );
  }, [tier4Clubs, searchQuery]);

  const selectedClub = useMemo(() => {
    return tier4Clubs.find(c => c.id === selectedClubId) || tier4Clubs[0];
  }, [tier4Clubs, selectedClubId]);

  const handleConfirm = () => {
    if (selectedClubId) {
      onClubSelected(selectedClubId);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-emerald-500/10 text-slate-100 relative overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>اختر ناديك لبدء المسيرة</span>
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 font-normal">
                  الدرجة الرابعة
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تصفح واختر أحد أندية الدرجة الرابعة الرسمية ({tier4Clubs.length} نادياً متاحاً) لقيادته نحو المجد
              </p>
            </div>
          </div>

          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search Filter */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-slate-900/90 border-b border-slate-800/80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم النادي أو المدينة (مثال: حلوان، ميت عقبة، طنطا، الفيوم...)"
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Content: Clubs Grid & Selected Details */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredClubs.map((club) => {
              const isSelected = club.id === selectedClubId;
              return (
                <div
                  key={club.id}
                  onClick={() => setSelectedClubId(club.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-400 shadow-lg shadow-emerald-950/50 scale-[1.01]'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5 mb-2.5">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md border border-white/20 shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${club.primaryColor} 0%, ${club.secondaryColor} 100%)`
                        }}
                      >
                        <Shield className="w-5 h-5 drop-shadow" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-white leading-tight">
                          {club.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span>{club.city}</span>
                        </div>
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                        <CheckCircle2 className="w-4 h-4 fill-emerald-500 text-slate-950" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
                    <div className="flex items-center gap-1 text-slate-300">
                      <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="font-mono font-bold text-amber-300">
                        {club.budget.toLocaleString()} ج.م
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-300">
                      <Users className="w-3 h-3 text-sky-400 shrink-0" />
                      <span>{club.players?.length || 18} لاعب</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1 text-slate-400 text-[10px] truncate">
                      <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{club.facilities?.stadiumName}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredClubs.length === 0 && (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Shield className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm">لم يتم العثور على أندية تطابق بحثك</p>
            </div>
          )}
        </div>

        {/* Selected Club Summary Footer & Confirmation */}
        <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          {selectedClub && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md border border-white/20"
                style={{
                  background: `linear-gradient(135deg, ${selectedClub.primaryColor} 0%, ${selectedClub.secondaryColor} 100%)`
                }}
              >
                <Shield className="w-5 h-5 drop-shadow" />
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">النادي المختار:</div>
                <div className="font-black text-sm text-white flex items-center gap-1.5">
                  <span>{selectedClub.name}</span>
                  <span className="text-[11px] text-emerald-400 font-normal">({selectedClub.city})</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {!isMandatory && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <span>تأكيد وبدء المسيرة مع {selectedClub?.shortName || 'النادي'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
      </div>
    </ModalPortal>
  );
};
