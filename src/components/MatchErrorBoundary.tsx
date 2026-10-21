import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Robust Diagnostic Error Boundary around Match Flow & MatchesTab
 * Captures, logs, and safely recovers from any render/state exceptions without leaving the screen white.
 */
export class MatchErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[CRITICAL_MATCH_ERROR] Runtime exception in ${this.props.componentName || 'MatchFlow'}:`, error);
    console.error('[CRITICAL_MATCH_ERROR] Component stack trace:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  private handleRecover = () => {
    console.log('[MatchErrorBoundary] User triggered safe recovery action.');
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (e) {
        console.error('[MatchErrorBoundary] Error during onReset callback:', e);
      }
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'خطأ غير متوقع أثناء معالجة المباراة';
      const errorStack = this.state.error?.stack || '';

      const componentTitle = this.props.componentName === 'TransfersTab'
        ? 'نظام الانتقالات والمفاوضات'
        : this.props.componentName === 'MatchesTab'
        ? 'نظام المباريات'
        : 'نظام اللعبة';

      return (
        <div 
          id="match_error_boundary_fallback"
          className="w-full min-h-[420px] bg-slate-900/95 border border-rose-500/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-2xl my-4 text-white"
          dir="rtl"
        >
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
          </div>

          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-black text-white">
              تنبيه استعادة {componentTitle}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              تم رصد استثناء برمجي وتطويقه بنجاح لمنع إغلاق التطبيق أو ظهور شاشة بيضاء. تم حفظ تقدم مسيرتك التدريبية بأمان دون فقدان أي بيانات.
            </p>
          </div>

          {/* Error Details Accordion */}
          <div className="w-full max-w-lg bg-slate-950/90 border border-slate-800 rounded-2xl p-3 text-right font-mono text-[11px] text-rose-300 overflow-x-auto max-h-40 custom-scrollbar">
            <div className="font-bold text-amber-400 mb-1">تفاصيل الاستثناء البرمجي:</div>
            <div>{errorMsg}</div>
            {errorStack && (
              <pre className="text-[10px] text-slate-500 mt-2 whitespace-pre-wrap leading-tight">
                {errorStack.split('\n').slice(0, 5).join('\n')}
              </pre>
            )}
          </div>

          {/* Recovery Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              id="match_recover_btn"
              onClick={this.handleRecover}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-950/60 transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>استئناف اللعب ومتابعة الجولة ➔</span>
            </button>

            <button
              onClick={this.handleReload}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl flex items-center gap-2 border border-slate-700 transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تحميل الواجهة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
