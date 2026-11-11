import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Trophy, 
  Coins, 
  Shield, 
  Star, 
  Activity, 
  Clock, 
  Flame, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Sliders,
  ChevronRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { PvPMatch } from '../../types/pvp';
import { TeamTactics, Mentality, PassingStyle, PressingIntensity, MatchTempo } from '../../types/game';
import { 
  lockAndSimulatePvPMatch, 
  subscribeToMatch, 
  updateParticipantTactics,
  cancelPvPMatch
} from '../../services/pvpService';
import { isQuotaExceededError, PVP_QUOTA_USER_MESSAGE } from '../../utils/firestoreErrorHelper';

interface PvPMatchViewModalProps {
  initialMatch: PvPMatch;
  onClose: () => void;
  onMatchUpdated?: (match: PvPMatch) => void;
}

export const PvPMatchViewModal: React.FC<PvPMatchViewModalProps> = ({
  initialMatch,
  onClose,
  onMatchUpdated
}) => {
  const { user } = useAuth();
  const { userClub } = useGame();

  const [match, setMatch] = useState<PvPMatch>(initialMatch);
  const [activeTab, setActiveTab] = useState<'simulation' | 'tactics' | 'stats'>('simulation');
  const [simulating, setSimulating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local tactic edits
  const isPlayer1 = user?.uid === match.player1Id;
  const isPlayer2 = user?.uid === match.player2Id;
  const myParticipant = isPlayer1 ? match.player1 : isPlayer2 ? match.player2 : null;
  const opponentParticipant = isPlayer1 ? match.player2 : match.player1;

  const [customTactics, setCustomTactics] = useState<TeamTactics>(
    myParticipant?.tactics || userClub?.tactics || {
      formation: '4-3-3',
      mentality: 'balanced',
      passingStyle: 'short',
      pressingIntensity: 'balanced',
      tempo: 'balanced',
      startingPlayerIds: userClub?.players ? userClub.players.slice(0, 11).map(p => p.id) : [],
      benchPlayerIds: userClub?.players ? userClub.players.slice(11, 18).map(p => p.id) : [],
      captainId: userClub?.players?.[0]?.id || '',
      penaltyTakerId: userClub?.players?.[0]?.id || '',
      freeKickTakerId: userClub?.players?.[0]?.id || '',
      cornerTakerId: userClub?.players?.[0]?.id || '',
    }
  );

  // Subscribe to live match updates
  useEffect(() => {
    if (!initialMatch?.id) return;
    const unsubscribe = subscribeToMatch(initialMatch.id, (updatedMatch) => {
      if (updatedMatch) {
        setMatch(updatedMatch);
        if (onMatchUpdated) onMatchUpdated(updatedMatch);
      } else {
        setError('مباراة التحدي لم تعد متاحة.');
      }
    });
    return () => unsubscribe();
  }, [initialMatch?.id]);

  // Handle tactical changes
  const handleSaveTactics = async () => {
    if (!user || !myParticipant) return;
    try {
      setError(null);
      const starting = userClub?.players ? userClub.players.filter(p => customTactics.startingPlayerIds.includes(p.id)) : [];
      const bench = userClub?.players ? userClub.players.filter(p => customTactics.benchPlayerIds.includes(p.id)) : [];
      await updateParticipantTactics(match.id, user.uid, isPlayer1, customTactics, starting, bench);
      setActiveTab('simulation');
    } catch (err: any) {
      setError(err.message || 'فشل حفظ التكتيك.');
    }
  };

  // Handle launching simulation
  const handleStartSimulation = async () => {
    if (match.status === 'completed') return;
    if (!match.player1 || !match.player2) {
      setError('في انتظار انضمام المنافس لبدء المباراة.');
      return;
    }

    try {
      setSimulating(true);
      setError(null);
      const simulated = await lockAndSimulatePvPMatch(match.id);
      setMatch(simulated);
      if (onMatchUpdated) onMatchUpdated(simulated);
    } catch (err: any) {
      console.error('Simulation error:', err);
      const isQuota = isQuotaExceededError(err);
      setError(isQuota ? PVP_QUOTA_USER_MESSAGE : (err.message || 'حدث خطأ أثناء محاكاة المباراة.'));
    } finally {
      setSimulating(false);
    }
  };

  const handleCancelMatch = async () => {
    if (!user) return;
    try {
      setCancelling(true);
      setError(null);
      await cancelPvPMatch(match.id, user.uid, 'إلغاء من قبل المدرب');
      onClose();
    } catch (err: any) {
      const isQuota = isQuotaExceededError(err);
      setError(isQuota ? PVP_QUOTA_USER_MESSAGE : (err.message || 'فشل إلغاء المباراة.'));
      setCancelling(false);
    }
  };

  const isCompleted = match.status === 'completed';
  const isHost = isPlayer1;
  const prize = match.prizeAmount || match.stakeAmount || 0;
  const reward = match.winnerReward || prize * 2;

  // Determine win / lose / draw for current user
  const isDraw = isCompleted && match.isDraw;
  const isWinner = isCompleted && match.winnerId === user?.uid;
  const isLoser = isCompleted && !isDraw && !isWinner;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-right">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              prize > 0 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              {prize > 0 ? <Coins className="w-5 h-5" /> : <Flame className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {prize > 0 ? 'مباراة تحدي بجائزة افتراضية' : 'مباراة ودية أونلاين'}
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  match.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : match.status === 'waiting_for_opponent'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {match.status === 'completed' ? 'انتهت المباراة' : match.status === 'waiting_for_opponent' ? 'في انتظار الخصم' : 'جاهزة للعب'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {prize > 0 ? `الجائزة الإجمالية للفائز: ${reward.toLocaleString()} كوينز 🪙` : 'مباراة لتصنيف نقاط Elo والخبرة التكتيكية'}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-slate-800/80 px-6 gap-2 bg-slate-950/30">
          <button
            onClick={() => setActiveTab('simulation')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'simulation'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>مجريات المباراة والنتيجة</span>
          </button>

          {!isCompleted && myParticipant && (
            <button
              onClick={() => setActiveTab('tactics')}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'tactics'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>تعديل تكتيك الفريق</span>
            </button>
          )}

          {isCompleted && match.stats && (
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'stats'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>إحصائيات تفصيلية</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* TAB 1: MATCH SIMULATION & SCOREBOARD */}
          {activeTab === 'simulation' && (
            <div className="space-y-6">
              
              {/* Grand Match Card (Pitch Theme) */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-900/40 p-6 shadow-xl">
                
                {/* Visual Pitch Line Texture */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent pointer-events-none"></div>

                <div className="relative z-10 grid grid-cols-3 items-center text-center">
                  
                  {/* Home Participant (Player 1) */}
                  <div className="flex flex-col items-center space-y-2">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg border-2"
                      style={{ 
                        backgroundColor: match.player1.clubPrimaryColor || '#10b981',
                        borderColor: '#ffffff30',
                        color: '#ffffff'
                      }}
                    >
                      {match.player1.clubName.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{match.player1.clubName}</h3>
                      <p className="text-xs text-slate-400">{match.player1.displayName}</p>
                      <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px] text-amber-400 font-mono">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{match.player1.eloRating} Elo</span>
                      </div>
                    </div>
                  </div>

                  {/* Center Score / Status */}
                  <div className="flex flex-col items-center justify-center space-y-2">
                    {isCompleted && match.score ? (
                      <div className="space-y-1">
                        <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-widest bg-slate-950/80 px-6 py-2 rounded-2xl border border-slate-800 shadow-inner">
                          {match.score.player1} - {match.score.player2}
                        </div>
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                          صافرة النهاية
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-2xl font-black text-slate-400 font-mono bg-slate-950/60 px-5 py-2 rounded-2xl border border-slate-800">
                          VS
                        </div>
                        <span className="text-xs text-slate-400 font-medium block">
                          {match.player2 ? 'الفريقان جاهزان' : 'في انتظار اكتمال التحدي'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Away Participant (Player 2) */}
                  <div className="flex flex-col items-center space-y-2">
                    {match.player2 ? (
                      <>
                        <div 
                          className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg border-2"
                          style={{ 
                            backgroundColor: match.player2.clubPrimaryColor || '#3b82f6',
                            borderColor: '#ffffff30',
                            color: '#ffffff'
                          }}
                        >
                          {match.player2.clubName.substring(0, 2)}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white">{match.player2.clubName}</h3>
                          <p className="text-xs text-slate-400">{match.player2.displayName}</p>
                          <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px] text-amber-400 font-mono">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{match.player2.eloRating} Elo</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 animate-pulse">
                          ؟
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-400">منافس أونلاين</h3>
                          <p className="text-xs text-slate-500">{match.player2Email ? `مرسلة إلى: ${match.player2Email}` : 'في انتظار البحث...'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Outcome Banner if Completed */}
                {isCompleted && (
                  <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      {isWinner ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/50 px-3 py-1.5 rounded-xl">
                          <Trophy className="w-4 h-4 text-emerald-400" />
                          <span>ألف مبروك! فزت بمباراة التحدي 🏆</span>
                        </div>
                      ) : isDraw ? (
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold bg-amber-950/60 border border-amber-800/50 px-3 py-1.5 rounded-xl">
                          <Shield className="w-4 h-4 text-amber-400" />
                          <span>مباراة متكافئة انتهت بالتعادل وتم استرداد الجائزة الافتراضية للطرفين</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-950/60 border border-rose-800/50 px-3 py-1.5 rounded-xl">
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span>هزيمة في هذه المواجهة، عوضها في التحدي القادم!</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Elo Delta */}
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono">
                        <span className="text-slate-400">التصنيف:</span>
                        <span className={`font-bold flex items-center gap-0.5 ${
                          (isPlayer1 ? match.player1EloDelta || 0 : match.player2EloDelta || 0) >= 0 
                            ? 'text-emerald-400' 
                            : 'text-rose-400'
                        }`}>
                          {(isPlayer1 ? match.player1EloDelta || 0 : match.player2EloDelta || 0) >= 0 ? '+' : ''}
                          {isPlayer1 ? match.player1EloDelta : match.player2EloDelta} Elo
                        </span>
                      </div>

                      {/* Coins Delta */}
                      {prize > 0 && (
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono">
                          <span className="text-slate-400">الكوينز:</span>
                          <span className={`font-bold ${
                            (isPlayer1 ? match.player1CoinsDelta || 0 : match.player2CoinsDelta || 0) > 0 
                              ? 'text-amber-400' 
                              : 'text-slate-400'
                          }`}>
                            +{(isPlayer1 ? match.player1CoinsDelta || 0 : match.player2CoinsDelta || 0)} 🪙
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Action Buttons if Not Completed */}
              {!isCompleted && (
                <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-white">إطلاق صافرة البداية والمحاكاة:</h4>
                    <p className="text-[11px] text-slate-400">
                      {match.player2 
                        ? 'كلا الفريقين قاما بتأكيد التشكيل. اضغط على الزر لبدء المحاكاة وحساب النتيجة.' 
                        : 'في انتظار دخول الخصم أو قبول الصديق للدعوة.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {match.status === 'waiting_for_opponent' && isHost && (
                      <button
                        onClick={handleCancelMatch}
                        disabled={cancelling}
                        className="px-4 py-2 rounded-xl bg-red-950/60 border border-red-800/50 hover:bg-red-900/60 text-red-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {cancelling ? 'جاري الإلغاء...' : 'إلغاء التحدي واسترداد الكوينز'}
                      </button>
                    )}

                    {match.player2 && (
                      <button
                        onClick={handleStartSimulation}
                        disabled={simulating}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                      >
                        {simulating ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                          <Play className="w-4 h-4 fill-white" />
                        )}
                        <span>بدء المحاكاة المباشرة</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Match Events List */}
              {isCompleted && match.events && match.events.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>أبرز أحداث ومجريات اللقاء (الدقائق والتعليق):</span>
                  </h4>
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                    {match.events.map((ev, idx) => (
                      <div key={idx} className="p-3 flex items-start gap-3 text-xs hover:bg-slate-900/50 transition-colors">
                        <span className="font-mono font-bold text-emerald-400 w-10 text-left shrink-0">
                          {ev.minute}'
                        </span>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            {ev.type === 'goal' && <span className="text-emerald-400 font-bold">⚽ هدف!</span>}
                            {ev.type === 'yellow_card' && <span className="text-amber-400 font-bold">🟨 بطاقة صفراء</span>}
                            {ev.type === 'red_card' && <span className="text-rose-500 font-bold">🟥 بطاقة حمراء!</span>}
                            {ev.type === 'chance' && <span className="text-blue-400 font-medium">⚡ فرصة خطيرة</span>}
                            {ev.type === 'save' && <span className="text-cyan-400 font-medium">🧤 تصدي حاسم</span>}
                            <span className="text-slate-200 font-semibold">{ev.playerName || ''}</span>
                          </div>
                          <p className="text-slate-400 text-[11px]">{ev.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: TACTICS ADJUSTMENT */}
          {activeTab === 'tactics' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    <span>تعديل إعدادات التكتيك الخاصة بمباراة الأونلاين</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    التشكيلة: {customTactics.formation}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Mentality */}
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold">عقلية اللعب:</label>
                    <select
                      value={customTactics.mentality}
                      onChange={(e) => setCustomTactics({ ...customTactics, mentality: e.target.value as Mentality })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none"
                    >
                      <option value="very_defensive">دفاع حديدي (حافلة)</option>
                      <option value="defensive">دفاعي ومتحفظ</option>
                      <option value="balanced">متوازن وواقعي</option>
                      <option value="attacking">هجومي ضاغط</option>
                      <option value="very_attacking">هجوم كاسح شامل</option>
                    </select>
                  </div>

                  {/* Passing Style */}
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold">أسلوب التمرير:</label>
                    <select
                      value={customTactics.passingStyle}
                      onChange={(e) => setCustomTactics({ ...customTactics, passingStyle: e.target.value as PassingStyle })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none"
                    >
                      <option value="short">تمريرات قصيرة (تيكي تاكا)</option>
                      <option value="mixed">تنوع تكتيكي مختلط</option>
                      <option value="direct">كرات طولية مباشرة</option>
                    </select>
                  </div>

                  {/* Pressing Intensity */}
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold">شدة الضغط العالي:</label>
                    <select
                      value={customTactics.pressingIntensity}
                      onChange={(e) => setCustomTactics({ ...customTactics, pressingIntensity: e.target.value as PressingIntensity })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none"
                    >
                      <option value="low">تراجع في نصف الملعب</option>
                      <option value="balanced">ضغط متوازن</option>
                      <option value="high">ضغط عالي مستمر</option>
                    </select>
                  </div>

                  {/* Tempo */}
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold">سرعة ريتم اللعب:</label>
                    <select
                      value={customTactics.tempo}
                      onChange={(e) => setCustomTactics({ ...customTactics, tempo: e.target.value as MatchTempo })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none"
                    >
                      <option value="slow">تحضير هادئ وبطيء</option>
                      <option value="balanced">إيقاع طبيعي</option>
                      <option value="fast">ريتم سريع ومرتدات</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <button
                    onClick={handleSaveTactics}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>حفظ واعتماد التكتيك للمباراة</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: DETAILED STATS */}
          {activeTab === 'stats' && match.stats && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4 text-xs">
                <h4 className="font-bold text-white text-center border-b border-slate-800 pb-2">
                  مقارنة الأرقام والإحصائيات
                </h4>

                <div className="space-y-3">
                  {/* Possession */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-300 font-mono">
                      <span>{match.stats.homePossession}%</span>
                      <span className="text-slate-400 font-sans">نسبة الاستحواذ</span>
                      <span>{match.stats.awayPossession}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${match.stats.homePossession}%` }}
                      ></div>
                      <div 
                        className="bg-blue-500 h-full transition-all"
                        style={{ width: `${match.stats.awayPossession}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Total Shots */}
                  <div className="flex justify-between py-2 border-b border-slate-800/60 font-mono text-slate-200">
                    <span className="font-bold">{match.stats.homeShots}</span>
                    <span className="text-slate-400 font-sans">إجمالي التسديدات</span>
                    <span className="font-bold">{match.stats.awayShots}</span>
                  </div>

                  {/* Shots on Target */}
                  <div className="flex justify-between py-2 border-b border-slate-800/60 font-mono text-slate-200">
                    <span className="font-bold">{match.stats.homeShotsOnTarget}</span>
                    <span className="text-slate-400 font-sans">التسديدات على المرمى</span>
                    <span className="font-bold">{match.stats.awayShotsOnTarget}</span>
                  </div>

                  {/* Fouls */}
                  <div className="flex justify-between py-2 border-b border-slate-800/60 font-mono text-slate-200">
                    <span className="font-bold">{match.stats.homeFouls}</span>
                    <span className="text-slate-400 font-sans">الأخطاء المرتكبة</span>
                    <span className="font-bold">{match.stats.awayFouls}</span>
                  </div>

                  {/* Corners */}
                  <div className="flex justify-between py-2 font-mono text-slate-200">
                    <span className="font-bold">{match.stats.homeCorners}</span>
                    <span className="text-slate-400 font-sans">الضربات الركنية</span>
                    <span className="font-bold">{match.stats.awayCorners}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
