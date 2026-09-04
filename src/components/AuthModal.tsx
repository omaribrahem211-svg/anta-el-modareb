import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Trophy, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Sparkles, 
  AlertCircle,
  Play,
  HardDrive
} from 'lucide-react';

interface AuthModalProps {
  onClose?: () => void;
  isMandatory?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, isMandatory = false }) => {
  const { 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    continueAsGuest,
    hasExistingLocalCareer,
    error,
    clearError,
    loading 
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email || !password) {
      setFormError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    if (password.length < 6) {
      setFormError('يجب أن لا تقل كلمة المرور عن 6 أحرف.');
      return;
    }

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, displayName || 'مدرب الفريق');
      }
      if (onClose) onClose();
    } catch (err: any) {
      // Error handled by AuthContext
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    clearError();
    try {
      await signInWithGoogle();
      if (onClose) onClose();
    } catch (err) {
      // Handled
    }
  };

  const handleGuestClick = () => {
    continueAsGuest();
    if (onClose) onClose();
  };

  const displayError = formError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-slate-100 flex flex-col">
        
        {/* Header Icon & Brand */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Trophy className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-wide">
            {mode === 'login' ? 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب مدرب جديد'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {mode === 'login' 
              ? 'سجّل دخولك لحفظ بيانات ناديك ومسيرتك التدريبية عبر السحابة' 
              : 'انضم الآن وابدأ مسيرتك التدريبية السحابية من الدرجة الرابعة'}
          </p>
        </div>

        {/* Existing Local Career Notification Banner */}
        {hasExistingLocalCareer && (
          <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl flex items-center gap-3 text-xs text-emerald-300">
            <HardDrive className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold block text-emerald-200">تم رصد مسيرة محفوظة محلياً على هذا الجهاز</span>
              مسيرتك التدريبية المحلية محفوظة بأمان ولن تفقدها.
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {displayError && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/60 rounded-2xl flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">اسم المدرب (اختياري)</label>
              <div className="relative">
                <User className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="الكابتن أحمد"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coach@example.com"
                dir="ltr"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">كلمة المرور</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : mode === 'login' ? (
              <>
                <span>تسجيل الدخول</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>إنشاء الحساب وبدء التدريب</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-900 px-3 text-slate-500 font-medium">أو عبر الطرق التالية</span>
          </div>
        </div>

        {/* Social / Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-sm font-semibold text-slate-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
            />
          </svg>
          <span>المتابعة باستخدام Google</span>
        </button>

        {/* Continue as Guest Button */}
        <button
          type="button"
          onClick={handleGuestClick}
          disabled={loading}
          className="w-full mt-2.5 py-2.5 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800/80 rounded-xl text-xs font-medium text-slate-300 transition-colors flex items-center justify-center gap-2"
        >
          <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>المتابعة كضيف (اللعب أوفلاين مع الحفظ المحلي)</span>
        </button>

        {/* Toggle Switch Mode */}
        <div className="mt-5 text-center text-xs text-slate-400">
          {mode === 'login' ? (
            <span>
              ليس لديك حساب بعد؟{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setFormError(null);
                  clearError();
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold underline mr-1"
              >
                إنشاء حساب جديد
              </button>
            </span>
          ) : (
            <span>
              لديك حساب بالفعل؟{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setFormError(null);
                  clearError();
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold underline mr-1"
              >
                تسجيل الدخول
              </button>
            </span>
          )}
        </div>

        {/* Security badge footer */}
        <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>حماية مشفرة ومتوافقة مع قواعد Firebase Cloud Security</span>
        </div>

      </div>
    </div>
  );
};
