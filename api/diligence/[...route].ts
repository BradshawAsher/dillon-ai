// Vercel serverless equivalent of frontend/server.ts's diligence routes.
// The existing Express server remains in place for Render and local use.
import type { IncomingMessage, ServerResponse } from 'node:http'

import getProjectSynthesis from '../../backend/diligence/getProjectSynthesis'
import getSubmissionHistory from '../../backend/diligence/getSubmissionHistory'
import submitDealPacket from '../../backend/diligence/submitDealPacket'
import updateSubmissionRow from '../../backend/diligence/updateSubmissionRow'
import { installRetoolGlobals, readJsonBody, userFromHeaders } from '../_lib/retoolRuntime'

type ApiRequest = IncomingMessage

// Make the Retool-compatible n8n client available before any route runs.
installRetoolGlobals()

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
    const user = userFromHeaders(req.headers)

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
      const params = await readJsonBody(req) as Parameters<typeof submitDealPacket>[0]['params']
      const acknowledgement = await submitDealPacket({ params, user })
      sendJson(res, 200, acknowledgement)
      return
    }

    if (route === 'submission-consideration' && req.method === 'POST') {
      const params = await readJsonBody(req) as Parameters<typeof updateSubmissionRow>[0]['params']
      sendJson(res, 200, await updateSubmissionRow({ params, user }))
      return
    }

    sendJson(res, 404, { error: 'Unknown API route: ' + (req.method ?? 'GET') + ' /api/diligence/' + route })
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
  }
}
