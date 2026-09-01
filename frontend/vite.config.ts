import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

import { localBackendApi } from './localApi'

function getGitCommitSha() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  }
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'local'
  }
}

const buildInfo = {
  commit: getGitCommitSha(),
  builtAt: new Date().toISOString(),
}

function versionJsonPlugin(): Plugin {
  return {
    name: 'version-json-generator',
    buildStart() {
      try {
        const publicDir = path.resolve(__dirname, 'public')
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })
        fs.writeFileSync(path.join(publicDir, 'version.json'), JSON.stringify(buildInfo, null, 2))
      } catch (err) {
        console.warn('Could not write public/version.json:', err)
      }
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(buildInfo, null, 2),
      })
    },
  }
}

export default defineConfig({
  define: {
    __APP_BUILD_INFO__: JSON.stringify(buildInfo),
  },
  plugins: [react(), localBackendApi(), versionJsonPlugin()],
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
  test: {
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
  },
})

