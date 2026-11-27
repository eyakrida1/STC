import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Backend Django (dossier backend/) : en développement, /api est relayé vers lui pour rester sur la même
// origine (cookie de session et CSRF). Autre adresse : CDIS_BACKEND_URL=http://… npm run dev
const backend = process.env.CDIS_BACKEND_URL ?? 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    proxy: { '/api': { target: backend, changeOrigin: false } },
  },
  preview: {
    proxy: { '/api': { target: backend, changeOrigin: false } },
  },
})
