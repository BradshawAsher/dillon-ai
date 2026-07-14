// Vite dev-server plugin that stands in for Retool's backend runtime.
//
// It serves same-origin /api/diligence/* routes and executes the REAL backend
// functions from /backend/diligence in Node, shimming the globals Retool
// injects (n8nFinancialAgent). The browser never fetches external hosts —
// requests to n8n happen server-side, matching the production architecture
// described in frontend/notes/project-handoff.md.
//
// Dev server only: `vite build` output has no /api routes.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Connect, Plugin, ViteDevServer } from 'vite'

const N8N_BASE_URL = 'https://merge-works.app.n8n.cloud/'

const LOCAL_USER = {
  fullName: 'Local Dev User',
  email: 'localdev@example.com',
}

type RawRequestOptions = {
  path: string
  method?: string
  bodyType?: string
  formData?: Array<{ key: string; value?: string; file?: string; filename?: string }>
}

function installRetoolGlobals() {
  const globals = globalThis as Record<string, unknown>

  globals.n8nFinancialAgent = {
    async rawRequest(options: RawRequestOptions) {
      const url = new URL(options.path, N8N_BASE_URL).toString()
      const init: RequestInit = { method: options.method ?? 'GET' }

      if (options.bodyType === 'form-data' && options.formData) {
        const body = new FormData()
        for (const entry of options.formData) {
          if (typeof entry.file === 'string') {
            body.append(entry.key, new Blob([Buffer.from(entry.file, 'base64')]), entry.filename ?? 'upload.bin')
          } else {
            body.append(entry.key, entry.value ?? '')
          }
        }
        init.body = body
      }

      const response = await fetch(url, init)
      const text = await response.text()

      if (!response.ok) {
        throw new Error(`n8n responded ${response.status}: ${text.slice(0, 300)}`)
      }

      let data: unknown = null
      try {
        data = text.length > 0 ? JSON.parse(text) : {}
      } catch {
        data = { raw: text }
      }

      return { data }
    },
  }

  globals.retoolDb = {
    query() {
      throw new Error('retoolDb is only available inside Retool; the local preview uses sample findings instead')
    },
  }
}

function readJsonBody(req: Connect.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('error', reject)
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw.length > 0 ? (JSON.parse(raw) as Record<string, unknown>) : {})
      } catch (error) {
        reject(error)
      }
    })
  })
}

function backendModuleUrl(fileName: string) {
  const backendDir = path.dirname(fileURLToPath(import.meta.url))
  const absolutePath = path.resolve(backendDir, '../backend/diligence', fileName)
  return '/@fs/' + absolutePath.replace(/\\/g, '/')
}

async function handleRequest(
  server: ViteDevServer,
  req: Connect.IncomingMessage,
  res: import('node:http').ServerResponse
) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const route = requestUrl.pathname

  if (route === '/history' && req.method === 'GET') {
    const environment = requestUrl.searchParams.get('environment') === 'test' ? 'test' : 'production'
    const mod = await server.ssrLoadModule(backendModuleUrl('getSubmissionHistory.ts'))
    const rows: unknown = await mod.default({ params: { environment }, user: LOCAL_USER })
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(rows))
    return
  }

  if (route === '/submit' && req.method === 'POST') {
    const params = await readJsonBody(req)
    const mod = await server.ssrLoadModule(backendModuleUrl('submitDealPacket.ts'))
    const ack: unknown = await mod.default({ params, user: LOCAL_USER })
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(ack))
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
