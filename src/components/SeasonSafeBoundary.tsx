import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  name: string;
  /** Optional safe action offered to the user when the screen crashed (e.g. continue to the next season). */
  onRecover?: () => void;
  recoverLabel?: string;
}
interface State { hasError: boolean }

/**
 * Keeps a crash inside a season-end / tournament screen from taking the whole app down (white screen).
 * Shows a small overlay with a safe way forward instead.
 */
export class SeasonSafeBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[SeasonSafeBoundary:${this.props.name}]`, error, info?.componentStack);
  }

  private retry = () => this.setState({ hasError: false });

  private recover = () => {
    try { this.props.onRecover?.(); } catch (e) { console.error('[SeasonSafeBoundary] recover failed', e); }
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950/95 flex items-center justify-center p-6" dir="rtl">
        <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-3xl p-5 text-center space-y-3">
          <div className="text-3xl">🛠️</div>
          <div className="text-white font-black">حصلت مشكلة بسيطة في هذه الشاشة</div>
          <p className="text-xs text-slate-400 leading-relaxed">بياناتك محفوظة. تقدر تحاول تاني أو تكمل للخطوة التالية.</p>
          <div className="flex gap-2">
            {this.props.onRecover && (
              <button onClick={this.recover} className="flex-1 bg-amber-400 text-slate-950 font-black py-3 rounded-2xl">
                {this.props.recoverLabel || 'متابعة'}
              </button>
            )}
            <button onClick={this.retry} className="flex-1 bg-slate-800 text-slate-200 font-bold py-3 rounded-2xl border border-slate-700">
              حاول تاني
            </button>
          </div>
        </div>
      </div>
    );
  }
}
