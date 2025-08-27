import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);

// Register service worker with base-aware path to avoid 404 under non-root base
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`; // resolves to /offline-todo-pwa/sw.js in dev when base is set
    navigator.serviceWorker.register(swUrl).catch(console.error);
  });
}