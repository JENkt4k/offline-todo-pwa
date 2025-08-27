import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl).catch(console.error);
  });
}

// Add install button support
window.addEventListener('beforeinstallprompt', (e: any) => {
  e.preventDefault();
  const deferredPrompt = e;
  const btn = document.createElement('button');
  btn.textContent = 'Install App';
  btn.style.position = 'fixed';
  btn.style.bottom = '1rem';
  btn.style.right = '1rem';
  btn.style.zIndex = '1000';
  btn.onclick = async () => {
    btn.remove();
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('User response to install:', outcome);
  };
  document.body.appendChild(btn);
});