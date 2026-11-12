import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/realms': {
        target: 'http://localhost:8085',
        changeOrigin: false,
      },
      '/resources': {
        target: 'http://localhost:8085',
        changeOrigin: false,
      },
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/bonds': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/payments': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
      '/api/referrals': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
      '/api/admin': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
