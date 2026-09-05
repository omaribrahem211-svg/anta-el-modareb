import React, { useState } from 'react';
import {
  Users,
  Award,
  HeartPulse,
  Brain,
  TrendingUp,
  Shield,
  Star,
  CheckCircle2,
  DollarSign,
  UserPlus,
  Briefcase,
  AlertCircle,
  X
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { StaffMember, StaffRole } from '../types/game';
import { AVAILABLE_STAFF_CANDIDATES } from '../data/staffData';
import { getClubStaff, getClubStaffBonuses } from '../utils/staffEngine';

const ROLE_ICONS: Record<StaffRole, React.ReactNode> = {
  assistant_manager: <Briefcase className="w-4 h-4 text-amber-400" />,
  fitness_coach: <TrendingUp className="w-4 h-4 text-emerald-400" />,
  psychologist: <Brain className="w-4 h-4 text-purple-400" />,
  medical_doctor: <HeartPulse className="w-4 h-4 text-rose-400" />,
  performance_analyst: <Award className="w-4 h-4 text-blue-400" />,
};

const ROLE_LABELS: Record<StaffRole, string> = {
  assistant_manager: 'المدرب المساعد الأول',
  fitness_coach: 'مخطط الأحمال ومدرب اللياقة',
  psychologist: 'المعد والمستشار النفسي الرياضي',
  medical_doctor: 'طبيب النادي وإخصائي الإصابات',
  performance_analyst: 'محلل الأداء والخطط الفنية',
};

export const StaffManagementCard: React.FC = () => {
  const { userClub, hireClubStaff, fireClubStaff } = useGame();
  const [selectedRoleForHire, setSelectedRoleForHire] = useState<StaffRole | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!userClub) return null;

  const currentStaff = getClubStaff(userClub);
  const staffBonuses = getClubStaffBonuses(userClub);

  const handleHire = (candidate: StaffMember) => {
    if (userClub.budget < candidate.salaryMonthly) {
      setToastMessage('ميزانية النادي لا تكفي لتغطية مقدم التعاقد والرواتب!');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    hireClubStaff(candidate);
    setToastMessage(`تم التعاقد رسمياً مع ${candidate.name} كـ ${candidate.roleTitleArabic}! 🎉`);
    setSelectedRoleForHire(null);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getStaffMemberForRole = (role: StaffRole): StaffMember | undefined => {
    return currentStaff.find(m => m.role === role);
  };

  const candidateList = selectedRoleForHire
    ? AVAILABLE_STAFF_CANDIDATES.filter(c => c.role === selectedRoleForHire)
    : [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <span>الجهاز الفني والطاقم المعاون للنادي</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                طاقم محترف
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              تعيين مدربين مساعدين، أطباء نفسيين، ومخططي أحمال لحماية لياقة الفريق وتفوقه التكتيكي
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <div className="text-[10px] text-slate-400">إجمالي رواتب الطاقم الشهرية:</div>
          <div className="text-xs font-black text-amber-400 font-mono">
            {staffBonuses.totalMonthlySalary.toLocaleString()} ج.م / شهر
          </div>
        </div>
      </div>

      {/* Cumulative Staff Bonuses Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 text-center">
        <div className="space-y-0.5">
          <div className="text-[10px] text-slate-400">التناغم التكتيكي</div>
          <div className="text-xs font-black text-amber-400">
            +{(staffBonuses.tacticalSynergyBonus * 100).toFixed(0)}%
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="text-[10px] text-slate-400">توفير اللياقة بالماتش</div>
          <div className="text-xs font-black text-emerald-400">
            +{(staffBonuses.staminaDrainReduction * 100).toFixed(0)}%
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="text-[10px] text-slate-400">سرعة الاستشفاء</div>
          <div className="text-xs font-black text-blue-400">
            +{(staffBonuses.restRecoveryBonus * 100).toFixed(0)}%
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="text-[10px] text-slate-400">حماية نفسية البدلاء</div>
          <div className="text-xs font-black text-purple-400">
            +{(staffBonuses.benchMoraleProtection * 100).toFixed(0)}%
          </div>
        </div>
        <div className="space-y-0.5 col-span-2 sm:col-span-1">
          <div className="text-[10px] text-slate-400">الوقاية من الإصابات</div>
          <div className="text-xs font-black text-rose-400">
            -{(staffBonuses.injuryRiskReduction * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Staff Positions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {(['assistant_manager', 'fitness_coach', 'psychologist', 'medical_doctor', 'performance_analyst'] as StaffRole[]).map(role => {
          const member = getStaffMemberForRole(role);

          return (
            <div
              key={role}
              className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl flex flex-col justify-between space-y-3 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    {ROLE_ICONS[role]}
                    <span>{ROLE_LABELS[role]}</span>
                  </span>
                  {member && (
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: member.rating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  )}
                </div>

                {member ? (
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-white">{member.name}</div>
                    <div className="text-[10px] text-amber-300/90 font-medium">{member.roleTitleArabic}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {member.description}
                    </div>
                    <div className="text-[10px] text-emerald-400 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20 font-medium">
                      💡 {member.bonusEffectArabic}
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    المنصب شاغر حالياً
                  </div>
                )}
              </div>

              {/* Action Button & Salary */}
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                <div className="text-[11px] font-mono font-bold text-slate-300">
                  {member ? `${member.salaryMonthly.toLocaleString()} ج.م / شهر` : '—'}
                </div>

                <button
                  onClick={() => setSelectedRoleForHire(role)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{member ? 'ترقية / استبدال' : 'تعيين كادر'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-950/90 border border-emerald-600 text-emerald-300 text-xs font-bold p-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hiring Modal */}
      {selectedRoleForHire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-2xl shadow-2xl p-5 space-y-4 my-8 text-white relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  {ROLE_ICONS[selectedRoleForHire]}
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">
                    المرشحون المتاحون لمنصب: {ROLE_LABELS[selectedRoleForHire]}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    اختر الكادر الأنسب لإمكانيات النادي وميزانيته الفنية والمالية
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRoleForHire(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Candidates List */}
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {candidateList.map(cand => {
                const isCurrentlyHired = getStaffMemberForRole(cand.role)?.id === cand.id;

                return (
                  <div
                    key={cand.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrentlyHired
                        ? 'bg-emerald-950/40 border-emerald-500/60'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white">{cand.name}</span>
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: cand.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        {isCurrentlyHired && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                            على رأس العمل حالياً
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-amber-300">{cand.roleTitleArabic} • {cand.specialty}</div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{cand.description}</p>
                      <div className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                        ⚡ الميزة المباشرة: {cand.bonusEffectArabic}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-left sm:text-right">
                        <div className="text-[10px] text-slate-400">الراتب الشهري:</div>
                        <div className="text-xs font-black text-amber-400 font-mono">
                          {cand.salaryMonthly.toLocaleString()} ج.م
                        </div>
                      </div>

                      <button
                        onClick={() => handleHire(cand)}
                        disabled={isCurrentlyHired}
                        className={`px-4 py-2 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer ${
                          isCurrentlyHired
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950'
                        }`}
                      >
                        {isCurrentlyHired ? 'يعمل بالفعل' : 'توقيع العقد فوراً ✍️'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
