export type Priority = 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  title: string;
  notes?: string;
  due?: string; // ISO date
  priority: Priority;
  completed: boolean;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

export interface TimerPreset {
  id: string;
  name: string;
  workMs: number;
  breakMs: number;
  repeats: number;
}

export interface SessionLog {
  id: string;
  type: 'work' | 'break' | 'custom';
  label?: string;
  start: number; // epoch ms
  end: number;   // epoch ms
  durationMs: number;
}