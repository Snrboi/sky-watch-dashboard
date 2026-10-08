/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The dev server listens on all interfaces so the sandbox preview can reach it.
// /api is proxied to the FastAPI backend, which stays on 127.0.0.1 in development.
const apiProxy = {
  '/api': { target: 'http://127.0.0.1:8000', changeOrigin: false },
}
const previewHosts = ['.e2b.app', 'localhost', '127.0.0.1']

/** Vendor libraries in their own chunks: better caching, and each chunk stays under the warning limit. */
function vendorChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) {
    return undefined;
  }
  if (/node_modules\/(react|react-dom|react-router|scheduler)\//.test(id)) {
    return "react";
  }
  if (id.includes("node_modules/motion/") || id.includes("node_modules/motion-")) {
    return "motion";
  }
  if (id.includes("@tanstack")) {
    return "query";
  }
  if (id.includes("recharts") || id.includes("/d3-") || id.includes("victory-vendor")) {
    return "charts";
  }
  return undefined;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: previewHosts,
    proxy: apiProxy,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: previewHosts,
    proxy: apiProxy,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
