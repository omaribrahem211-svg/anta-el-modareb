import React from 'react';
import { useGame } from '../context/GameContext';
import { Swords, AlertTriangle, Play, Zap, Sliders, CheckCircle2, ShieldAlert, X, FastForward, Clock, CalendarDays } from 'lucide-react';
import { ActiveTab } from '../types/game';

interface MatchDayBlockerModalProps {
  onNavigateTab: (tab: ActiveTab) => void;
}

export const MatchDayBlockerModal: React.FC<MatchDayBlockerModalProps> = ({ onNavigateTab }) => {
  const {
    matchBlocker,
    closeMatchBlocker,
    autoFixUserStartingLineup,
    startLiveMatch,
    instantSimulateCurrentRound,
    advanceToNextDay,
    userClub,
    currentRound,
    totalRounds,
    daysUntilNextMatch,
  } = useGame();

  if (!matchBlocker || !matchBlocker.isOpen) {
    return null;
  }

  const isLineupIssue = matchBlocker.reason === 'lineup_issue';
  const isNotMatchDay = matchBlocker.reason === 'not_match_day';
  const opp = matchBlocker.opponentClub;
  const fixture = matchBlocker.fixture;

  const handleAutoFix = () => {
    autoFixUserStartingLineup();
  };

  const handleGoToTactics = () => {
    closeMatchBlocker();
    onNavigateTab('tactics');
  };

  const handleStartLive = () => {
    closeMatchBlocker();
    onNavigateTab('matches');
    startLiveMatch(fixture?.id);
  };

  const handleInstantSim = () => {
    closeMatchBlocker();
    instantSimulateCurrentRound();
    onNavigateTab('matches');
  };

  const handleSkipToMatch = () => {
    closeMatchBlocker();
    advanceToNextDay(true);
  };

  const handleAdvanceOneDay = () => {
    closeMatchBlocker();
    advanceToNextDay(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in font-['Cairo',sans-serif]">
      <div 
        className={`relative w-full max-w-lg bg-slate-900 border rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden text-right ${
          isLineupIssue 
            ? 'border-red-500/70' 
            : isNotMatchDay 
              ? 'border-sky-500/70'
              : 'border-amber-500/70'
        }`}
      >
        {/* Glowing Top Accent Bar */}
        <div 
          className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
            isLineupIssue 
              ? 'from-red-500 via-amber-500 to-red-500' 
              : isNotMatchDay
                ? 'from-sky-500 via-teal-500 to-emerald-500'
                : 'from-amber-500 via-emerald-500 to-teal-500'
          }`} 
        />

        {/* Close Button */}
        <button
          onClick={closeMatchBlocker}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Section */}
        <div className="flex items-center gap-3 mb-4">
          <div 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              isLineupIssue 
                ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                : isNotMatchDay
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}
          >
            {isLineupIssue ? (
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            ) : isNotMatchDay ? (
              <CalendarDays className="w-6 h-6" />
            ) : (
              <Swords className="w-6 h-6 animate-bounce" />
            )}
          </div>
          <div>
            <h3 className="font-black text-base sm:text-lg text-white">
              {matchBlocker.title}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isLineupIssue 
                ? 'إجراء إلزامي مطلوب في قائمة الفريق' 
                : isNotMatchDay 
                  ? `الأيام الفاصلة حتى الجولة ${currentRound}`
                  : `الجولة ${currentRound} من ${totalRounds} في الدوري`
              }
            </p>
          </div>
        </div>

        {/* LINEUP ISSUE VIEW */}
        {isLineupIssue && (
          <div className="space-y-4">
            <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-3 text-xs text-red-200 leading-relaxed">
              {matchBlocker.message}
            </div>

            {/* List of Ineligible Starters */}
            {matchBlocker.invalidStarters && matchBlocker.invalidStarters.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300">اللاعبون غير المتاحين في التشكيل الأساسي:</div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {matchBlocker.invalidStarters.map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-red-900/60 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-red-950 text-red-300 border border-red-700/60 flex items-center justify-center font-bold font-mono text-xs">
                          {item.player.overallRating || '—'}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{item.player.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({item.player.position})</span>
                          </div>
                          <div className="text-[11px] text-red-300 mt-0.5 font-medium">
                            {item.description}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-950 text-red-300 border border-red-800">
                        غير متاح
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions for Lineup Issues */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleAutoFix}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-950/60 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>تعديل التشكيلة تلقائياً بأفضل البدلاء الجاهزين ⚡</span>
              </button>

              <button
                onClick={handleGoToTactics}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>الذهاب إلى التكتيك والتشكيلة لتعديلها يدوياً 📋</span>
              </button>
            </div>
          </div>
        )}

        {/* NOT MATCH DAY VIEW */}
        {isNotMatchDay && (
          <div className="space-y-4">
            <div className="bg-sky-950/40 border border-sky-800/60 rounded-2xl p-3 text-xs text-sky-200 leading-relaxed">
              {matchBlocker.message}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleSkipToMatch}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <FastForward className="w-4 h-4 text-amber-300" />
                <span>تخطي الأيام حتى موعد المباراة ⏩</span>
              </button>

              <button
                onClick={handleAdvanceOneDay}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>التقدم ليوم غد فقط ➔</span>
              </button>
            </div>

            <div className="pt-1">
              <button
                onClick={handleGoToTactics}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs border border-slate-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>تجهيز الخطة وتدريب الفريق 📋</span>
              </button>
            </div>
          </div>
        )}

        {/* MUST PLAY MATCH VIEW */}
        {!isLineupIssue && !isNotMatchDay && (
          <div className="space-y-4">
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-3 text-xs text-amber-200 leading-relaxed">
              {matchBlocker.message}
            </div>

            {/* Match Head-to-Head Banner */}
            {userClub && opp && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
                {/* User Club */}
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow"
                    style={{ backgroundColor: userClub.primaryColor }}
                  >
                    {userClub.shortName.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">{userClub.name}</div>
                    <div className="text-[10px] text-emerald-400 font-medium">فريقك</div>
                  </div>
                </div>

                {/* VS */}
                <div className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 font-black text-[11px] text-amber-400">
                  VS
                </div>

                {/* Opponent */}
                <div className="flex items-center gap-2.5">
                  <div className="text-left">
                    <div className="font-bold text-xs text-white">{opp.name}</div>
                    <div className="text-[10px] text-slate-400">{opp.city}</div>
                  </div>
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow"
                    style={{ backgroundColor: opp.primaryColor }}
                  >
                    {opp.shortName.slice(0, 2)}
                  </div>
                </div>
              </div>
            )}

            {/* Actions for Match Day */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleStartLive}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>خوض المباراة لايف ⚽</span>
              </button>

              <button
                onClick={handleInstantSim}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>محاكاة فورية سريعة ⚡</span>
              </button>
            </div>

            <div className="pt-1">
              <button
                onClick={handleGoToTactics}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs border border-slate-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>مراجعة وتعديل الخطة والتشكيلة 📋</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
