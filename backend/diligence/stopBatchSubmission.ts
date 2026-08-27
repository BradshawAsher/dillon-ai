import { supabase } from '../supabaseClient'

type Params = {
    requestIDs?: string[]
    projectId?: string
    submissionBatchId?: string
    batchStartedAt?: number
    environment?: 'production' | 'test'
}

type N8nExecution = {
    id: string
    workflowId: string
    status: string
    data?: unknown
}

const N8N_BASE_URL = 'https://merge-works.app.n8n.cloud'
const ACTIVE_STATUSES = new Set(['accepted', 'queued', 'processing', 'received', 'running', 'submitted', 'uploading'])
const CANCELLABLE_WORKFLOW_IDS = new Set([
    'vBnMdx8cvSFIFx6m',
    'W5Jp7CJIQbNy0qlY',
    '91TN7kUY3RXoMip2',
    'iOaYHcZLktC6aO2u',
    '0OVTAMMp2iMx53Aw',
    'IoSad3rTYJMk4Mon',
])

function normalizedText(value: unknown) {
    return typeof value === 'string' ? value.trim() : ''
}

function containsTarget(value: unknown, targets: Set<string>, depth = 0): boolean {
    if (depth > 30 || value == null) return false
    if (typeof value === 'string') return targets.has(value.trim())
    if (Array.isArray(value)) return value.some((item) => containsTarget(item, targets, depth + 1))
    if (typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).some((item) => containsTarget(item, targets, depth + 1))
    }
    return false
}

async function getActiveRequestIds(params: Params, environment: 'production' | 'test') {
    const explicitIds = Array.isArray(params.requestIDs)
        ? params.requestIDs.map(normalizedText).filter(Boolean)
        : []
    const rows = new Map<string, { request_id: string; status: string }>()

    if (explicitIds.length > 0) {
        const { data, error } = await supabase
            .from('documents')
            .select('request_id, status')
            .eq('environment', environment)
            .in('request_id', explicitIds)

        if (error) throw new Error(`Unable to verify active documents: ${error.message}`)
        for (const row of data || []) rows.set(row.request_id, row)
    }

    const projectId = normalizedText(params.projectId)
    const submissionBatchId = normalizedText(params.submissionBatchId)
    if (projectId || submissionBatchId) {
        let query = supabase
            .from('documents')
            .select('request_id, status')
            .eq('environment', environment)

        if (projectId) query = query.eq('project_id', projectId)
        if (submissionBatchId) query = query.eq('submission_batch_id', submissionBatchId)

        const { data, error } = await query.limit(250)
        if (error) throw new Error(`Unable to resolve batch documents: ${error.message}`)
        for (const row of data || []) rows.set(row.request_id, row)
    }

    return [...rows.values()]
        .filter((row) => ACTIVE_STATUSES.has(normalizedText(row.status).toLowerCase()))
        .map((row) => normalizedText(row.request_id))
        .filter(Boolean)
}

async function stopMatchingExecutions(targets: Set<string>) {
    const apiKey = normalizedText(process.env.N8N_API_KEY)
    if (!apiKey || targets.size === 0) {
        return { available: Boolean(apiKey), matched: 0, canceled: 0, errors: [] as string[] }
    }

    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': apiKey,
    }
    const listResponse = await fetch(`${N8N_BASE_URL}/api/v1/executions?status=running&limit=100&includeData=true`, { headers })
    if (!listResponse.ok) throw new Error(`n8n execution lookup failed (${listResponse.status})`)

    const payload = await listResponse.json() as { data?: N8nExecution[] }
    const matches = (payload.data || []).filter((execution) =>
        CANCELLABLE_WORKFLOW_IDS.has(execution.workflowId)
        && containsTarget(execution.data, targets)
    )

    const results = await Promise.all(matches.map(async (execution) => {
        const response = await fetch(`${N8N_BASE_URL}/api/v1/executions/${encodeURIComponent(execution.id)}/stop`, {
            method: 'POST',
            headers,
        })
        if (response.ok) return { id: execution.id, canceled: true, error: '' }

        const message = (await response.text()).slice(0, 200)
        if (response.status === 404 && /find execution to stop|not found/i.test(message)) {
            return { id: execution.id, canceled: false, error: '' }
        }
        return { id: execution.id, canceled: false, error: `Execution ${execution.id}: ${response.status} ${message}` }
    }))

    return {
        available: true,
        matched: matches.length,
        canceled: results.filter((result) => result.canceled).length,
        errors: results.map((result) => result.error).filter(Boolean),
    }
}

export default async function stopBatchSubmission(req: { params: Params; user: User }) {
    const environment = req.params.environment === 'test' ? 'test' : 'production'
    const projectId = normalizedText(req.params.projectId)
    const submissionBatchId = normalizedText(req.params.submissionBatchId)
    const explicitIds = Array.isArray(req.params.requestIDs)
        ? req.params.requestIDs.map(normalizedText).filter(Boolean)
        : []

    if (explicitIds.length === 0 && !projectId && !submissionBatchId) {
        throw new Error('requestIDs, projectId, or submissionBatchId is required')
    }

    const requestIDs = await getActiveRequestIds(req.params, environment)
    const cancellationTargets = new Set([projectId, submissionBatchId, ...explicitIds, ...requestIDs].filter(Boolean))
    const executionResult = await stopMatchingExecutions(cancellationTargets)
    const path = environment === 'test'
        ? 'webhook-test/dd-document-consideration'
        : 'webhook/dd-document-consideration'

    const statusResults = await Promise.all(requestIDs.map(async (requestID) => {
        try {
            await n8nFinancialAgent.rawRequest<{ ok?: boolean; requestID?: string; action?: string }>({
                path,
                method: 'POST',
                bodyType: 'form-data',
                formData: [
                    { key: 'requestID', value: requestID },
                    { key: 'action', value: 'stop' },
                ],
            })
            return { requestID, stopped: true, error: '' }
        } catch (error) {
            return {
                requestID,
                stopped: false,
                error: error instanceof Error ? error.message : 'Unknown stop error',
            }
        }
    }))

    const stoppedRequestIDs = statusResults.filter((result) => result.stopped).map((result) => result.requestID)
    const statusErrors = statusResults.map((result) => result.error).filter(Boolean)
    if (requestIDs.length > 0 && stoppedRequestIDs.length === 0 && executionResult.canceled === 0) {
        throw new Error(statusErrors[0] || executionResult.errors[0] || 'Unable to stop the active batch')
    }

    return {
        ok: true,
        stopped: stoppedRequestIDs.length,
        requestIDs: stoppedRequestIDs,
        matchedExecutions: executionResult.matched,
        canceledExecutions: executionResult.canceled,
        cancellationAvailable: executionResult.available,
        errors: [...executionResult.errors, ...statusErrors],
    }
}
