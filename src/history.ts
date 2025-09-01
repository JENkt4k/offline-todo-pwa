import type { SessionLog } from './types';
const KEY = 'sessions';
export function loadSessions(): SessionLog[] { try { const s = localStorage.getItem(KEY); return s? JSON.parse(s): []; } catch { return []; } }
export function saveSessions(s: SessionLog[]) { localStorage.setItem(KEY, JSON.stringify(s)); }

export function fmtDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return [h, m, ss].map((v) => String(v).padStart(2, '0')).join(':');
}

export function isoDate(ts: number) {
  return new Date(ts).toLocaleString();
}