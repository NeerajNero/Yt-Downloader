import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'YT Studio',
        short_name: 'YT Studio',
        description: 'Shorts pipeline control',
        theme_color: '#101317',
        background_color: '#101317',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Never cache GraphQL or API responses — live data only.
        navigateFallbackDenylist: [/^\/v1\//, /^\/api\//],
        runtimeCaching: [],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/v1': { target: 'http://localhost:8081', ws: true },
      '/api': { target: 'http://localhost:8080' }  // api has no host port; go through Caddy,
    },
  },
})
