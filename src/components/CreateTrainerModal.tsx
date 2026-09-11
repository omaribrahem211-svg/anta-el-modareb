import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Shield, 
  User, 
  Globe, 
  Calendar, 
  ArrowLeft, 
  ArrowRight,
  Sparkles, 
  CheckCircle2,
  Coins,
  Users,
  Building2,
  MapPin,
  Search
} from 'lucide-react';
import { saveLocalTrainerProfile, LocalTrainerProfile } from '../services/trainerProfileService';
import { INITIAL_TEAMS } from '../data/initialData';
import { Club } from '../types/game';

interface CreateTrainerModalProps {
  onProfileCreated: (profile: LocalTrainerProfile, startingClubId?: string) => void;
}

const COMMON_NATIONALITIES = [
  'مصري',
  'سعودي',
  'مغربي',
  'جزائري',
  'تونسي',
  'إماراتي',
  'قطري',
  'أردني',
  'عراقي',
  'سوري',
  'برازيلي',
  'إسباني',
  'ألماني',
  'إيطالي',
  'إنجليزي',
  'فرنسي',
];

export const CreateTrainerModal: React.FC<CreateTrainerModalProps> = ({ onProfileCreated }) => {
  const [step, setStep] = useState<'profile' | 'club'>('profile');
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | string>(35);
  const [nationality, setNationality] = useState('مصري');
  const [customNationality, setCustomNationality] = useState('');
  const [isCustomNat, setIsCustomNat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 4th Tier Clubs from database
  const tier4Clubs: Club[] = useMemo(() => {
    return INITIAL_TEAMS.filter(t => t.division === 4 || t.leagueId === 'egy_tier_4');
  }, []);

  const [selectedClubId, setSelectedClubId] = useState<string>(tier4Clubs[0]?.id || 'team_user');
  const [searchClubQuery, setSearchClubQuery] = useState('');

  const filteredClubs = useMemo(() => {
    if (!searchClubQuery.trim()) return tier4Clubs;
    const q = searchClubQuery.trim().toLowerCase();
    return tier4Clubs.filter(
      c => c.name.toLowerCase().includes(q) || 
           c.shortName.toLowerCase().includes(q) || 
           c.city.toLowerCase().includes(q)
    );
  }, [tier4Clubs, searchClubQuery]);

  const selectedClub = useMemo(() => {
    return tier4Clubs.find(c => c.id === selectedClubId) || tier4Clubs[0];
  }, [tier4Clubs, selectedClubId]);

  const handleProfileNext = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const finalNat = isCustomNat ? customNationality.trim() : nationality.trim();
    const numAge = typeof age === 'number' ? age : (parseInt(age) || 0);

    if (!trimmedName) {
      setError('يرجى كتابة اسم المدرب.');
      return;
    }

    if (!finalNat) {
      setError('يرجى اختيار أو كتابة جنسية المدرب.');
      return;
    }

    if (numAge < 20 || numAge > 80) {
      setError('عمر المدرب يجب أن يكون بين 20 و 80 عاماً.');
      return;
    }

    setError(null);
    setStep('club');
  };

  const handleFinalSubmit = () => {
    const trimmedName = name.trim();
    const finalNat = isCustomNat ? customNationality.trim() : nationality.trim();
    const finalAge = typeof age === 'number' ? age : (parseInt(age as string) || 35);

    const newProfile = saveLocalTrainerProfile({
      name: trimmedName,
      age: finalAge,
      nationality: finalNat,
    });

    onProfileCreated(newProfile, selectedClubId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col p-5 sm:p-7 shadow-2xl shadow-emerald-500/10 text-slate-100 relative overflow-hidden">
        
        {/* Step Indicator Header */}
        <div className="text-center mb-5 shrink-0">
          <img 
            src="/anta_elmodareb_logo.png" 
            alt="أنت المدرب" 
            className="w-16 h-16 rounded-2xl object-cover shadow-xl border border-amber-500/40 mx-auto mb-3"
            referrerPolicy="no-referrer"
          />
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              step === 'profile'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400'
            }`}>
              <span>1. هوية المدرب</span>
            </div>
            <div className="w-4 h-0.5 bg-slate-800" />
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              step === 'club'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400'
            }`}>
              <span>2. اختيار النادي</span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
            {step === 'profile' ? 'أنشئ بروفايل المدرب' : 'اختر ناديك في الدرجة الرابعة'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {step === 'profile' 
              ? 'جهز هويتك التدريبية لبدء رحلتك نحو المجد في لعبة أنت المدرب' 
              : `اختر من بين ${tier4Clubs.length} نادياً متاحاً في دوري الدرجة الرابعة المصري`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-2xl flex items-center gap-2 shrink-0">
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Trainer Profile Form */}
        {step === 'profile' && (
          <form onSubmit={handleProfileNext} className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Trainer Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>اسم المدرب</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="مثال: كابتن أحمد حسن"
                maxLength={30}
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 font-medium outline-none transition-colors"
                required
              />
            </div>

            {/* Trainer Age */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>عمر المدرب (بالسنوات)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="20"
                  max="80"
                  value={age}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAge(val === '' ? '' : parseInt(val) || '');
                    if (error) setError(null);
                  }}
                  onBlur={() => {
                    if (age === '' || Number(age) < 20) setAge(20);
                    else if (Number(age) > 80) setAge(80);
                  }}
                  className="w-28 bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl px-4 py-3 text-sm text-white font-mono font-bold text-center outline-none"
                  required
                />
                <span className="text-xs text-slate-400 font-medium">سنة (بين 20 و 80 عاماً)</span>
              </div>
            </div>

            {/* Trainer Nationality */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>جنسية المدرب</span>
              </label>

              <div className="flex flex-wrap gap-1.5 mb-2.5 max-h-28 overflow-y-auto p-1 bg-slate-950/60 rounded-2xl border border-slate-800">
                {COMMON_NATIONALITIES.map((nat) => {
                  const isSelected = !isCustomNat && nationality === nat;
                  return (
                    <button
                      key={nat}
                      type="button"
                      onClick={() => {
                        setNationality(nat);
                        setIsCustomNat(false);
                        if (error) setError(null);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50'
                      }`}
                    >
                      {nat}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setIsCustomNat(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isCustomNat
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50'
                  }`}
                >
                  + جنسية أخرى
                </button>
              </div>

              {isCustomNat && (
                <input
                  type="text"
                  value={customNationality}
                  onChange={(e) => {
                    setCustomNationality(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="اكتب اسم الجنسية هنا..."
                  maxLength={25}
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none animate-fadeIn"
                />
              )}
            </div>

            {/* Next Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <span>التالي: اختيار النادي</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Choose 4th Tier Club */}
        {step === 'club' && (
          <div className="flex flex-col flex-1 overflow-hidden space-y-3">
            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchClubQuery}
                onChange={(e) => setSearchClubQuery(e.target.value)}
                placeholder="ابحث باسم النادي أو المدينة..."
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            {/* Clubs Grid List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredClubs.map((club) => {
                const isSelected = club.id === selectedClubId;
                return (
                  <div
                    key={club.id}
                    onClick={() => setSelectedClubId(club.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-950/50 border-emerald-400 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md border border-white/20 shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${club.primaryColor} 0%, ${club.secondaryColor} 100%)`
                        }}
                      >
                        <Shield className="w-4 h-4 drop-shadow" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white leading-tight">
                          {club.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            {club.city}
                          </span>
                          <span>•</span>
                          <span className="text-amber-400 font-mono font-bold">
                            {club.budget.toLocaleString()} ج.م
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-700" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Club Summary & Final Confirm CTA */}
            <div className="pt-2 border-t border-slate-800 shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('profile')}
                className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>رجوع</span>
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                className="flex-1 py-3.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <span>ابدأ مسيرتي مع {selectedClub?.shortName || 'النادي'}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
