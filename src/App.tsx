import React, { useState, useEffect } from 'react';
import './styles.css';

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('todos');
    if (stored) setTodos(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    let timer: number;
    if (running && timeLeft > 0) {
      timer = window.setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0) {
      setRunning(false);
    }
    return () => clearInterval(timer);
  }, [running, timeLeft]);

  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos([...todos, { id: crypto.randomUUID(), text: newTodo, done: false }]);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const startTimer = (seconds: number) => {
    setTimeLeft(seconds);
    setRunning(true);
  };

  return (
    <div className="container">
      <h1>Offline To-Do + Timers</h1>

      <div className="card">
        <h2>To-Dos</h2>
        <div className="row">
          <input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="New to-do"
          />
          <button onClick={addTodo}>Add</button>
        </div>
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>
              <label>
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => toggleTodo(todo.id)}
                />
                {todo.text}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Timer</h2>
        <div className="row">
          <button onClick={() => startTimer(25 * 60)}>Start 25m</button>
          <button onClick={() => startTimer(5 * 60)}>Start 5m</button>
        </div>
        {running && <h3>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</h3>}
      </div>
    </div>
  );
}