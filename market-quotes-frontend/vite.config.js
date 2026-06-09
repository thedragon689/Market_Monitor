import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-recharts';
          }
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules/scheduler')
          ) {
            return 'vendor-react';
          }
          if (id.includes('/components/terminal/')) {
            return 'view-terminal';
          }
          if (
            id.includes('/components/ForecastChart') ||
            id.includes('/components/HistoryChart') ||
            id.includes('/components/GeopoliticalImpactChart')
          ) {
            return 'view-charts';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
