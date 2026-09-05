import React, { useState } from 'react';
import { Trophy, Shield, User, Globe, Calendar, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { saveLocalTrainerProfile, LocalTrainerProfile } from '../services/trainerProfileService';

interface CreateTrainerModalProps {
  onProfileCreated: (profile: LocalTrainerProfile) => void;
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
  const [name, setName] = useState('الكابتن الجديد');
  const [age, setAge] = useState<number>(35);
  const [nationality, setNationality] = useState('مصري');
  const [customNationality, setCustomNationality] = useState('');
  const [isCustomNat, setIsCustomNat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const finalNat = isCustomNat ? customNationality.trim() : nationality.trim();

    if (!trimmedName) {
      setError('يرجى كتابة اسم المدرب.');
      return;
    }

    if (!finalNat) {
      setError('يرجى اختيار أو كتابة جنسية المدرب.');
      return;
    }

    if (age < 20 || age > 80) {
      setError('عمر المدرب يجب أن يكون بين 20 و 80 عاماً.');
      return;
    }

    // Save profile locally and generate Trainer ID
    const newProfile = saveLocalTrainerProfile({
      name: trimmedName,
      age,
      nationality: finalNat,
    });

    onProfileCreated(newProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl w-full max-w-lg p-5 sm:p-8 shadow-2xl shadow-emerald-500/10 text-slate-100 relative">
        
        {/* Top Visual Emblem */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 border border-emerald-400/40 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-600/30">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
            أنشئ بروفايل المدرب
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            مرحباً بك في <span className="text-emerald-400 font-bold">أنت المدرب</span>! جهز هويتك التدريبية لبدء رحلتك نحو المجد من دوري الدرجة الرابعة.
          </p>
        </div>

        {/* Form Error */}
        {error && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-2xl flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Trainer Name Field */}
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
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-colors font-medium outline-none"
              required
            />
          </div>

          {/* Trainer Age Field */}
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
                  setAge(parseInt(e.target.value) || 35);
                  if (error) setError(null);
                }}
                className="w-28 bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl px-4 py-3 text-sm text-white font-mono font-bold text-center outline-none"
                required
              />
              <span className="text-xs text-slate-400 font-medium">سنة (بين 20 و 80 عاماً)</span>
            </div>
          </div>

          {/* Trainer Nationality Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>جنسية المدرب</span>
            </label>

            {/* Quick selector chips */}
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

          {/* Summary Feature Highlights */}
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>حفظ محلي فوري (Local-First)</span>
            </div>
            <p>
              يتم حفظ بيانات ناديك ومسيرتك فوراً على جهازك دون الحاجة لتسجيل حساب أو بريد إلكتروني.
            </p>
          </div>

          {/* Big Start Career Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <span>ابدأ مسيرتي</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
