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
})
