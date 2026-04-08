import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: "solvica",
      project: "javascript-react",
    }),
  ],
  server: {
    allowedHosts: true,
    // بث الذكاء من Express (backend/server.ts) — المفتاح على السيرفر فقط عند النشر
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    allowedHosts: true
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'framer-motion']
  },
  optimizeDeps: {
    include: [
      'rehype-katex',
      'remark-math',
      'remark-gfm',
      'react-syntax-highlighter',
      'react-syntax-highlighter/dist/esm/styles/prism'
    ]
  }
})
