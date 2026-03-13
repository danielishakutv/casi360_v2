import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://api.casi360.com',
        changeOrigin: true,
        secure: true,
      },
      '/sanctum': {
        target: 'https://api.casi360.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
