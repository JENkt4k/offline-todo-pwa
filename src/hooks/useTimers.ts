import { useEffect, useState } from 'react';
export interface TimerState { running: boolean; msLeft: number; endTs: number; selectedTaskId?: string }
export function useTimers() {
  const [timers, setTimers] = useState<Record<string, TimerState>>({});
  useEffect(()=>{
    const id = window.setInterval(()=>{
      const now = performance.now();
      setTimers(prev => {
        let changed=false; const next={...prev};
        for (const [lid, st] of Object.entries(prev)) {
          if (!st.running) continue;
          const left = Math.max(0, st.endTs - now);
          if (left !== st.msLeft) { next[lid] = { ...st, msLeft: left }; changed = true; }
          if (left <= 0) next[lid] = { ...st, running: false, msLeft: 0, endTs: 0 };
        }
        return changed ? next : prev;
      });
    }, 250);
    return ()=>clearInterval(id);
  },[]);
  return {
    timers,
    start: (lid: string, minutes: number, selectedTaskId?: string) =>
      setTimers(s => ({ ...s, [lid]: { running:true, msLeft: minutes*60000, endTs: performance.now()+minutes*60000, selectedTaskId } })),
    pause: (lid: string) => setTimers(s => { const t=s[lid]; if(!t?.running) return s; return ({ ...s, [lid]: { ...t, running:false } }); }),
    resume:(lid: string)=> setTimers(s => { const t=s[lid]; if(!t || t.running || t.msLeft<=0) return s; return ({ ...s, [lid]: { ...t, running:true, endTs: performance.now()+t.msLeft } }); }),
    stop:  (lid: string)=> setTimers(s => ({ ...s, [lid]: { ...s[lid], running:false, msLeft:0, endTs:0 } })),
    selectTask:(lid:string, taskId?:string)=> setTimers(s=>({ ...s, [lid]: { ...(s[lid]??{running:false,msLeft:0,endTs:0}), selectedTaskId: taskId } })),
  };
}
