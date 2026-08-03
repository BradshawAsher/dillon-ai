// Vercel serverless equivalent of frontend/server.ts's diligence routes.
// The existing Express server remains in place for Render and local use.
import type { IncomingMessage, ServerResponse } from 'node:http'

import getProjectSynthesis from '../../backend/diligence/getProjectSynthesis'
import getDealModels from '../../backend/diligence/getDealModels'
import saveDealModel from '../../backend/diligence/saveDealModel'
import getSubmissionHistory from '../../backend/diligence/getSubmissionHistory'
import getEvalRuns from '../../backend/diligence/getEvalRuns'
import getWorkflowErrors from '../../backend/diligence/getWorkflowErrors'
import getProjectActionTracker from '../../backend/diligence/getProjectActionTracker'
import saveProjectActionTracker from '../../backend/diligence/saveProjectActionTracker'
import retryFailedDocument from '../../backend/diligence/retryFailedDocument'
import stopBatchSubmission from '../../backend/diligence/stopBatchSubmission'
import stopProjectSynthesis from '../../backend/diligence/stopProjectSynthesis'
import submitDealPacket from '../../backend/diligence/submitDealPacket'
import updateSubmissionRow from '../../backend/diligence/updateSubmissionRow'
import { installRetoolGlobals, readJsonBody, userFromHeaders } from '../_lib/retoolRuntime'

type ApiRequest = IncomingMessage

// n8n client still needed for submit + retry (workflow triggers).
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

        if (route === 'eval-runs' && req.method === 'GET') {
            sendJson(res, 200, await getEvalRuns())
            return
        }
        if (route === 'history' && req.method === 'GET') {
            sendJson(res, 200, await getSubmissionHistory({ params: { environment }, user }))
            return
        }
        if (route === 'workflow-errors' && req.method === 'GET') {
            sendJson(res, 200, await getWorkflowErrors({ params: { environment }, user }))
            return
        }
        if (route === 'synthesis' && req.method === 'GET') {
            sendJson(res, 200, await getProjectSynthesis({ params: { environment }, user }))
            return
        }
        if (route === 'deal-models' && req.method === 'GET') {
            sendJson(res, 200, await getDealModels({ params: { projectId: requestUrl.searchParams.get('projectId') ?? '' }, user }))
            return
        }
        if (route === 'deal-models' && req.method === 'POST') {
            const params = await readJsonBody(req) as Parameters<typeof saveDealModel>[0]['params']
            sendJson(res, 200, await saveDealModel({ params, user }))
            return
        }
        if (route === 'project-action-tracker' && req.method === 'GET') {
            const projectId = requestUrl.searchParams.get('projectId') ?? ''
            sendJson(res, 200, await getProjectActionTracker({ params: { projectId }, user }))
            return
        }
        if (route === 'project-action-tracker' && req.method === 'POST') {
            const params = await readJsonBody(req) as Parameters<typeof saveProjectActionTracker>[0]['params']
            sendJson(res, 200, await saveProjectActionTracker({ params, user }))
            return
        }
        if (route === 'submission-consideration' && req.method === 'POST') {
            const params = await readJsonBody(req) as Parameters<typeof updateSubmissionRow>[0]['params']
            sendJson(res, 200, await updateSubmissionRow({ params, user }))
            return
        }
        if (route === 'submit' && req.method === 'POST') {
            const params = await readJsonBody(req) as Parameters<typeof submitDealPacket>[0]['params']
            sendJson(res, 200, await submitDealPacket({ params, user }))
            return
        }
        if (route === 'retry-failed-document' && req.method === 'POST') {
            const params = await readJsonBody(req) as Parameters<typeof retryFailedDocument>[0]['params']
            sendJson(res, 202, await retryFailedDocument({ params, user }))
            return
        }
        if (route === 'stop-batch' && req.method === 'POST') {
            const params = await readJsonBody(req) as Parameters<typeof stopBatchSubmission>[0]['params']
            sendJson(res, 200, await stopBatchSubmission({ params, user }))
            return
        }
        if (route === 'stop-synthesis' && req.method === 'POST') {
            const params = await readJsonBody(req) as Parameters<typeof stopProjectSynthesis>[0]['params']
            sendJson(res, 200, await stopProjectSynthesis({ params, user }))
            return
        }

        sendJson(res, 404, { error: 'Unknown API route: ' + (req.method ?? 'GET') + ' /api/diligence/' + route })
    } catch (error) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
    }
}
