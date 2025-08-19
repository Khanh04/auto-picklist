import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'frontend',
  build: {
    outDir: '../public',
    emptyOutDir: true,
    rollupOptions: {
      input: 'frontend/index.html'
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/download': 'http://localhost:3000',
      '/health': 'http://localhost:3000'
    }
  }
})