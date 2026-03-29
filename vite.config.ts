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
    allowedHosts: true
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
