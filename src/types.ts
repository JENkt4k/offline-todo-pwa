export type SessionType = 'timer' | 'stopwatch';


export interface Task {
id: string;
text: string;
done: boolean;
listId: string;
minutes?: number;
}


export interface List { id: string; name: string }


export interface TimerState {
running: boolean;
msLeft: number;
endTs: number;
selectedTaskId?: string;
}


export interface StopwatchState {
running: boolean;
msElapsed: number;
startTs: number|null;
selectedTaskId?: string;
}


export interface SessionLog {
id: string;
taskId: string;
durationMs: number;
type: SessionType;
ts: number;
}