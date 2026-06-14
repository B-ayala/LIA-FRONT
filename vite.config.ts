import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { imagetools } from 'vite-imagetools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), imagetools()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'mui'
          }

          if (id.includes('react-router')) {
            return 'router'
          }

          if (id.includes('@supabase')) {
            return 'supabase'
          }

          if (id.includes('@tanstack')) {
            return 'query'
          }

          if (id.includes('framer-motion')) {
            return 'motion'
          }

          if (id.includes('lucide-react') || id.includes('react-icons')) {
            return 'icons'
          }

          if (id.includes('react') || id.includes('scheduler')) {
            return 'react-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
})
