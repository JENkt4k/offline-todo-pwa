import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',        // plugin handles registration
      // remove injectRegister override
      includeAssets: [
        'favicon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-512.png'
      ],
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
}));
