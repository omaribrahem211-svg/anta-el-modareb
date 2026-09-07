import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught UI error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center"
          dir="rtl"
        >
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            {this.props.fallbackTitle || 'حدث تنبيه في واجهة اللعبة'}
          </h2>

          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            {this.props.fallbackMessage || 'تم استعادة النظام بأمان دون فقدان بيانات مسيرتك التدريبية. يمكنك استئناف اللعب أو إعادة تحديث الشاشة.'}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Home className="w-4 h-4" />
              <span>متابعة اللعب</span>
            </button>

            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 border border-slate-700 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تحميل الشاشة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
