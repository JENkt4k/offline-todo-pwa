// src/db.ts
import { openDB, type DBSchema } from 'idb';

interface TodoItem {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  priority: 'low'|'medium'|'high';
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

interface SessionItem {
  id: string;
  type: 'work' | 'break' | 'custom';
  label?: string;
  start: number;
  end: number;
  durationMs: number;
}

interface PresetItem {
  id: string;
  name: string;
  workMs: number;
  breakMs: number;
  repeats: number;
}

interface AppDB extends DBSchema {
  todos: {
    value: TodoItem;
    key: string;    
    indexes: {
      'by-completed': 'completed';
      'by-updatedAt': 'updatedAt';
    };
  };
  sessions: {
    key: string;
    value: SessionItem;
    indexes: {
      'by-start': 'start';
      'by-duration': 'durationMs';
    };
  };
  presets: {
    key: string;
    value: PresetItem;
    indexes: {
      'by-name': 'name';
    };
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
  for (const t of payload.todos ?? []) await db.put('todos', t);
  for (const s of payload.sessions ?? []) await db.put('sessions', s);
  for (const p of payload.presets ?? []) await db.put('presets', p);
  await tx.done;
}
