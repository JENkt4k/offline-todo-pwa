import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';


const REPO_NAME = 'offline-todo-pwa';

const isDev = false;

const base = isDev ? '/' : `/${REPO_NAME}/`;

// BASE PATH NOTES:
// - For project pages (https://USERNAME.github.io/REPO), set base to "/REPO/".
// - For user/org pages (https://USERNAME.github.io), set base to "/".
// - We read from env so Actions can set VITE_BASE_PATH consistently.


export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
      manifest: {
        name: 'Offline To-Do + Timers',
        short_name: 'To-Do PWA',
        theme_color: '#0ea5e9',
        background_color: '#111827',
        display: 'standalone',
        scope: '.',
        start_url: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
  });