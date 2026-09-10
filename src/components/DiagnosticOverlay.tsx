import React, { useState, useEffect, useRef } from 'react';
import { subscribeDiagnosticLogs, clearDiagnosticLogs, DiagnosticLogEntry } from '../utils/diagnosticLogger';
import { DIAGNOSTIC_CONFIG } from '../config/diagnosticConfig';

export const DiagnosticOverlay: React.FC = () => {
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeDiagnosticLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isExpanded && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, isExpanded]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-20 left-2 z-[999999] bg-emerald-600/90 hover:bg-emerald-500 text-white font-mono text-xs px-2.5 py-1.5 rounded-lg shadow-xl border border-emerald-400/50 backdrop-blur-sm cursor-pointer active:scale-95"
      >
        🛠️ DIAG ({logs.length})
      </button>
    );
  }

  const latestLog = logs[logs.length - 1];

  return (
    <aside
      aria-label="Diagnostic Logs Panel"
      className="fixed top-2 left-2 right-2 max-w-md mx-auto z-[999999] pointer-events-auto select-none"
    >
      <div className="bg-slate-950/95 border border-emerald-500/60 rounded-xl shadow-2xl shadow-black/80 backdrop-blur-md overflow-hidden text-emerald-300 font-mono text-[11px] leading-tight">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-emerald-500/30">
          <div className="flex items-center gap-2 font-bold text-white truncate">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-black tracking-wider">DIAG [{DIAGNOSTIC_CONFIG.CURRENT_STAGE}]</span>
            <span className="text-slate-400 text-[10px]">({logs.length} logs)</span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px]">
            <button
              onClick={() => {
                const text = logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
                navigator.clipboard?.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 active:scale-95"
              title="نسخ السجلات"
            >
              {copied ? 'تم النسخ' : 'نسخ'}
            </button>
            <button
              onClick={() => clearDiagnosticLogs()}
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 active:scale-95"
              title="مسح السجلات"
            >
              مسح
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-1.5 py-0.5 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 rounded border border-emerald-700/60 active:scale-95 font-bold"
            >
              {isExpanded ? 'تصغير ▲' : 'عرض ▼'}
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="px-1.5 py-0.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded border border-rose-800/50 active:scale-95"
              title="إخفاء مؤقت"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Minimized Quick Preview */}
        {!isExpanded && latestLog && (
          <div className="px-3 py-1.5 text-[10px] text-slate-300 truncate bg-slate-950 flex items-center gap-2">
            <span className="text-slate-500 font-sans">{latestLog.timestamp}</span>
            <span className={latestLog.isError ? 'text-rose-400 font-bold' : latestLog.message.includes('SKIPPED') ? 'text-amber-300' : 'text-emerald-400'}>
              {latestLog.message}
            </span>
          </div>
        )}

        {/* Expanded Logs List */}
        {isExpanded && (
          <div className="max-h-48 overflow-y-auto p-2.5 space-y-1 bg-black/90 font-mono text-[10.5px]">
            {logs.length === 0 ? (
              <div className="text-slate-500 italic py-2 text-center">في انتظار تسجيل أحداث [DIAG]...</div>
            ) : (
              logs.slice(-20).map((log) => {
                const isErr = log.isError;
                const isSkipped = log.message.includes('SKIPPED');
                const isCompleted = log.message.includes('COMPLETED') || log.message.includes('RENDERED');

                let textColor = 'text-emerald-400';
                if (isErr) textColor = 'text-rose-400 font-bold';
                else if (isSkipped) textColor = 'text-amber-300';
                else if (isCompleted) textColor = 'text-cyan-300 font-semibold';

                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-1.5 leading-relaxed break-all p-0.5 rounded ${
                      isErr ? 'bg-rose-950/30' : isSkipped ? 'bg-amber-950/20' : ''
                    }`}
                  >
                    <span className="text-slate-500 text-[9.5px] shrink-0 font-mono select-all">
                      [{log.timestamp}]
                    </span>
                    <span className={`select-all ${textColor}`}>
                      {log.message}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </aside>
  );
};
