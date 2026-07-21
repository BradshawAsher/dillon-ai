// Vite dev-server plugin that stands in for Retool's backend runtime.
//
// It serves same-origin /api/diligence/* routes and executes the REAL backend
// functions from /backend/diligence in Node, shimming the globals Retool
// injects (see retoolRuntime.ts). The browser never fetches external hosts —
// requests to n8n happen server-side, matching the production architecture
// described in docs/PROJECT_HANDOFF.md.
//
// Dev server only; the standalone equivalent is server.ts.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Connect, Plugin, ViteDevServer } from 'vite'

import { installRetoolGlobals, readJsonBody, userFromHeaders } from './retoolRuntime'

// Pick up N8N_WEBHOOK_SECRET etc. from frontend/.env in dev mode, matching
// the standalone server's behavior.
try {
  process.loadEnvFile()
} catch {
  // no .env file — env vars may still come from the shell
}

function backendModuleUrl(fileName: string) {
  const frontendDir = path.dirname(fileURLToPath(import.meta.url))
  const absolutePath = path.resolve(frontendDir, '../backend/diligence', fileName)
  return '/@fs/' + absolutePath.replace(/\\/g, '/')
}

async function handleRequest(
  server: ViteDevServer,
  req: Connect.IncomingMessage,
  res: import('node:http').ServerResponse
) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const route = requestUrl.pathname
  const user = userFromHeaders(req.headers)

  if (route === '/history' && req.method === 'GET') {
    const environment = requestUrl.searchParams.get('environment') === 'test' ? 'test' : 'production'
    const mod = await server.ssrLoadModule(backendModuleUrl('getSubmissionHistory.ts'))
    const rows: unknown = await mod.default({ params: { environment }, user })
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(rows))
    return
  }

  if (route === '/synthesis' && req.method === 'GET') {
    const environment = requestUrl.searchParams.get('environment') === 'test' ? 'test' : 'production'
    const mod = await server.ssrLoadModule(backendModuleUrl('getProjectSynthesis.ts'))
    const rows: unknown = await mod.default({ params: { environment }, user })
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(rows))
    return
  }

  if (route === '/submit' && req.method === 'POST') {
    const params = await readJsonBody(req)
    const mod = await server.ssrLoadModule(backendModuleUrl('submitDealPacket.ts'))
    const ack: unknown = await mod.default({ params, user })
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(ack))
    return
  }

  if (route === '/submission-consideration' && req.method === 'POST') {
    const params = await readJsonBody(req)
    const mod = await server.ssrLoadModule(backendModuleUrl('updateSubmissionRow.ts'))
    const result: unknown = await mod.default({ params, user })
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(result))
    return
  }

  res.statusCode = 404
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: `Unknown local API route: ${req.method} ${route}` }))
}

export function localBackendApi(): Plugin {
  return {
    name: 'local-backend-api',
    apply: 'serve',
    configureServer(server) {
      installRetoolGlobals()
      server.middlewares.use('/api/diligence', (req, res) => {
        handleRequest(server, req, res).catch((error: unknown) => {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
        })
      })
    },
  }
}
