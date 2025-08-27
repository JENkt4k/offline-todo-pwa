import React, { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';

// --- Types (kept local for clarity; you also have a fuller types.ts) ---
interface Task { id: string; text: string; done: boolean; listId: string }
interface List { id: string; name: string }

// Simple beep using WebAudio (no asset needed)
function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    o.start();
    o.stop(ctx.currentTime + 0.25);
  } catch {}
}

// Countdown with pause/resume
function useCountdown() {
  const [msLeft, setMsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const endTs = useRef(0);
  const pausedMs = useRef(0);
  const raf = useRef(0 as number | 0);

  const tick = () => {
    const now = performance.now();
    const left = Math.max(0, endTs.current - now);
    setMsLeft(left);
    if (left <= 0) { setRunning(false); cancelAnimationFrame(raf.current); return; }
    raf.current = requestAnimationFrame(tick);
  };

  const start = (durationMs: number) => {
    endTs.current = performance.now() + durationMs;
    setMsLeft(durationMs);
    setRunning(true);
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
  };
  const pause = () => { if (!running) return; pausedMs.current = msLeft; setRunning(false); cancelAnimationFrame(raf.current); };
  const resume = () => { if (running || pausedMs.current<=0) return; start(pausedMs.current); };
  const stop = () => { setRunning(false); setMsLeft(0); cancelAnimationFrame(raf.current); };

  return { msLeft, running, start, pause, resume, stop };
}

function fmt(ms: number) {
  const s = Math.floor(ms/1000); const m = Math.floor(s/60); const ss = s%60; return `${m}:${String(ss).padStart(2,'0')}`;
}

export default function App() {
  // --- Lists & Tasks state (localStorage for simplicity) ---
  const [lists, setLists] = useState<List[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [listName, setListName] = useState('');
  const [taskText, setTaskText] = useState('');
  const [activeListId, setActiveListId] = useState<string>('default');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  // Timer controls
  const { msLeft, running, start, pause, resume, stop } = useCountdown();
  const [durationMin, setDurationMin] = useState(25);
  const [completeOnFinish, setCompleteOnFinish] = useState(true);
  const [alarmOnFinish, setAlarmOnFinish] = useState(true);

  // bootstrap default list
  useEffect(() => {
    const L = localStorage.getItem('lists');
    const T = localStorage.getItem('tasks');
    const lists0: List[] = L ? JSON.parse(L) : [{ id: 'default', name: 'My Tasks' }];
    const tasks0: Task[] = T ? JSON.parse(T) : [];
    setLists(lists0);
    setTasks(tasks0);
    if (!activeListId && lists0.length) setActiveListId(lists0[0].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(()=>localStorage.setItem('lists', JSON.stringify(lists)),[lists]);
  useEffect(()=>localStorage.setItem('tasks', JSON.stringify(tasks)),[tasks]);

  // When countdown reaches 0, handle side-effects (sound/complete)
  const prevMsRef = useRef(msLeft);
  useEffect(() => {
    if (prevMsRef.current > 0 && msLeft === 0) {
      if (alarmOnFinish) beep();
      if (completeOnFinish && selectedTaskId) {
        setTasks(ts => ts.map(t => t.id===selectedTaskId ? { ...t, done: true } : t));
      }
    }
    prevMsRef.current = msLeft;
  }, [msLeft, alarmOnFinish, completeOnFinish, selectedTaskId]);

  // Derived
  const activeTasks = useMemo(() => tasks.filter(t => t.listId===activeListId), [tasks, activeListId]);

  // CRUD operations
  const addList = () => { if (!listName.trim()) return; const id = crypto.randomUUID(); setLists([...lists, {id, name:listName.trim()}]); setListName(''); setActiveListId(id); };
  const deleteList = () => {
    if (!activeListId) return;
    setLists(ls => ls.filter(l => l.id !== activeListId));
    setTasks(ts => ts.filter(t => t.listId !== activeListId));
    setActiveListId('default');
  };

  const addTask = () => { if (!taskText.trim()) return; const id = crypto.randomUUID(); setTasks([...tasks, { id, text: taskText.trim(), done:false, listId: activeListId || 'default' }]); setTaskText(''); };
  const toggleTask = (id: string) => setTasks(ts => ts.map(t => t.id===id ? { ...t, done: !t.done } : t));
  const clearDone = () => setTasks(ts => ts.filter(t => !(t.done && t.listId===activeListId)));

  // Start timer either for selected task or for the whole list
  const startTaskTimer = () => { if (!durationMin) return; start(durationMin*60*1000); };

  return (
    <div className="container">
      <h1>Offline To‑Do + Timers</h1>

      {/* Lists */}
      <div className="card">
        <h2>Lists</h2>
        <div className="row">
          <select value={activeListId} onChange={e=>setActiveListId(e.target.value)}>
            {lists.map(l=> <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <input placeholder="New list" value={listName} onChange={e=>setListName(e.target.value)} />
          <button onClick={addList}>Add List</button>
          <button onClick={deleteList}>Delete List</button>
        </div>
      </div>

      {/* Tasks */}
      <div className="card">
        <h2>Tasks</h2>
        <div className="row">
          <input placeholder="New task" value={taskText} onChange={e=>setTaskText(e.target.value)} />
          <button onClick={addTask}>Add</button>
          <button onClick={clearDone}>Clear Done</button>
        </div>
        <ul>
          {activeTasks.map(t => (
            <li key={t.id}>
              <label>
                <input type="checkbox" checked={t.done} onChange={()=>toggleTask(t.id)} />
                <input type="radio" name="selectedTask" checked={selectedTaskId===t.id} onChange={()=>setSelectedTaskId(t.id)} />
                {t.text}
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Timer */}
      <div className="card">
        <h2>Timer</h2>
        <div className="row">
          <input type="number" min={1} value={durationMin} onChange={e=>setDurationMin(Math.max(1, Number(e.target.value)))} />
          <span>minutes</span>
          {!running && <button onClick={startTaskTimer}>Start</button>}
          {running && <button onClick={pause}>Pause</button>}
          {!running && msLeft>0 && <button onClick={resume}>Resume</button>}
          <button onClick={stop}>Stop</button>
        </div>
        <div className="row">
          <label><input type="checkbox" checked={completeOnFinish} onChange={e=>setCompleteOnFinish(e.target.checked)} /> Mark task complete on finish</label>
          <label><input type="checkbox" checked={alarmOnFinish} onChange={e=>setAlarmOnFinish(e.target.checked)} /> Play alarm</label>
        </div>
        <h3>{fmt(msLeft)}</h3>
        <div className="row">
          <button onClick={()=>start(25*60*1000)}>Pomodoro 25m</button>
          <button onClick={()=>start(5*60*1000)}>Break 5m</button>
        </div>
      </div>
    </div>
  );
}