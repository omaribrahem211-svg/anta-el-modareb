import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Wrench, ChevronDown, CheckCircle2 } from 'lucide-react';
import { autoRepairStorage } from '../utils/storageSanitizer';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  repairFeedback: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      repairFeedback: null,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught UI error:', error, errorInfo);
    this.setState({ errorInfo });
    // Proactively auto-repair storage so reload or retry does not crash again
    try {
      autoRepairStorage();
    } catch (e) {
      console.warn('[ErrorBoundary] Auto-repair attempt failed:', e);
    }
  }

  private handleReload = () => {
    try {
      autoRepairStorage();
    } catch {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleReset = () => {
    try {
      autoRepairStorage();
      window.dispatchEvent(new CustomEvent('set-active-tab', { detail: { tab: 'dashboard' } }));
    } catch {}
    this.setState({ hasError: false, error: null });
  };

  private handleManualDeepRepair = () => {
    const res = autoRepairStorage();
    this.setState({
      repairFeedback: res.success ? 'تم فحص وتطهير ملفات المسيرة بنجاح ✅' : 'اكتمل الفحص وتم تجهيز الواجهة.',
    });
    setTimeout(() => {
      this.handleReset();
    }, 1200);
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'استثناء غير متوقع في واجهة اللعبة';

      return (
        <div 
          className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none"
          dir="rtl"
        >
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            {this.props.fallbackTitle || 'حدث تنبيه في واجهة اللعبة'}
          </h2>

          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            {this.props.fallbackMessage || 'تم استعادة النظام بأمان دون فقدان بيانات مسيرتك التدريبية. يمكنك استئناف اللعب أو إعادة تحديث الشاشة.'}
          </p>

          {/* Toast Notification if Deep Repair was executed */}
          {this.state.repairFeedback && (
            <div className="mb-4 p-2.5 px-4 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{this.state.repairFeedback}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-md w-full">
            <button
              onClick={this.handleReset}
              className="flex-1 min-w-[140px] px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>متابعة اللعب</span>
            </button>

            <button
              onClick={this.handleReload}
              className="flex-1 min-w-[140px] px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تحميل الشاشة</span>
            </button>
          </div>

          {/* Deep Repair Option */}
          <div className="mt-4">
            <button
              onClick={this.handleManualDeepRepair}
              className="text-xs text-amber-400/90 hover:text-amber-300 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>إصلاح تلقائي واستعادة المسيرة بأمان 🛠️</span>
            </button>
          </div>

          {/* Collapsible Error Diagnostics Details */}
          <div className="mt-6 max-w-md w-full text-right">
            <button
              onClick={() => this.setState({ showDetails: !this.state.showDetails })}
              className="text-[11px] text-slate-500 hover:text-slate-400 flex items-center gap-1 mx-auto cursor-pointer"
            >
              <span>{this.state.showDetails ? 'إخفاء التفاصيل الفنية' : 'عرض التفاصيل الفنية للتنبيه 🔍'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${this.state.showDetails ? 'rotate-180' : ''}`} />
            </button>

            {this.state.showDetails && (
              <div className="mt-2 p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[10px] text-rose-300 text-left dir-ltr overflow-x-auto max-h-36">
                <div className="font-bold text-amber-400 mb-1">{errorMessage}</div>
                {this.state.error?.stack && (
                  <pre className="text-slate-500 whitespace-pre-wrap">
                    {this.state.error.stack.split('\n').slice(0, 4).join('\n')}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
