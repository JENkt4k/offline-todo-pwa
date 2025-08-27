import { openDB, type DBSchema } from 'idb';
import type { Todo, SessionLog, TimerPreset } from './types';

interface AppDB extends DBSchema {
  todos: {
    key: string;
    value: Todo;
    indexes: { 'by-completed': boolean; 'by-updatedAt': number };
  };
  sessions: {
    key: string;
    value: SessionLog;
    indexes: { 'by-start': number; 'by-duration': number };
  };
  presets: {
    key: string;
    value: TimerPreset;
    indexes: { 'by-name': string };
  };
}

export const dbPromise = openDB<AppDB>('offline-todo-pwa', 1, {
  upgrade(db) {
    const todos = db.createObjectStore('todos', { keyPath: 'id' });
    todos.createIndex('by-completed', 'completed');
    todos.createIndex('by-updatedAt', 'updatedAt');

    const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
    sessions.createIndex('by-start', 'start');
    sessions.createIndex('by-duration', 'durationMs');

    const presets = db.createObjectStore('presets', { keyPath: 'id' });
    presets.createIndex('by-name', 'name');
  },
});

export async function exportAll() {
  const db = await dbPromise;
  const [todos, sessions, presets] = await Promise.all([
    db.getAll('todos'),
    db.getAll('sessions'),
    db.getAll('presets'),
  ]);
  return { todos, sessions, presets, exportedAt: new Date().toISOString() };
}

export async function importAll(payload: any) {
  const db = await dbPromise;
  const tx = db.transaction(['todos', 'sessions', 'presets'], 'readwrite');
  for (const t of payload.todos ?? []) await (await dbPromise).put('todos', t);
  for (const s of payload.sessions ?? []) await (await dbPromise).put('sessions', s);
  for (const p of payload.presets ?? []) await (await dbPromise).put('presets', p);
  await tx.done;
}