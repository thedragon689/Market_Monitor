import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** ID univoco per cache PWA — cambia ad ogni deploy Netlify. */
const pwaCacheId =
  process.env.COMMIT_REF?.slice(0, 8) ||
  process.env.DEPLOY_ID ||
  `dev-${Date.now().toString(36)}`

function stampServiceWorker() {
  return {
    name: 'stamp-service-worker',
    config() {
      return {
        define: {
          'import.meta.env.VITE_PWA_CACHE_ID': JSON.stringify(pwaCacheId),
        },
      }
    },
    closeBundle() {
      const swPath = resolve('dist/sw.js')
      const src = readFileSync(swPath, 'utf8').replace(/__PWA_CACHE_VERSION__/g, pwaCacheId)
      writeFileSync(swPath, src)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), stampServiceWorker()],
  server: {
    forwardConsole: false,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        timeout: 30_000,
        proxyTimeout: 30_000,
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
