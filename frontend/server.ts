// Standalone server — runs the dashboard completely outside Retool.
//
//   npm run build      # build the frontend into dist/
//   npm start          # build + serve app and API on http://localhost:3000
//
// It executes the REAL backend functions from /backend/diligence (tsx compiles
// them on the fly), shimming the globals Retool injects via retoolRuntime.ts,
// and serves the built frontend. Identity comes from the sign-in overlay's
// headers; PORT overrides the default port.
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import express from 'express'

import getSubmissionHistoryImport from '../backend/diligence/getSubmissionHistory'
import submitDealPacketImport from '../backend/diligence/submitDealPacket'
import { installRetoolGlobals, userFromHeaders } from './retoolRuntime'

// The backend files compile as CommonJS (no "type": "module" in the root
// package.json), so their default export may arrive wrapped when imported
// from this ESM module under tsx.
function interopDefault<T>(mod: T): T {
  const wrapped = (mod as { default?: T }).default
  return typeof wrapped === 'function' ? wrapped : mod
}

const getSubmissionHistory = interopDefault(getSubmissionHistoryImport)
const submitDealPacket = interopDefault(submitDealPacketImport)

installRetoolGlobals()

const frontendDir = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(frontendDir, 'dist')
const port = Number(process.env.PORT ?? 3000)

const app = express()

app.get('/api/diligence/history', async (req, res) => {
  try {
    const environment = req.query.environment === 'test' ? 'test' : 'production'
    const rows = await getSubmissionHistory({
      params: { environment },
      user: userFromHeaders(req.headers),
    })
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

// Base64 file payloads can be large; match Retool's generous request limits.
app.post('/api/diligence/submit', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const ack = await submitDealPacket({
      params: req.body,
      user: userFromHeaders(req.headers),
    })
    res.json(ack)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

app.use(express.static(distDir))

// SPA fallback: any other route serves the app shell.
app.use((_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(port, () => {
  console.log(`Due Diligence Dashboard running at http://localhost:${port}`)
})
