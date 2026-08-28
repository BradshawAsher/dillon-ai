// Standalone server — runs the dashboard completely outside Retool.
//
//   npm run build      # build the frontend into dist/
//   npm start          # build + serve app and API on http://localhost:3000
//
// It executes the REAL backend functions from /backend/diligence (tsx compiles
// them on the fly), shimming the globals Retool injects via retoolRuntime.ts,
// and serves the built frontend. Identity comes from the sign-in overlay's
// headers; PORT overrides the default port.
//
// Auth: set APP_PASSWORD (env var or .env file) to gate the API behind a
// shared team password. Unset (the localhost default), no login is required.
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import express from 'express'

import getProjectSynthesisImport from '../backend/diligence/getProjectSynthesis'
import getDealModelsImport from '../backend/diligence/getDealModels'
import saveDealModelImport from '../backend/diligence/saveDealModel'
import getProjectActionTrackerImport from '../backend/diligence/getProjectActionTracker'
import saveProjectActionTrackerImport from '../backend/diligence/saveProjectActionTracker'
import getSubmissionHistoryImport from '../backend/diligence/getSubmissionHistory'
import getWorkflowErrorsImport from '../backend/diligence/getWorkflowErrors'
import { getDiligenceKpis as getDiligenceKpisImport } from '../backend/diligence/getDiligenceKpis'
import getWatchdogEventsImport from '../backend/diligence/getWatchdogEvents'
import retryFailedDocumentImport from '../backend/diligence/retryFailedDocument'
import stopBatchSubmissionImport from '../backend/diligence/stopBatchSubmission'
import stopProjectSynthesisImport from '../backend/diligence/stopProjectSynthesis'
import triggerProjectSynthesisImport from '../backend/diligence/triggerProjectSynthesis'
import submitDealPacketImport from '../backend/diligence/submitDealPacket'
import updateSubmissionRowImport from '../backend/diligence/updateSubmissionRow'
import handleAccessRequestImport from '../backend/diligence/handleAccessRequest'
import handleSlackAlertImport from '../backend/diligence/handleSlackAlert'
import { cleanOrphanRecords } from '../backend/diligence/cleanOrphans'
import getEvalRunsImport from '../backend/diligence/getEvalRuns'
import { installRetoolGlobals, userFromHeaders } from './retoolRuntime'

try {
    process.loadEnvFile()
} catch {
    // no .env file — env vars may still come from the shell / host
}

// The backend files compile as CommonJS (no "type": "module" in the root
// package.json), so their default export may arrive wrapped when imported
// from this ESM module under tsx.
function interopDefault<T>(mod: T): T {
    const wrapped = (mod as { default?: T }).default
    return typeof wrapped === 'function' ? wrapped : mod
}

const getProjectSynthesis = interopDefault(getProjectSynthesisImport)
const getDealModels = interopDefault(getDealModelsImport)
const saveDealModel = interopDefault(saveDealModelImport)
const getProjectActionTracker = interopDefault(getProjectActionTrackerImport)
const saveProjectActionTracker = interopDefault(saveProjectActionTrackerImport)
const getWorkflowErrors = interopDefault(getWorkflowErrorsImport)
const getWatchdogEvents = interopDefault(getWatchdogEventsImport)
const getSubmissionHistory = interopDefault(getSubmissionHistoryImport)
const retryFailedDocument = interopDefault(retryFailedDocumentImport)
const stopBatchSubmission = interopDefault(stopBatchSubmissionImport)
const stopProjectSynthesis = interopDefault(stopProjectSynthesisImport)
const triggerProjectSynthesis = interopDefault(triggerProjectSynthesisImport)
const submitDealPacket = interopDefault(submitDealPacketImport)
const updateSubmissionRow = interopDefault(updateSubmissionRowImport)
const handleAccessRequest = interopDefault(handleAccessRequestImport)
const handleSlackAlert = interopDefault(handleSlackAlertImport)
const getEvalRuns = interopDefault(getEvalRunsImport)

installRetoolGlobals()

const frontendDir = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(frontendDir, 'dist')
const port = Number(process.env.PORT ?? 3000)
// Temporary open-access mode. Set ENABLE_ACCESS_GATES=true to restore the
// shared-password flow, even when APP_PASSWORD remains configured on Render.
const accessGatesEnabled = process.env.ENABLE_ACCESS_GATES === 'true'
const appPassword = accessGatesEnabled ? (process.env.APP_PASSWORD ?? '') : ''

// ---------------------------------------------------------------------------
// Shared-password auth (only active when explicitly enabled)
// ---------------------------------------------------------------------------

const SESSION_COOKIE = 'dd_session'
const sessions = new Set<string>()

function safeEqual(a: string, b: string) {
    const hashA = crypto.createHash('sha256').update(a).digest()
    const hashB = crypto.createHash('sha256').update(b).digest()
    return crypto.timingSafeEqual(hashA, hashB)
}

function sessionTokenFrom(req: express.Request): string {
    const header = req.headers.cookie
    if (typeof header !== 'string') {
        return ''
    }
    for (const part of header.split(';')) {
        const [name, ...rest] = part.trim().split('=')
        if (name === SESSION_COOKIE) {
            return rest.join('=')
        }
    }
    return ''
}

function isAuthenticated(req: express.Request) {
    return appPassword.length === 0 || sessions.has(sessionTokenFrom(req))
}

const app = express()

app.get('/api/session', (req, res) => {
    res.json({ authRequired: appPassword.length > 0, authenticated: isAuthenticated(req) })
})

app.post('/api/login', express.json(), (req, res) => {
    if (appPassword.length === 0) {
        res.json({ ok: true })
        return
    }

    const supplied = typeof req.body?.password === 'string' ? req.body.password : ''
    if (supplied.length === 0 || !safeEqual(supplied, appPassword)) {
        res.status(401).json({ error: 'Incorrect password' })
        return
    }

    const token = crypto.randomUUID()
    sessions.add(token)
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    res.setHeader(
        'Set-Cookie',
        `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000${secure}`
    )
    res.json({ ok: true })
})

app.use('/api/diligence', (req, res, next) => {
    // Public unauthenticated endpoints
    if (req.path === '/access-request' || req.path === '/slack-alert') {
        next()
        return
    }
    if (isAuthenticated(req)) {
        next()
        return
    }
    res.status(401).json({ error: 'Authentication required' })
})

// ---------------------------------------------------------------------------
// Diligence API — the same contract as Retool's generated hooks expect
// ---------------------------------------------------------------------------

app.get('/api/diligence/history', async (req, res) => {
    try {
        const environment = req.query.environment === 'test' ? 'test' : 'production'
        const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined
        const limit = typeof req.query.limit === 'string' || typeof req.query.limit === 'number' ? req.query.limit : undefined
        const full = req.query.full === 'true'
        const rows = await getSubmissionHistory({
            params: { environment, projectId, limit, full },
            user: userFromHeaders(req.headers),
        })
        res.json(rows)
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.get('/api/diligence/synthesis', async (req, res) => {
    try {
        const environment = req.query.environment === 'test' ? 'test' : 'production'
        const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined
        const limit = typeof req.query.limit === 'string' || typeof req.query.limit === 'number' ? req.query.limit : undefined
        const rows = await getProjectSynthesis({
            params: { environment, projectId, limit },
            user: userFromHeaders(req.headers),
        })
        res.json(rows)
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.get('/api/diligence/kpis', async (req, res) => {
    try {
        const environment = req.query.environment === 'test' ? 'test' : 'production'
        const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined
        const data = await getDiligenceKpisImport({
            params: { environment, projectId },
            user: userFromHeaders(req.headers),
        })
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.get('/api/diligence/eval-runs', async (req, res) => {
    try {
        const full = req.query.full === 'true'
        const limit = typeof req.query.limit === 'string' || typeof req.query.limit === 'number' ? req.query.limit : undefined
        res.json(await getEvalRuns({ params: { full, limit } }))
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.get('/api/diligence/deal-models', async (req, res) => {
    try {
        res.json(await getDealModels({ params: { projectId: typeof req.query.projectId === 'string' ? req.query.projectId : '' }, user: userFromHeaders(req.headers) }))
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.post('/api/diligence/deal-models', express.json(), async (req, res) => {
    try {
        res.json(await saveDealModel({ params: req.body, user: userFromHeaders(req.headers) }))
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.get('/api/diligence/project-action-tracker', async (req, res) => {
    try {
        res.json(await getProjectActionTracker({ params: { projectId: typeof req.query.projectId === 'string' ? req.query.projectId : '' }, user: userFromHeaders(req.headers) }))
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.post('/api/diligence/project-action-tracker', express.json(), async (req, res) => {
    try {
        res.json(await saveProjectActionTracker({ params: req.body, user: userFromHeaders(req.headers) }))
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

app.get('/api/diligence/workflow-errors', async (req, res) => {
    try {
        const environment = req.query.environment === 'test' ? 'test' : 'production'
        res.json(await getWorkflowErrors({ params: { environment }, user: userFromHeaders(req.headers) }))
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.get('/api/diligence/watchdog-events', async (req, res) => {
    try {
        const environment = req.query.environment === 'test' ? 'test' : 'production'
        res.json(await getWatchdogEvents({ params: { environment }, user: userFromHeaders(req.headers) }))
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.post('/api/diligence/submission-consideration', express.json(), async (req, res) => {
    try {
        res.json(await updateSubmissionRow({ params: req.body, user: userFromHeaders(req.headers) }))
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.post('/api/diligence/retry-failed-document', express.json(), async (req, res) => {
    try {
        res.status(202).json(await retryFailedDocument({ params: req.body, user: userFromHeaders(req.headers) }))
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.post('/api/diligence/stop-batch', express.json(), async (req, res) => {
    try {
        res.json(await stopBatchSubmission({ params: req.body, user: userFromHeaders(req.headers) }))
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.post('/api/diligence/stop-synthesis', express.json(), async (req, res) => {
    try {
        res.json(await stopProjectSynthesis({ params: req.body, user: userFromHeaders(req.headers) }))
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.post(['/api/diligence/run-synthesis', '/api/diligence/trigger-project-synthesis'], express.json(), async (req, res) => {
    try {
        res.json(await triggerProjectSynthesis({ params: req.body, user: userFromHeaders(req.headers) }))
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.post('/api/diligence/access-request', express.json(), async (req, res) => {
    try {
        res.json(await handleAccessRequest({ params: req.body, user: userFromHeaders(req.headers) }))
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.post(['/api/diligence/slack-alert', '/api/slack-alert'], express.json(), async (req, res) => {
    try {
        res.json(await handleSlackAlert({ params: req.body, headers: req.headers, user: userFromHeaders(req.headers) }))
    } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
})

app.all('/api/diligence/clean-orphans', async (_req, res) => {
    try {
        res.json(await cleanOrphanRecords())
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
    const authNote = appPassword.length > 0 ? 'password required' : 'access gates disabled'
    console.log(`Due Diligence Dashboard running at http://localhost:${port} — ${authNote}`)
})
