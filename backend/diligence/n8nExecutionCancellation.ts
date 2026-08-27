export type CancellationScope = {
    projectId: string
    submissionBatchId: string
    environment: 'production' | 'test'
    requestIDs: Set<string>
}

type Items = Array<Array<{ json?: Record<string, unknown> }> | null>
type Execution = {
    id: string
    workflowId: string
    status: string
    data?: {
        resultData?: { runData?: Record<string, Array<{ data?: { main?: Items } }>> }
        executionData?: { nodeExecutionStack?: Array<{ node?: { type?: string }; data?: { main?: Items } }> }
    }
    workflowData?: { nodes?: Array<{ name: string; type: string }> }
}

const BASE_URL = 'https://merge-works.app.n8n.cloud/api/v1'
const ACTIVE_STATUSES = ['running', 'waiting', 'new', 'unknown']
const WORKFLOW_IDS = new Set(['vBnMdx8cvSFIFx6m', 'W5Jp7CJIQbNy0qlY', '91TN7kUY3RXoMip2', 'iOaYHcZLktC6aO2u', '0OVTAMMp2iMx53Aw', 'IoSad3rTYJMk4Mon'])
const TRIGGER_TYPES = new Set(['n8n-nodes-base.webhook', 'n8n-nodes-base.executeWorkflowTrigger'])
const KNOWN_TRIGGERS = new Set(['Webhook', 'When Executed by Another Workflow', 'Retry failed document webhook'])
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''

// Only inspect entry payloads. A counter's later table read can contain OTHER batches.
export function executionMatchesScope(execution: Execution, scope: CancellationScope): boolean | null {
    const inputs: Record<string, unknown>[] = []
    const collect = (main?: Items) => {
        for (const output of main || []) for (const item of output || []) {
            if (item.json) inputs.push(item.json)
        }
    }
    const triggerNames = execution.workflowData?.nodes
        ? new Set(execution.workflowData.nodes.filter((node) => TRIGGER_TYPES.has(node.type)).map((node) => node.name))
        : KNOWN_TRIGGERS
    for (const [name, runs] of Object.entries(execution.data?.resultData?.runData || {})) {
        if (triggerNames.has(name)) for (const run of runs) collect(run.data?.main)
    }
    if (inputs.length === 0) {
        for (const entry of execution.data?.executionData?.nodeExecutionStack || []) {
            if (TRIGGER_TYPES.has(entry.node?.type || '')) collect(entry.data?.main)
        }
    }
    if (inputs.length === 0) return null

    return inputs.every((input) => {
        const record = input.body && typeof input.body === 'object' ? input.body as Record<string, unknown> : input
        const requestID = text(record.requestID ?? record.request_id)
        const projectId = text(record.projectId ?? record.project_id)
        const batchId = text(record.submissionBatchId ?? record.submission_batch_id)
        const environment = text(record.environment)
        const verifiedRequest = scope.requestIDs.has(requestID)
        if (projectId && projectId !== scope.projectId) return false
        if (environment && environment !== scope.environment) return false
        if (scope.submissionBatchId && batchId && batchId !== scope.submissionBatchId) return false
        if (verifiedRequest) return true
        return Boolean(scope.submissionBatchId && batchId === scope.submissionBatchId
            && projectId === scope.projectId && environment === scope.environment)
    })
}

export async function cancelBatchExecutions(scope: CancellationScope) {
    const apiKey = text(process.env.N8N_API_KEY)
    const result = { available: Boolean(apiKey), matched: 0, canceled: 0, errors: [] as string[] }
    if (!apiKey) {
        result.errors.push('Live cancellation is unavailable: N8N_API_KEY is not configured on the server.')
        return result
    }
    const headers = { Accept: 'application/json', 'X-N8N-API-KEY': apiKey }
    const request = (path: string, method = 'GET') => fetch(`${BASE_URL}${path}`, {
        method, headers, signal: AbortSignal.timeout(10_000),
    })
    const listMatches = async () => {
        const matches = new Map<string, Execution>()
        for (const status of ACTIVE_STATUSES) {
            let cursor = ''
            const seen = new Set<string>()
            do {
                if (seen.has(cursor) || seen.size >= 50) throw new Error('n8n execution pagination did not finish; stop could not be verified.')
                seen.add(cursor)
                const query = new URLSearchParams({ status, limit: '100', includeData: 'true' })
                if (cursor) query.set('cursor', cursor)
                const response = await request(`/executions?${query}`)
                if (!response.ok) throw new Error(`n8n ${status} execution lookup failed (${response.status}).`)
                const payload = await response.json() as { data?: Execution[]; nextCursor?: string | null }
                if (!Array.isArray(payload.data)) throw new Error('n8n returned an invalid execution list.')
                for (let execution of payload.data) {
                    if (!WORKFLOW_IDS.has(execution.workflowId) || !ACTIVE_STATUSES.includes(execution.status)) continue
                    let matchesScope = executionMatchesScope(execution, scope)
                    if (matchesScope === null) {
                        const detail = await request(`/executions/${encodeURIComponent(execution.id)}?includeData=true`)
                        if (detail.status === 404) continue
                        if (!detail.ok) throw new Error(`Unable to inspect execution ${execution.id} (${detail.status}).`)
                        execution = await detail.json() as Execution
                        if (!ACTIVE_STATUSES.includes(execution.status)) continue
                        matchesScope = executionMatchesScope(execution, scope)
                    }
                    if (matchesScope === null) throw new Error(`Execution ${execution.id} has no readable trigger input; cancellation cannot be verified.`)
                    if (matchesScope) matches.set(execution.id, execution)
                }
                cursor = payload.nextCursor || ''
            } while (cursor)
        }
        return [...matches.values()]
    }

    try {
        const matchedIds = new Set<string>()
        // A second pass catches a child that started while its parent was being stopped.
        for (let pass = 0; pass < 2; pass++) {
            const matches = await listMatches()
            if (matches.length === 0) return result
            for (const execution of matches) {
                matchedIds.add(execution.id)
                result.matched = matchedIds.size
                try {
                    const response = await request(`/executions/${encodeURIComponent(execution.id)}/stop`, 'POST')
                    if (!response.ok && response.status !== 404) throw new Error(`Execution ${execution.id}: cancellation failed (${response.status}).`)
                    // A 404 from /stop is not proof: the run may still be waiting or inaccessible.
                    const verify = await request(`/executions/${encodeURIComponent(execution.id)}`)
                    if (verify.status === 404) continue
                    if (!verify.ok) throw new Error(`Execution ${execution.id}: unable to verify cancellation (${verify.status}).`)
                    const terminal = await verify.json() as Execution
                    if (ACTIVE_STATUSES.includes(terminal.status) || !terminal.status) throw new Error(`Execution ${execution.id} is still active. Retry Stop Batch.`)
                    if (terminal.status === 'canceled') result.canceled++
                } catch (error) {
                    result.errors.push(error instanceof Error ? error.message : 'n8n cancellation failed.')
                }
            }
            if (result.errors.length > 0) return result
        }
        if ((await listMatches()).length > 0) result.errors.push('Matching executions are still active. Retry Stop Batch.')
    } catch (error) {
        result.errors.push(error instanceof Error ? error.message : 'Unable to verify n8n cancellation.')
    }
    return result
}
