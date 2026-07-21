// Vercel serverless equivalent of frontend/server.ts's diligence routes.
// The existing Express server remains in place for Render and local use.
import type { IncomingMessage, ServerResponse } from 'node:http'

type ApiRequest = IncomingMessage

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  const requestUrl = new URL(req.url ?? '/', 'https://dashboard.local')
  const route = requestUrl.pathname.replace(/^\/api\/diligence\/?/, '')
  const environment = requestUrl.searchParams.get('environment') === 'test' ? 'test' : 'production'

  try {
    // Keep all application imports inside the request boundary. If Vercel's
    // bundler cannot load a dependency, callers receive the concrete error
    // instead of the platform's generic FUNCTION_INVOCATION_FAILED page.
    const runtime = await import('../../frontend/retoolRuntime')
    const { default: getProjectSynthesis } = await import('../../backend/diligence/getProjectSynthesis')
    const { default: getSubmissionHistory } = await import('../../backend/diligence/getSubmissionHistory')
    const { default: submitDealPacket } = await import('../../backend/diligence/submitDealPacket')

    runtime.installRetoolGlobals()
    const user = runtime.userFromHeaders(req.headers)

    if (route === 'history' && req.method === 'GET') {
      const rows = await getSubmissionHistory({ params: { environment }, user })
      sendJson(res, 200, rows)
      return
    }

    if (route === 'synthesis' && req.method === 'GET') {
      const rows = await getProjectSynthesis({ params: { environment }, user })
      sendJson(res, 200, rows)
      return
    }

    if (route === 'submit' && req.method === 'POST') {
      const params = await runtime.readJsonBody(req) as Parameters<typeof submitDealPacket>[0]['params']
      const acknowledgement = await submitDealPacket({ params, user })
      sendJson(res, 200, acknowledgement)
      return
    }

    sendJson(res, 404, { error: 'Unknown API route: ' + (req.method ?? 'GET') + ' /api/diligence/' + route })
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
  }
}
