import React, { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';
import { useCountdown } from './useCountdown';

interface Task { id: string; text: string; done: boolean; listId: string; minutes?: number }
interface List { id: string; name: string }

function beep() { try { const ctx = new (window.AudioContext|| (window as any).webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(.001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.3, ctx.currentTime+.01); o.start(); o.stop(ctx.currentTime+.25);}catch{} }

// function useCountdown(){ const[msLeft,setMsLeft]=useState(0); const[running,setRunning]=useState(false); const endTs=useRef(0); const pausedMs=useRef(0); const raf=useRef(0 as number|0); const tick=()=>{const now=performance.now(); const left=Math.max(0,endTs.current-now); setMsLeft(left); if(left<=0){setRunning(false); cancelAnimationFrame(raf.current); return;} raf.current=requestAnimationFrame(tick);}; const start=(dur:number)=>{endTs.current=performance.now()+dur; setMsLeft(dur); setRunning(true); cancelAnimationFrame(raf.current); raf.current=requestAnimationFrame(tick);}; const pause=()=>{if(!running)return; pausedMs.current=msLeft; setRunning(false); cancelAnimationFrame(raf.current)}; const resume=()=>{if(running||pausedMs.current<=0)return; start(pausedMs.current)}; const stop=()=>{setRunning(false); setMsLeft(0); cancelAnimationFrame(raf.current)}; return{msLeft,running,start,pause,resume,stop}; }

function fmt(ms:number){const s=Math.floor(ms/1000); const m=Math.floor(s/60); const ss=s%60; return `${m}:${String(ss).padStart(2,'0')}`;}

export default function App(){
  const [lists,setLists]=useState<List[]>([]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [listName,setListName]=useState('');
  const [taskText,setTaskText]=useState('');
  const [taskMinutes,setTaskMinutes]=useState(5);
  const [activeListId,setActiveListId]=useState<string>('default');
  const [selectedTaskId,setSelectedTaskId]=useState<string>('');

  // rename control for active list
  const activeList = useMemo(()=>lists.find(l=>l.id===activeListId)||null,[lists,activeListId]);
  const [renameValue, setRenameValue] = useState('');
  useEffect(()=>{ setRenameValue(activeList?.name || ''); }, [activeListId, activeList?.name]);

  const {msLeft,running,start,pause,resume,stop}=useCountdown();
  const [durationMin,setDurationMin]=useState(25);
  const [completeOnFinish,setCompleteOnFinish]=useState(true);
  const [alarmOnFinish,setAlarmOnFinish]=useState(true);

  useEffect(()=>{
    const L=localStorage.getItem('lists');
    const T=localStorage.getItem('tasks');
    const lists0:List[]=L?JSON.parse(L):[{id:'default',name:'My Tasks'}];
    const tasks0:Task[]=T?JSON.parse(T):[];
    setLists(lists0); setTasks(tasks0);
    if(!activeListId && lists0.length) setActiveListId(lists0[0].id);
  },[]);
  useEffect(()=>localStorage.setItem('lists',JSON.stringify(lists)),[lists]);
  useEffect(()=>localStorage.setItem('tasks',JSON.stringify(tasks)),[tasks]);

  const prevMsRef=useRef(msLeft);
  useEffect(()=>{
    if(prevMsRef.current>0 && msLeft===0){
      if(alarmOnFinish) beep();
      if(completeOnFinish && selectedTaskId){ setTasks(ts=>ts.map(t=>t.id===selectedTaskId?{...t,done:true}:t)); }
    }
    prevMsRef.current=msLeft;
  },[msLeft,alarmOnFinish,completeOnFinish,selectedTaskId]);

  const activeTasks=useMemo(()=>tasks.filter(t=>t.listId===activeListId),[tasks,activeListId]);
  const selectedTask=useMemo(()=>tasks.find(t=>t.id===selectedTaskId)||null,[tasks,selectedTaskId]);

  const addList=()=>{ if(!listName.trim())return; const id=crypto.randomUUID(); setLists([...lists,{id,name:listName.trim()}]); setListName(''); setActiveListId(id) };
  const deleteList=()=>{ if(!activeListId)return; setLists(ls=>ls.filter(l=>l.id!==activeListId)); setTasks(ts=>ts.filter(t=>t.listId!==activeListId)); setActiveListId('default'); setSelectedTaskId(''); };
  const renameList=()=>{ if(!activeListId) return; setLists(ls=>ls.map(l=>l.id===activeListId?{...l,name:renameValue.trim()||l.name}:l)); };

  const addTask=()=>{ if(!taskText.trim())return; const id=crypto.randomUUID(); setTasks([...tasks,{id,text:taskText.trim(),done:false,listId:activeListId||'default',minutes:taskMinutes}]); setTaskText(''); };
  const toggleTask=(id:string)=>setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t));
  const setTaskTime=(id:string,minutes:number)=>{ setTasks(ts=>ts.map(t=>t.id===id?{...t,minutes:Math.max(1,minutes)}:t)); if (id===selectedTaskId) setDurationMin(Math.max(1, minutes)); };
  const clearDone=()=>setTasks(ts=>ts.filter(t=>!(t.done&&t.listId===activeListId)));

  // Select a task: highlight and sync control time from that task
  const selectTask=(t:Task)=>{ setSelectedTaskId(t.id); if (t.minutes && t.minutes>0) setDurationMin(t.minutes); };

  // Start timer: use selected task's minutes if available, else the list-level default
  const startTimerSmart=()=>{ const mins=selectedTask?.minutes||durationMin; setDurationMin(mins); start(mins*60*1000) };

  return(
    <div className="container">
      <h1>Offline To‑Do + Timers</h1>

      {/* Lists */}
      <div className="card">
        <h2>Lists</h2>
        <div className="row">
          <select value={activeListId} onChange={e=>{setActiveListId(e.target.value); setSelectedTaskId('')}}>
            {lists.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <input placeholder="New list" value={listName} onChange={e=>setListName(e.target.value)} />
          <button onClick={addList}>Add List</button>
          <button onClick={deleteList}>Delete List</button>
        </div>
        <div className="row">
          <input value={renameValue} onChange={e=>setRenameValue(e.target.value)} placeholder="Rename current list" />
          <button onClick={renameList}>Save Name</button>
        </div>
      </div>

      {/* Tasks */}
      <div className="card">
        <h2>Tasks — <span className="badge">{activeList ? activeList.name : '(no list selected)'}</span></h2>
        <div className="row">
          <input placeholder="New task" value={taskText} onChange={e=>setTaskText(e.target.value)} />
          <input className="time-input" type="number" min={1} value={taskMinutes} onChange={e=>setTaskMinutes(Math.max(1,Number(e.target.value)))} />
          <span className="badge">min</span>
          <button onClick={addTask}>Add</button>
          <button onClick={clearDone} className="ghost">Clear Done</button>
        </div>
        <ul>
          {activeTasks.map(t=> (
            <li key={t.id}>
              <div className={`task ${selectedTaskId===t.id?'active':''}`} onClick={()=>selectTask(t)}>
                <input type="checkbox" checked={t.done} onChange={(e)=>{e.stopPropagation(); toggleTask(t.id);}} />
                <label onClick={(e)=>e.stopPropagation()}>{t.text}</label>
                <input className="time-input" type="number" min={1} value={t.minutes??5} onChange={(e)=>setTaskTime(t.id,Math.max(1,Number(e.target.value)))} onClick={(e)=>e.stopPropagation()} />
                <span className="badge">min</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Timer */}
      <div className="card">
        <h2>Current Active Task Timer</h2>
        <div className="row">
          <input type="number" min={1} value={durationMin} onChange={e=>setDurationMin(Math.max(1,Number(e.target.value)))} />
          <span>minutes (list default / active task)</span>
          {!running && <button onClick={startTimerSmart}>Start</button>}
          {running && <button onClick={pause}>Pause</button>}
          {!running && msLeft>0 && <button onClick={resume}>Resume</button>}
          <button onClick={stop} className="ghost">Stop/Reset</button>
        </div>
        <div className="row">
          <label><input type="checkbox" checked={completeOnFinish} onChange={e=>setCompleteOnFinish(e.target.checked)} /> Mark task complete on finish</label>
          <label><input type="checkbox" checked={alarmOnFinish} onChange={e=>setAlarmOnFinish(e.target.checked)} /> Play alarm</label>
        </div>
        <div className="row">
          <strong>Active:</strong> {selectedTask?selectedTask.text:'— (no task selected: using list default)'}
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
