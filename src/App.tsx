import React, { useEffect, useMemo, useState } from 'react';
import './styles.css';
import { useCountdown } from './useCountdown';
import type { List, Task, SessionLog, SessionType } from './types';
import { loadSessions, saveSessions } from './history';


/** Per-list timer state */
interface TimerState { running: boolean; msLeft: number; endTs: number; selectedTaskId?: string }
/** Per-list stopwatch state */
interface StopwatchState { running: boolean; msElapsed: number; startTs: number | null; selectedTaskId?: string }


function beep() { try { const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'sine'; o.frequency.value = 880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(.001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.3, ctx.currentTime + .01); o.start(); o.stop(ctx.currentTime + .25); } catch { } }
const fmt = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); const m = Math.floor(s / 60); const ss = s % 60; return `${m}:${String(ss).padStart(2, '0')}`; };


export default function App() {
  /** Lists & tasks */
  const [lists, setLists] = useState<List[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);


  /** Per-list timers & stopwatches */
  const [timers, setTimers] = useState<Record<string, TimerState>>({});
  const [stopwatches, setStopwatches] = useState<Record<string, StopwatchState>>({});
  const [listMode, setListMode] = useState<Record<string, 'timer' | 'stopwatch'>>({});


  /** New inputs */
  const [newListName, setNewListName] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskMinutes, setNewTaskMinutes] = useState(5);


  /** Sessions/history */
  const [sessions, setSessions] = useState<SessionLog[]>([]);


  /** PWA install */
  type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);


  // Bootstrap from storage
  useEffect(() => {
    const L = localStorage.getItem('lists');
    const T = localStorage.getItem('tasks');
    const X = localStorage.getItem('timers');
    const Y = localStorage.getItem('stopwatches');
    const M = localStorage.getItem('listMode');
    const lists0: List[] = L ? JSON.parse(L) : [{ id: 'default', name: 'My Tasks' }];
    const tasks0: Task[] = T ? JSON.parse(T) : [];
    const timers0: Record<string, TimerState> = X ? JSON.parse(X) : {};
    const sw0: Record<string, StopwatchState> = Y ? JSON.parse(Y) : {};
    const mode0: Record<string, 'timer' | 'stopwatch'> = M ? JSON.parse(M) : {};
    setLists(lists0); setTasks(tasks0); setTimers(timers0); setStopwatches(sw0); setListMode(mode0);
    setSessions(loadSessions());
  }, []);
  useEffect(() => localStorage.setItem('lists', JSON.stringify(lists)), [lists]);
  useEffect(() => localStorage.setItem('tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('timers', JSON.stringify(timers)), [timers]);
  useEffect(() => localStorage.setItem('stopwatches', JSON.stringify(stopwatches)), [stopwatches]);
  useEffect(() => localStorage.setItem('listMode', JSON.stringify(listMode)), [listMode]);
  useEffect(() => saveSessions(sessions), [sessions]);


  // Ticker updates all running timers & stopwatches
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      // timers
      setTimers(prev => {
        let changed = false; const next = { ...prev };
        for (const [lid, st] of Object.entries(prev)) {
          if (!st.running) continue;
          const left = Math.max(0, st.endTs - now);
          if (left !== st.msLeft) { next[lid] = { ...st, msLeft: left }; changed = true; }
          if (left <= 0) {
            const selectedTaskId = st.selectedTaskId; next[lid] = { running: false, msLeft: 0, endTs: 0, selectedTaskId }; changed = true; beep();
            if (selectedTaskId) setTasks(ts => ts.map(t => t.id === selectedTaskId ? { ...t, done: true } : t));
            if (selectedTaskId) setSessions(ss => [...ss, { id: crypto.randomUUID(), taskId: selectedTaskId, durationMs: st.msLeft, type: 'timer', ts: Date.now() }]);
          }
        }
        return changed ? next : prev;
      });
      // stopwatches
      setStopwatches(prev => {
        let changed = false; const next = { ...prev };
        for (const [lid, sw] of Object.entries(prev)) {
          if (!sw.running || sw.startTs == null) continue;
          const elapsed = (now - sw.startTs) + sw.msElapsed;
          next[lid] = { ...sw, msElapsed: elapsed, startTs: now, running: true };
          changed = true;
        }
        return changed ? next : prev;
      });
    }, 250);
    return () => clearInterval(id);
  }, []);


  // Install prompt
  useEffect(() => {
    const onBIP = (e: Event) => { e.preventDefault?.(); setInstallEvt(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setInstallEvt(null); };
    window.addEventListener('beforeinstallprompt', onBIP as any);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onBIP as any); window.removeEventListener('appinstalled', onInstalled); };
  }, []);


  /** CRUD lists */
  const addList = () => { if (!newListName.trim()) return; const id = crypto.randomUUID(); setLists([...lists, { id, name: newListName.trim() }]); setNewListName(''); };
  const renameList = (id: string, name: string) => setLists(ls => ls.map(l => l.id === id ? { ...l, name: name.trim() || l.name } : l));
  const deleteList = (id: string) => { setLists(ls => ls.filter(l => l.id !== id)); setTasks(ts => ts.filter(t => t.listId !== id)); setTimers(tm => { const n = { ...tm }; delete n[id]; return n; }); setStopwatches(sw => { const n = { ...sw }; delete n[id]; return n; }); };


  /** CRUD tasks */
  const addTask = (listId: string) => { if (!newTaskText.trim()) return; const id = crypto.randomUUID(); setTasks([...tasks, { id, text: newTaskText.trim(), done: false, listId, minutes: newTaskMinutes }]); setNewTaskText(''); };
  const toggleTask = (id: string) => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const setTaskTime = (id: string, minutes: number) => setTasks(ts => ts.map(t => t.id === id ? { ...t, minutes: Math.max(1, minutes) } : t));
  const clearDone = (listId: string) => setTasks(ts => ts.filter(t => !(t.done && t.listId === listId)));


  /** Timer controls per list */
  const ensureTimer = (listId: string) => timers[listId] ?? { running: false, msLeft: 0, endTs: 0, selectedTaskId: undefined };
  const startTimer = (listId: string, minutes: number, selectedTaskId?: string) => setTimers(st => { const endTs = performance.now() + minutes * 60 * 1000; return { ...st, [listId]: { running: true, msLeft: minutes * 60 * 1000, endTs, selectedTaskId } }; });
  const pauseTimer = (listId: string) => setTimers(st => { const t = ensureTimer(listId); if (!t.running) return st; return { ...st, [listId]: { ...t, running: false } }; });
  const resumeTimer = (listId: string) => setTimers(st => { const t = ensureTimer(listId); if (t.running || t.msLeft <= 0) return st; const endTs = performance.now() + t.msLeft; return { ...st, [listId]: { ...t, running: true, endTs } }; });
  const stopTimer = (listId: string) => setTimers(st => ({ ...st, [listId]: { running: false, msLeft: 0, endTs: 0, selectedTaskId: st[listId]?.selectedTaskId } }));
  const selectTaskForList = (listId: string, taskId?: string) => setTimers(st => ({ ...st, [listId]: { ...(st[listId] ?? { running: false, msLeft: 0, endTs: 0 }), selectedTaskId: taskId } }));


  /** Stopwatch controls per list */
  const ensureSW = (listId: string) => stopwatches[listId] ?? { running: false, msElapsed: 0, startTs: null, selectedTaskId: undefined };
  const swStart = (listId: string) => setStopwatches(st => { const sw = ensureSW(listId); if (sw.running) return st; return { ...st, [listId]: { ...sw, running: true, startTs: performance.now() } }; });
  const swPause = (listId: string) => setStopwatches(st => { const sw = ensureSW(listId); if (!sw.running || sw.startTs == null) return st; const acc = sw.msElapsed + (performance.now() - sw.startTs); return { ...st, [listId]: { ...sw, running: false, startTs: null, msElapsed: acc } }; });
  const swReset = (listId: string) => setStopwatches(st => ({ ...st, [listId]: { running: false, msElapsed: 0, startTs: null, selectedTaskId: st[listId]?.selectedTaskId } }));
  const swSave = (listId: string) => {
    const sw = ensureSW(listId); const dur = sw.running && sw.startTs != null ? sw.msElapsed + (performance.now() - sw.startTs) : sw.msElapsed;
    if (!sw.selectedTaskId || dur <= 0) return;
    setSessions(ss => [...ss, { id: crypto.randomUUID(), taskId: sw.selectedTaskId!, durationMs: Math.round(dur), type: 'stopwatch', ts: Date.now() }]);
    setStopwatches(st => ({ ...st, [listId]: { ...sw, running: false, startTs: null, msElapsed: 0 } }));
  };
  const selectTaskForSW = (listId: string, taskId?: string) => setStopwatches(st => ({ ...st, [listId]: { ...(st[listId] ?? { running: false, msElapsed: 0, startTs: null }), selectedTaskId: taskId } }));


  /** Derived */
  const tasksByList = useMemo(() => { const map: Record<string, Task[]> = {}; for (const t of tasks) (map[t.listId] ||= []).push(t); return map; }, [tasks]);
  function statsForTask(taskId: string) {
    const ds = sessions.filter(s => s.taskId === taskId).map(s => Math.round(s.durationMs / 60000)).sort((a, b) => a - b);
    if (!ds.length) return { mean: null, median: null, mode: null };
    const mean = Math.round(ds.reduce((a, b) => a + b, 0) / ds.length);
    const median = ds.length % 2 ? ds[(ds.length - 1) / 2] : Math.round((ds[ds.length / 2 - 1] + ds[ds.length / 2]) / 2);
    let mode = ds[0], best = 0; for (let i = 0; i < ds.length;) { let j = i; while (j < ds.length && ds[j] === ds[i]) j++; const c = j - i; if (c > best) { best = c; mode = ds[i]; } i = j; }
    return { mean, median, mode };
  }


  const onInstallClick = async () => { if (!installEvt) return; await installEvt.prompt(); try { await installEvt.userChoice; } finally { setInstallEvt(null); } };


  return (
    <div className="container">
      <div className="topbar section">
        {!installed && installEvt && <button onClick={onInstallClick}>Install App</button>}
        <div className="toprow">
          <input placeholder="New list name" value={newListName} onChange={e => setNewListName(e.target.value)} />
          <button onClick={addList}>Add List</button>
        </div>
      </div>


      <div className="lists-scroller">
        {lists.map(list => {
          const listTasks = tasksByList[list.id] || [];
          const timer = timers[list.id] ?? { running: false, msLeft: 0, endTs: 0, selectedTaskId: undefined };
          const sw = stopwatches[list.id] ?? { running: false, msElapsed: 0, startTs: null, selectedTaskId: undefined };
          const selectedTask = listTasks.find(t => t.id === ((listMode[list.id] ?? 'timer') === 'timer' ? timer.selectedTaskId : sw.selectedTaskId));
          const defaultMinutes = selectedTask?.minutes ?? newTaskMinutes;
          const mode = listMode[list.id] ?? 'timer';


          return (
            <div key={list.id} className="list-card">
              <h3>
                <input className="title" value={list.name} onChange={e => renameList(list.id, e.target.value)} />
                <button className="ghost" onClick={() => deleteList(list.id)}>&#128465;</button>
              </h3>


              <div className="row">
                <input placeholder="New task text" value={newTaskText} onChange={e => setNewTaskText(e.target.value)} />
                <span className="badge">⏱</span>
                <input className="time-input" type="number" min={1} inputMode="numeric" pattern="[0-9]*" value={newTaskMinutes} onChange={e => setNewTaskMinutes(Math.max(1, Number(e.target.value)))} />
                <button onClick={() => addTask(list.id)}>+</button>
              </div>
              <div className="row">
                <button className="ghost center" onClick={() => clearDone(list.id)}>Clear Completed</button>
              </div>


              <ul>
                {listTasks.map(t => (
                  <li key={t.id}>
                    <div className={`task ${timer.selectedTaskId === t.id || sw.selectedTaskId === t.id ? 'active' : ''}`}
                      onClick={() => { selectTaskForList(list.id, t.id); selectTaskForSW(list.id, t.id); }}>
                      <input type="checkbox" checked={t.done} onChange={(e) => { e.stopPropagation(); toggleTask(t.id); }} />
                      <label onClick={(e) => e.stopPropagation()}>{t.text}</label>
                      <input className="time-input" type="number" min={1} inputMode="numeric" pattern="[0-9]*" value={t.minutes ?? 5}
                        onChange={(e) => setTaskTime(t.id, Math.max(1, Number(e.target.value)))} onClick={(e) => e.stopPropagation()} />
                      <span className="badge">min</span>
                    </div>
                  </li>
                ))}
              </ul>


              {/* Mode switch */}
              <div className="seg">
                <button className={mode === 'timer' ? 'seg-btn active' : 'seg-btn'} onClick={() => setListMode(m => ({ ...m, [list.id]: 'timer' }))}>Timer</button>
                <button className={mode === 'stopwatch' ? 'seg-btn active' : 'seg-btn'} onClick={() => setListMode(m => ({ ...m, [list.id]: 'stopwatch' }))}>Stopwatch</button>
              </div>


              {mode === 'timer' ? (
                <div className="timer">
                  <div className="badge">Active Task: {selectedTask ? selectedTask.text : '— none selected'}</div>
                  <div className="readout">{fmt(timer.msLeft)}</div>
                  <div className="controls">
                    {!timer.running && <button onClick={() => startTimer(list.id, selectedTask?.minutes ?? defaultMinutes, timer.selectedTaskId)}>Start</button>}
                    {timer.running && <button onClick={() => pauseTimer(list.id)}>Pause</button>}
                    {!timer.running && timer.msLeft > 0 && <button onClick={() => resumeTimer(list.id)}>Resume</button>}
                    <button className="ghost" onClick={() => stopTimer(list.id)}>Stop/Reset</button>
                  </div>
                </div>
              ) : (
                <div className="timer">
                  <div className="badge">Active Task: {selectedTask ? selectedTask.text : '— none selected'}</div>
                  <div className="readout">{fmt(sw.running && sw.startTs != null ? (sw.msElapsed + (performance.now() - sw.startTs)) : sw.msElapsed)}</div>
                  <div className="controls">
                    {!sw.running && <button onClick={() => swStart(list.id)}>Start</button>}
                    {sw.running && <button onClick={() => swPause(list.id)}>Pause</button>}
                    <button className="ghost" onClick={() => swReset(list.id)}>Reset</button>
                    <button onClick={() => swSave(list.id)} disabled={!sw.selectedTaskId}>Save to task</button>
                  </div>
                  {sw.selectedTaskId && (() => {
                    const s = statsForTask(sw.selectedTaskId!); if (!s.mean && !s.median && !s.mode) return null; return (
                      <div className="chips">
                        {s.mean && <button className="chip" onClick={() => setTaskTime(sw.selectedTaskId!, s.mean!)}>Mean: {s.mean}m</button>}
                        {s.median && <button className="chip" onClick={() => setTaskTime(sw.selectedTaskId!, s.median!)}>Median: {s.median}m</button>}
                        {s.mode && <button className="chip" onClick={() => setTaskTime(sw.selectedTaskId!, s.mode!)}>Mode: {s.mode}m</button>}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function computeStats(durationsMs: number[]) {
  if (!durationsMs.length) return { meanMin: null, medianMin: null, modeMin: null };
  const mins = durationsMs.map(d => Math.round(d / 60000)).sort((a, b) => a - b);
  const mean = Math.round(mins.reduce((a, b) => a + b, 0) / mins.length);
  const median = mins.length % 2
    ? mins[(mins.length - 1) / 2]
    : Math.round((mins[mins.length / 2 - 1] + mins[mins.length / 2]) / 2);
  let mode = mins[0], bestCount = 0, i = 0;
  while (i < mins.length) {
    const val = mins[i];
    let j = i;
    while (j < mins.length && mins[j] === val) j++;
    const cnt = j - i;
    if (cnt > bestCount) { bestCount = cnt; mode = val; }
    i = j;
  }
  return { meanMin: mean, medianMin: median, modeMin: mode };
}
