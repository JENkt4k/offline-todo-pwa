import React, { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';
import { useCountdown } from './useCountdown';

interface Task { id: string; text: string; done: boolean; listId: string; minutes?: number }
interface List { id: string; name: string }

function beep() { try { const ctx = new (window.AudioContext|| (window as any).webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(.001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.3, ctx.currentTime+.01); o.start(); o.stop(ctx.currentTime+.25);}catch{} }

function fmt(ms:number){const s=Math.floor(ms/1000); const m=Math.floor(s/60); const ss=s%60; return `${m}:${String(ss).padStart(2,'0')}`;}

/** Per-list timer state */
interface TimerState { running: boolean; msLeft: number; endTs: number; selectedTaskId?: string }

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted'|'dismissed' }> };

export default function App(){
  /** Lists & tasks */
  const [lists,setLists]=useState<List[]>([]);
  const [tasks,setTasks]=useState<Task[]>([]);

  /** Per-list timers (map by listId) */
  const [timers, setTimers] = useState<Record<string, TimerState>>({});

  /** New list/task inputs */
  const [newListName, setNewListName] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskMinutes, setNewTaskMinutes] = useState(5);

  /** PWA install */
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent|null>(null);
  const [installed, setInstalled] = useState(false);

  // Bootstrap from storage
  useEffect(()=>{
    const L=localStorage.getItem('lists');
    const T=localStorage.getItem('tasks');
    const X=localStorage.getItem('timers');
    const lists0:List[]=L?JSON.parse(L):[{id:'default',name:'My Tasks'}];
    const tasks0:Task[]=T?JSON.parse(T):[];
    const timers0:Record<string,TimerState>=X?JSON.parse(X):{};
    setLists(lists0); setTasks(tasks0); setTimers(timers0);
  },[]);
  useEffect(()=>localStorage.setItem('lists',JSON.stringify(lists)),[lists]);
  useEffect(()=>localStorage.setItem('tasks',JSON.stringify(tasks)),[tasks]);
  useEffect(()=>localStorage.setItem('timers',JSON.stringify(timers)),[timers]);

  // Global tick updates all running list timers
  useEffect(()=>{
    const id = window.setInterval(()=>{
      const now = performance.now();
      setTimers(prev => {
        const next = { ...prev };
        let changed = false;
        for (const [lid, st] of Object.entries(prev)) {
          if (!st.running) continue;
          const left = Math.max(0, st.endTs - now);
          if (left !== st.msLeft) { next[lid] = { ...st, msLeft: left }; changed = true; }
          if (left <= 0) {
            // stop and signal
            const selectedTaskId = st.selectedTaskId;
            next[lid] = { running:false, msLeft:0, endTs:0, selectedTaskId };
            changed = true; beep();
            if (selectedTaskId) {
              setTasks(ts=>ts.map(t=>t.id===selectedTaskId?{...t, done:true}:t));
            }
          }
        }
        return changed ? next : prev;
      });
    }, 250);
    return ()=> clearInterval(id);
  },[setTimers, setTasks]);

  // Install prompt
  useEffect(()=>{
    const onBIP = (e: Event) => { e.preventDefault?.(); setInstallEvt(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setInstallEvt(null); };
    window.addEventListener('beforeinstallprompt', onBIP as any);
    window.addEventListener('appinstalled', onInstalled);
    return ()=>{ window.removeEventListener('beforeinstallprompt', onBIP as any); window.removeEventListener('appinstalled', onInstalled); };
  },[]);

  /** CRUD lists */
  const addList=()=>{ if(!newListName.trim())return; const id=crypto.randomUUID(); setLists([...lists,{id,name:newListName.trim()}]); setNewListName(''); };
  const renameList=(id:string, name:string)=> setLists(ls=>ls.map(l=>l.id===id?{...l,name:name.trim()||l.name}:l));
  const deleteList=(id:string)=>{ setLists(ls=>ls.filter(l=>l.id!==id)); setTasks(ts=>ts.filter(t=>t.listId!==id)); setTimers(tm=>{ const n={...tm}; delete n[id]; return n; }); };

  /** CRUD tasks */
  const addTask=(listId:string)=>{ if(!newTaskText.trim())return; const id=crypto.randomUUID(); setTasks([...tasks,{id,text:newTaskText.trim(),done:false,listId,minutes:newTaskMinutes}]); setNewTaskText(''); };
  const toggleTask=(id:string)=> setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t));
  const setTaskTime=(id:string,minutes:number)=> setTasks(ts=>ts.map(t=>t.id===id?{...t,minutes:Math.max(1,minutes)}:t));
  const clearDone=(listId:string)=> setTasks(ts=>ts.filter(t=>!(t.done && t.listId===listId)));

  /** Timer controls per list */
  const ensureTimer=(listId:string)=> timers[listId] ?? { running:false, msLeft:0, endTs:0, selectedTaskId: undefined };
  const startTimer=(listId:string, minutes:number, selectedTaskId?:string)=> setTimers(st=>{
    const endTs = performance.now() + minutes*60*1000;
    return { ...st, [listId]: { running:true, msLeft: minutes*60*1000, endTs, selectedTaskId } };
  });
  const pauseTimer=(listId:string)=> setTimers(st=>{ const t=ensureTimer(listId); if(!t.running) return st; return { ...st, [listId]: { ...t, running:false } };});
  const resumeTimer=(listId:string)=> setTimers(st=>{ const t=ensureTimer(listId); if(t.running || t.msLeft<=0) return st; const endTs = performance.now() + t.msLeft; return { ...st, [listId]: { ...t, running:true, endTs } };});
  const stopTimer=(listId:string)=> setTimers(st=>({ ...st, [listId]: { running:false, msLeft:0, endTs:0, selectedTaskId: st[listId]?.selectedTaskId } }));
  const selectTaskForList=(listId:string, taskId?:string)=> setTimers(st=>({ ...st, [listId]: { ...(st[listId]??{running:false,msLeft:0,endTs:0}), selectedTaskId: taskId } }));

  /** Derived */
  const tasksByList = useMemo(()=>{
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      (map[t.listId] ||= []).push(t);
    }
    return map;
  },[tasks]);

  const onInstallClick = async () => { if (!installEvt) return; await installEvt.prompt(); try { await installEvt.userChoice; } finally { setInstallEvt(null); } };

  return (
    <div className="container">
      <div className="topbar section">
        <input placeholder="New list name" value={newListName} onChange={e=>setNewListName(e.target.value)} />
        <button onClick={addList}>Add List</button>
        {!installed && installEvt && <button onClick={onInstallClick}>Install App</button>}
      </div>

      <div className="lists-scroller">
        {lists.map(list => {
          const listTasks = tasksByList[list.id] || [];
          const timer = timers[list.id] ?? { running:false, msLeft:0, endTs:0, selectedTaskId: undefined };
          const selectedTask = listTasks.find(t=>t.id===timer.selectedTaskId);
          const defaultMinutes = selectedTask?.minutes ?? newTaskMinutes;

          return (
            <div key={list.id} className="list-card">
              <h3>
                <input className="title" value={list.name} onChange={e=>renameList(list.id, e.target.value)} />
                <button className="ghost" onClick={()=>deleteList(list.id)}>&#128465;</button>
              </h3>

              <div className="row">
                <input placeholder="New task text" value={newTaskText} onChange={e=>setNewTaskText(e.target.value)} />
                <span className="badge">&#9201;</span>
                <input className="time-input" type="number" min={1} value={newTaskMinutes} onChange={e=>setNewTaskMinutes(Math.max(1,Number(e.target.value)))} />
                <button onClick={()=>addTask(list.id)}>+</button>
                
              </div>

              <div className="row">
                <button className="ghost center" onClick={()=>clearDone(list.id)}>Clear Completed</button>
              </div>

              <ul>
                {listTasks.map(t => (
                  <li key={t.id}>
                    <div className={`task ${timer.selectedTaskId===t.id?'active':''}`} onClick={()=>selectTaskForList(list.id, t.id)}>
                      <input type="checkbox" checked={t.done} onChange={(e)=>{e.stopPropagation(); toggleTask(t.id);}} />
                      <label onClick={(e)=>e.stopPropagation()}>{t.text}</label>
                      <input className="time-input" type="number" min={1} value={t.minutes??5}
                        onChange={(e)=>setTaskTime(t.id, Math.max(1, Number(e.target.value)))} onClick={(e)=>e.stopPropagation()} />
                      <span className="badge">min</span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="timer">
                <div className="badge">Active Task: {selectedTask?selectedTask.text:'— none selected'}</div>
                <div className="readout">{fmt(timer.msLeft)}</div>
                <div className="controls">
                  {!timer.running && <button onClick={()=>startTimer(list.id, selectedTask?.minutes ?? defaultMinutes, timer.selectedTaskId)}>Start</button>}
                  {timer.running && <button onClick={()=>pauseTimer(list.id)}>Pause</button>}
                  {!timer.running && timer.msLeft>0 && <button onClick={()=>resumeTimer(list.id)}>Resume</button>}
                  <button className="ghost" onClick={()=>stopTimer(list.id)}>Stop/Reset</button>
                </div>
                
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
