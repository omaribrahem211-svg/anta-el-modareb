/**
 * Diagnostic In-App Logger for isolating crashes/white screen
 * Captures all [DIAG] logs with precise timestamps (HH:MM:SS.mmm)
 * and keeps the last 20-30 entries in memory and persistent storage.
 */

export interface DiagnosticLogEntry {
  id: number;
  timestamp: string;
  message: string;
  isError?: boolean;
}

const MAX_LOGS = 30;
let logCounter = 0;
const subscribers = new Set<(logs: DiagnosticLogEntry[]) => void>();

function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

const memoryLogs: DiagnosticLogEntry[] = [];

// Try to restore previous logs if available in current session
try {
  const saved = sessionStorage.getItem('__DIAG_LOGS__');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      memoryLogs.push(...parsed.slice(-MAX_LOGS));
      logCounter = memoryLogs.length > 0 ? memoryLogs[memoryLogs.length - 1].id : 0;
    }
  }
} catch {
  // Ignore storage read errors
}

export function addDiagnosticLog(message: string, isError = false): void {
  const entry: DiagnosticLogEntry = {
    id: ++logCounter,
    timestamp: formatTime(new Date()),
    message,
    isError,
  };

  memoryLogs.push(entry);
  if (memoryLogs.length > MAX_LOGS) {
    memoryLogs.shift();
  }

  try {
    sessionStorage.setItem('__DIAG_LOGS__', JSON.stringify(memoryLogs));
  } catch {
    // Ignore storage write errors
  }

  subscribers.forEach(cb => {
    try {
      cb([...memoryLogs]);
    } catch {
      // Ignore subscriber errors
    }
  });
}

export function getDiagnosticLogs(): DiagnosticLogEntry[] {
  return [...memoryLogs];
}

export function subscribeDiagnosticLogs(cb: (logs: DiagnosticLogEntry[]) => void): () => void {
  subscribers.add(cb);
  cb([...memoryLogs]);
  return () => {
    subscribers.delete(cb);
  };
}

export function clearDiagnosticLogs(): void {
  memoryLogs.length = 0;
  try {
    sessionStorage.removeItem('__DIAG_LOGS__');
  } catch {
    // Ignore
  }
  subscribers.forEach(cb => cb([]));
}

// Intercept console.log and console.error for [DIAG] messages
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function (...args: any[]) {
  try {
    const firstArg = typeof args[0] === 'string' ? args[0] : '';
    if (firstArg.includes('[DIAG]')) {
      addDiagnosticLog(args.join(' '));
    }
  } catch {
    // Ignore
  }
  originalConsoleLog.apply(console, args);
};

console.error = function (...args: any[]) {
  try {
    const firstArg = typeof args[0] === 'string' ? args[0] : '';
    if (firstArg.includes('[DIAG]')) {
      addDiagnosticLog(args.join(' '), true);
    }
  } catch {
    // Ignore
  }
  originalConsoleError.apply(console, args);
};

// Global error handlers to capture fatal errors right before any potential crash
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    try {
      const errorMsg = event.error?.message || event.message || 'Unknown window error';
      addDiagnosticLog(`[DIAG] CRITICAL_WINDOW_ERROR: ${errorMsg}`, true);
    } catch {
      // Ignore
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event.reason?.message || String(event.reason) || 'Unknown promise rejection';
      addDiagnosticLog(`[DIAG] UNHANDLED_REJECTION: ${reason}`, true);
    } catch {
      // Ignore
    }
  });
}

// Initial announcement
addDiagnosticLog('[DIAG] LOGGER_INITIALIZED (TEST_A ACTIVE)');
