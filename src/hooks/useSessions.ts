import { useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { SessionLog } from '../types';
import { computeStats } from '../utils/stats';

export function useSessions() {
  const [sessions, setSessions] = useLocalStorage<SessionLog[]>('sessions', []);
  const add = (s: SessionLog) => setSessions(prev => [...prev, s]);

  const statsForTask = (taskId: string) => {
    const durations = sessions.filter(s => s.taskId === taskId).map(s => s.durationMs);
    return computeStats(durations);
  };

  return { sessions, add, statsForTask };
}
