import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { localBackendApi } from './localApi'

export default defineConfig({
  plugins: [react(), localBackendApi()],
  server: {
    port: 5173,
    fs: {
      // Allow the dev server to load /backend/diligence modules (repo root).
      allow: ['..'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons'
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase'
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react'
        },
      },
    },
  },
})
