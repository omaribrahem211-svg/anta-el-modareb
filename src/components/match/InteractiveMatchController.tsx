import React, { useState, useEffect, useRef } from 'react';
import {
  Gamepad2,
  Tv,
  Volume2,
  VolumeX,
  Target,
  Zap,
  Shield,
  Footprints,
  Compass,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Crosshair,
  Award,
  Flame,
  CheckCircle2,
  Play
} from 'lucide-react';
import { stadiumAudio } from '../../utils/stadiumAudio';

export interface InteractiveMatchControllerProps {
  isMatchPlaying: boolean;
  isFinished?: boolean;
  currentMinute: number;
  homeClubName: string;
  awayClubName: string;
  isUserHome: boolean;
  onUserGoal: (playerName?: string, description?: string) => void;
  onUserSave: (description?: string) => void;
  onUserChance: (description?: string) => void;
  onUserTackle: (description?: string) => void;
  onPlayerMove?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onPass?: () => void;
  onShoot?: (power: number, accuracy: 'perfect' | 'good' | 'miss') => void;
  activePlayerName?: string;
  activePlayerRole?: string;
}

export const InteractiveMatchController: React.FC<InteractiveMatchControllerProps> = ({
  isMatchPlaying,
  isFinished,
  currentMinute,
  homeClubName,
  awayClubName,
  isUserHome,
  onUserGoal,
  onUserSave,
  onUserChance,
  onUserTackle,
  onPlayerMove,
  onPass,
  onShoot,
  activePlayerName = 'المهاجم الهداف',
  activePlayerRole = 'ST',
}) => {
  const [controlMode, setControlMode] = useState<'manual' | 'tactical'>('manual');
  const [isMuted, setIsMuted] = useState<boolean>(stadiumAudio.isMuted());
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Power Bar Shooting State
  const [isChargingShot, setIsChargingShot] = useState<boolean>(false);
  const [shotPower, setShotPower] = useState<number>(0);
  const shotTimerRef = useRef<number | null>(null);

  // 1v1 Decisive Chance Modal State
  const [show1v1Modal, setShow1v1Modal] = useState<boolean>(false);
  const [gaugeValue, setGaugeValue] = useState<number>(50);
  const [gaugeDirection, setGaugeDirection] = useState<1 | -1>(1);
  const [chosenTechnique, setChosenTechnique] = useState<'curled' | 'power' | 'dribble' | 'chip'>('curled');
  const [show1v1Result, setShow1v1Result] = useState<{ outcome: 'goal' | 'save' | 'post'; title: string; desc: string } | null>(null);

  // Audio mute toggle handler
  const handleToggleMute = () => {
    const nextMuted = stadiumAudio.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      stadiumAudio.playWhistle();
    }
  };

  // Feedback banner toast auto-dismiss
  const showFeedback = (text: string) => {
    setActionFeedback(text);
    setTimeout(() => setActionFeedback(null), 2500);
  };

  // Manual Keyboard Controls (Arrow keys & WASD)
  useEffect(() => {
    if (controlMode !== 'manual' || isFinished) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        handleMove('up');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        handleMove('down');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        handleMove('left');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        handleMove('right');
      } else if (e.code === 'Space') {
        e.preventDefault();
        handlePass();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controlMode, isFinished]);

  // Movement handler
  const handleMove = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (onPlayerMove) onPlayerMove(dir);
    const labels: Record<string, string> = {
      up: 'اندفاع هجومي للأمام ⬆️',
      down: 'ارتداد تكتيكي للخلف ⬇️',
      left: 'توغل بالجناح الأيسر ⬅️',
      right: 'انطلاق بالجناح الأيمن ➡️',
    };
    showFeedback(labels[dir]);
  };

  // Pass handler
  const handlePass = () => {
    stadiumAudio.playKick(false);
    if (onPass) onPass();
    showFeedback(`👟 تمريرة متقنة من (${activePlayerName}) إلى الزميل الخالي من الرقابة!`);
    onUserChance(`تمريرة حريرية ذكية بين خطوط دفاع الخصم!`);
  };

  // Sprint / Skill move handler
  const handleSprint = () => {
    stadiumAudio.playKick(false);
    showFeedback(`⚡ مراوغة سريعة وانطلاق خاطف تجاوز به المدافع!`);
    onUserChance(`مراوغة مهارية وتوغل في عمق الدفاع!`);
  };

  // Slide Tackle handler
  const handleTackle = () => {
    stadiumAudio.playSave();
    onUserTackle(`🛡️ تدخل دفاعي نظيف وافتكاك للكرة من أمام مهاجم الخصم!`);
    showFeedback(`🛡️ تاكلينج رائع واستخلاص فدائي للكرة!`);
  };

  // Start Charging Shot
  const handleShotDown = () => {
    setIsChargingShot(true);
    setShotPower(0);
    shotTimerRef.current = window.setInterval(() => {
      setShotPower((prev) => {
        if (prev >= 100) return 0; // loop gauge
        return prev + 6;
      });
    }, 40);
  };

  // Release Shot
  const handleShotUp = () => {
    if (!isChargingShot) return;
    setIsChargingShot(false);
    if (shotTimerRef.current) {
      clearInterval(shotTimerRef.current);
      shotTimerRef.current = null;
    }

    const currentPwr = shotPower;
    // Sweet spot between 60% and 85%
    if (currentPwr >= 60 && currentPwr <= 85) {
      stadiumAudio.playKick(true);
      stadiumAudio.playGoalRoar();
      showFeedback(`🚀 يا ربااااه! قذيفة صاروخية في المقص الأيسر! ⚽`);
      onUserGoal(activePlayerName, `⚽ قذيفة صاروخية محكمة لا تصد ولا ترد من تسديدة اللاعب المباشرة!`);
      if (onShoot) onShoot(currentPwr, 'perfect');
    } else if (currentPwr > 85) {
      stadiumAudio.playPostHit();
      showFeedback(`💥 صاروخ يرتطم بالعارضة ويحرمك من هدف عالمي!`);
      onUserSave(`تسديدة قوية ارتدت من القائم بعد محاولة تسديد مباشرة!`);
      if (onShoot) onShoot(currentPwr, 'good');
    } else {
      stadiumAudio.playKick(false);
      stadiumAudio.playSave();
      showFeedback(`🧤 تسديدة تصدى لها الحارس بصعوبة وحولها لركنية!`);
      onUserSave(`حارس المرمى يتصدى لتسديدة أرضية زاحفة!`);
      if (onShoot) onShoot(currentPwr, 'miss');
    }
  };

  // 1v1 Gauge Oscillating loop
  useEffect(() => {
    if (!show1v1Modal || show1v1Result) return;

    const interval = setInterval(() => {
      setGaugeValue((prev) => {
        let next = prev + gaugeDirection * 5;
        if (next >= 95) {
          setGaugeDirection(-1);
          return 95;
        }
        if (next <= 5) {
          setGaugeDirection(1);
          return 5;
        }
        return next;
      });
    }, 35);

    return () => clearInterval(interval);
  }, [show1v1Modal, gaugeDirection, show1v1Result]);

  // Execute 1v1 Shoot
  const handleShoot1v1 = () => {
    // Green sweet spot is 40 to 65
    if (gaugeValue >= 38 && gaugeValue <= 68) {
      stadiumAudio.playKick(true);
      stadiumAudio.playGoalRoar();
      setShow1v1Result({
        outcome: 'goal',
        title: '⚽ هــــــــــــــــدف تـاريـخـي! ⚽',
        desc: `بإنهاء خيالي وتوقيت مثالي في الزاوية المستحيلة، (${activePlayerName}) يمزق الشباك!`,
      });
      onUserGoal(activePlayerName, `⚽ هدف عالمي إثر انفراد 1v1 بإنهاء دقيق من تحكم المستخدم!`);
    } else if (gaugeValue > 68) {
      stadiumAudio.playPostHit();
      setShow1v1Result({
        outcome: 'post',
        title: '💥 العارضة تحرمك من الهدف!',
        desc: 'تسديدة قوية جداً علت العارضة بمليمترات واصطدمت بالقائم!',
      });
      onUserSave(`تسديدة ارتدت من القائم الخارجي!`);
    } else {
      stadiumAudio.playSave();
      setShow1v1Result({
        outcome: 'save',
        title: '🧤 تصدي بطولي من الحارس!',
        desc: 'حارس المرمى قرأ الزاوية وتصدى للكرة ببراعة بأطراف أصابعه!',
      });
      onUserSave(`تصدي بطولي لحارس المرمى في انفراد مباشر!`);
    }
  };

  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-xl space-y-3 select-none">
      {/* HEADER: MODE TOGGLE & SOUND */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setControlMode('manual');
                stadiumAudio.playKick(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                controlMode === 'manual'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>التحكم المباشر باللعب 🎮</span>
            </button>

            <button
              type="button"
              onClick={() => setControlMode('tactical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                controlMode === 'tactical'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>مشاهدة تكتيكية 📺</span>
            </button>
          </div>
        </div>

        {/* Action & Audio utilities */}
        <div className="flex items-center gap-2">
          {/* Quick 1v1 Trigger */}
          {!isFinished && (
            <button
              type="button"
              onClick={() => {
                setGaugeValue(50);
                setShow1v1Result(null);
                setShow1v1Modal(true);
                stadiumAudio.playWhistle();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/40 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 animate-pulse" />
              <span>انفراد 1v1 مباشر 🔥</span>
            </button>
          )}

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isMuted
                ? 'bg-slate-800/80 border-slate-700 text-slate-400'
                : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
            }`}
            title={isMuted ? 'تفعيل أصوات الملعب الحقيقية' : 'كتم أصوات الملعب'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-bounce" />}
          </button>
        </div>
      </div>

      {/* FEEDBACK TOAST ALERT */}
      {actionFeedback && (
        <div className="p-2.5 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-1">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-spin" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* MANUAL CONTROLS CONSOLE */}
      {controlMode === 'manual' && !isFinished && (
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-3 space-y-3">
          {/* Active Controlled Player Card */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-slate-900/90 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shadow">
                {activePlayerRole}
              </span>
              <div>
                <span className="text-xs font-bold text-white block leading-tight">
                  اللاعب المُتحكَّم به: {activePlayerName}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {isUserHome ? homeClubName : awayClubName} (حامل الكرة ⚽)
                </span>
              </div>
            </div>

            <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
              تحكم نشط 🟢
            </span>
          </div>

          {/* D-PAD & ACTION BUTTONS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* VIRTUAL D-PAD (Directional movement) */}
            <div className="flex flex-col items-center justify-center p-2 bg-slate-900/60 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Compass className="w-3 h-3 text-emerald-400" />
                <span>لوحة تحريك اللاعب بالملعب</span>
              </span>

              <div className="grid grid-cols-3 gap-1.5 w-32 h-32 items-center justify-items-center">
                <div />
                <button
                  type="button"
                  onClick={() => handleMove('up')}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-emerald-600 active:scale-90 border border-slate-700 text-white flex items-center justify-center shadow transition-all cursor-pointer"
                  title="تحرك للأمام هجومياً"
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
                <div />

                <button
                  type="button"
                  onClick={() => handleMove('left')}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-emerald-600 active:scale-90 border border-slate-700 text-white flex items-center justify-center shadow transition-all cursor-pointer"
                  title="تحرك للجناح الأيسر"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[9px] font-bold text-emerald-400">
                  ⚽
                </div>

                <button
                  type="button"
                  onClick={() => handleMove('right')}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-emerald-600 active:scale-90 border border-slate-700 text-white flex items-center justify-center shadow transition-all cursor-pointer"
                  title="تحرك للجناح الأيمن"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>

                <div />
                <button
                  type="button"
                  onClick={() => handleMove('down')}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-emerald-600 active:scale-90 border border-slate-700 text-white flex items-center justify-center shadow transition-all cursor-pointer"
                  title="تراجع للدفاع"
                >
                  <ArrowDown className="w-5 h-5" />
                </button>
                <div />
              </div>
            </div>

            {/* ACTION BUTTONS (Pass, Shoot, Skill, Tackle) */}
            <div className="space-y-2">
              {/* SHOOT POWER CHARGER */}
              <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-white flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>مقياس قوة التسديد (اضغط مطولاً)</span>
                  </span>
                  <span className="font-mono text-xs font-black text-amber-400">
                    {shotPower}%
                  </span>
                </div>

                {/* Power Bar */}
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
                  {/* Sweet spot indicator (60-85%) */}
                  <div className="absolute top-0 bottom-0 left-[60%] w-[25%] bg-emerald-500/30 border-x border-emerald-400" />
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all duration-75"
                    style={{ width: `${shotPower}%` }}
                  />
                </div>

                <button
                  type="button"
                  onMouseDown={handleShotDown}
                  onMouseUp={handleShotUp}
                  onTouchStart={handleShotDown}
                  onTouchEnd={handleShotUp}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-orange-600 hover:brightness-110 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-950/60 transition-all cursor-pointer select-none"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>{isChargingShot ? 'جارٍ شحن التسديدة... أطلق عند المنطقة الخضراء!' : '🚀 تسديد صاروخي نحو المرمى (اضغط للشحن)'}</span>
                </button>
              </div>

              {/* QUICK ACTION BUTTONS */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={handlePass}
                  className="py-2.5 px-2 rounded-xl bg-slate-900 hover:bg-emerald-950 hover:border-emerald-500 border border-slate-800 text-emerald-300 font-black text-xs flex flex-col items-center gap-1 transition-all active:scale-95 cursor-pointer shadow"
                >
                  <Footprints className="w-4 h-4 text-emerald-400" />
                  <span>تمرير للزميل</span>
                </button>

                <button
                  type="button"
                  onClick={handleSprint}
                  className="py-2.5 px-2 rounded-xl bg-slate-900 hover:bg-amber-950 hover:border-amber-500 border border-slate-800 text-amber-300 font-black text-xs flex flex-col items-center gap-1 transition-all active:scale-95 cursor-pointer shadow"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>مراوغة وانطلاق</span>
                </button>

                <button
                  type="button"
                  onClick={handleTackle}
                  className="py-2.5 px-2 rounded-xl bg-slate-900 hover:bg-blue-950 hover:border-blue-500 border border-slate-800 text-blue-300 font-black text-xs flex flex-col items-center gap-1 transition-all active:scale-95 cursor-pointer shadow"
                >
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>تاكلينج وقطع</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1v1 SHOOTOUT MODAL OVERLAY */}
      {show1v1Modal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border-2 border-amber-500/60 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Target className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">انفراد مباشر 1v1 بالحارس! 🔥</h3>
                  <span className="text-[11px] text-slate-400">
                    الدقيقة {currentMinute} • المهاجم: {activePlayerName}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShow1v1Modal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* If result is shown */}
            {show1v1Result ? (
              <div className="py-6 text-center space-y-4">
                <div className="text-4xl animate-bounce">
                  {show1v1Result.outcome === 'goal' ? '⚽🔥' : show1v1Result.outcome === 'save' ? '🧤🛡️' : '💥🥅'}
                </div>
                <div className="space-y-1">
                  <h4 className={`text-lg font-black ${
                    show1v1Result.outcome === 'goal' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {show1v1Result.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed px-4">
                    {show1v1Result.desc}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShow1v1Modal(false)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-lg cursor-pointer"
                >
                  العودة للمباراة
                </button>
              </div>
            ) : (
              <>
                {/* Finishing Technique Selectors */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">
                    اختر أسلوب إنهاء الهجمة:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setChosenTechnique('curled')}
                      className={`p-2.5 rounded-xl border font-bold text-right flex items-center justify-between transition-all cursor-pointer ${
                        chosenTechnique === 'curled'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🎯 تسديدة لولبية بالمقص</span>
                      <span className="text-[10px] text-emerald-400 font-mono">دقة 92%</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChosenTechnique('power')}
                      className={`p-2.5 rounded-xl border font-bold text-right flex items-center justify-between transition-all cursor-pointer ${
                        chosenTechnique === 'power'
                          ? 'bg-red-500/20 border-red-500 text-red-300 ring-1 ring-red-500'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>⚡ تسديدة صاروخية بقوة</span>
                      <span className="text-[10px] text-red-400 font-mono">قوة 98%</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChosenTechnique('dribble')}
                      className={`p-2.5 rounded-xl border font-bold text-right flex items-center justify-between transition-all cursor-pointer ${
                        chosenTechnique === 'dribble'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>👟 مراوغة الحارس</span>
                      <span className="text-[10px] text-amber-400 font-mono">مهارة 85%</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChosenTechnique('chip')}
                      className={`p-2.5 rounded-xl border font-bold text-right flex items-center justify-between transition-all cursor-pointer ${
                        chosenTechnique === 'chip'
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300 ring-1 ring-purple-500'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>⚽ إسقاط الكرة "لوب"</span>
                      <span className="text-[10px] text-purple-400 font-mono">ذكاء 88%</span>
                    </button>
                  </div>
                </div>

                {/* TIMING GAUGE (Moving pointer) */}
                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>مقياس التوقيت الدقيق:</span>
                    <span className="text-emerald-400 font-mono">
                      {gaugeValue >= 38 && gaugeValue <= 68 ? 'المنطقة المثالية! 🎯' : 'توقيت غير دقيق'}
                    </span>
                  </div>

                  {/* Meter Track */}
                  <div className="relative w-full h-8 bg-slate-950 rounded-xl overflow-hidden border border-slate-700 flex items-center">
                    {/* Miss Zone Left */}
                    <div className="w-[38%] h-full bg-red-900/30" />
                    {/* Green Sweet Spot Zone */}
                    <div className="w-[30%] h-full bg-emerald-500/40 border-x-2 border-emerald-400 flex items-center justify-center">
                      <span className="text-[9px] font-black text-emerald-300">هدف مؤكد ⚽</span>
                    </div>
                    {/* Miss Zone Right */}
                    <div className="w-[32%] h-full bg-red-900/30" />

                    {/* Moving Pointer Line */}
                    <div
                      className="absolute top-0 bottom-0 w-2.5 bg-amber-400 rounded shadow-lg shadow-amber-400/80 -translate-x-1/2 transition-all duration-75"
                      style={{ left: `${gaugeValue}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 text-center block">
                    اضغط زر التسديد عندما يكون المؤشر الأصفر داخل المنطقة الخضراء في الوسط!
                  </span>
                </div>

                {/* SHOOT BUTTON */}
                <button
                  type="button"
                  onClick={handleShoot1v1}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/60 transition-all cursor-pointer"
                >
                  <Target className="w-5 h-5" />
                  <span>سدد الآن في الشباك! (SHOOT)</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
