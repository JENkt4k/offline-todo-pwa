import { fmt } from '../../utils/format';
import type { TimerState } from '../../hooks/useTimers';

export default function TimerControls({
  state, onStart, onPause, onResume, onStop, defaultMinutes, selectedTaskId
}:{
  state: TimerState; onStart:(m:number)=>void; onPause:()=>void; onResume:()=>void; onStop:()=>void;
  defaultMinutes: number; selectedTaskId?: string;
}) {
  return (
    <div className="timer">
      <div className="readout">{fmt(state.msLeft)}</div>
      <div className="controls">
        {!state.running && <button onClick={()=>onStart(defaultMinutes)}>Start</button>}
        {state.running && <button onClick={onPause}>Pause</button>}
        {!state.running && state.msLeft>0 && <button onClick={onResume}>Resume</button>}
        <button className="ghost" onClick={onStop}>Stop/Reset</button>
      </div>
    </div>
  );
}
