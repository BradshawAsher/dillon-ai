import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import stopBatchSubmission from '../../backend/diligence/stopBatchSubmission'
import { deriveSubmissionStatus } from '../../backend/diligence/getSubmissionHistory'
import { executionMatchesScope } from '../../backend/diligence/n8nExecutionCancellation'

const database = vi.hoisted(() => ({ rows: [] as Array<Record<string, string>>, error: null as null | { message: string } }))
vi.mock('../../backend/supabaseClient', () => ({
    supabase: { from: () => {
        const filters: Array<(row: Record<string, string>) => boolean> = []
        const query = {
            select: () => query, order: () => query,
            eq: (key: string, value: string) => { filters.push((row) => row[key] === value); return query },
            in: (key: string, values: string[]) => { filters.push((row) => values.includes(row[key])); return query },
            range: async (start: number, end: number) => ({ data: database.rows.filter((row) => filters.every((f) => f(row))).slice(start, end + 1), error: database.error }),
        }
        return query
    } },
}))

const scope = { projectId: 'p', submissionBatchId: 'a', environment: 'production' as const, requestIDs: new Set(['doc-a']) }
const params = { projectId: 'p', submissionBatchId: 'a', environment: 'production' as const }
const user = { fullName: 'Test', email: 'test@example.com' }
const row = (id = 'doc-a', batch = 'a', project = 'p', status = 'processing', environment = 'production') => ({ request_id: id, submission_batch_id: batch, project_id: project, status, environment })
function execution(id = '1', batch = 'a', status = 'running', project = 'p', environment = 'production') {
    return {
        id, workflowId: 'W5Jp7CJIQbNy0qlY', status,
        data: { resultData: { runData: { 'When Executed by Another Workflow': [{ data: { main: [[{ json: { projectId: project, submissionBatchId: batch, environment, requestID: `doc-${batch}` } }]] } }] } } },
    }
}
type TestExecution = ReturnType<typeof execution>
let executions: TestExecution[]
let canceled: string[]
let stopStatus: number
let lookupStatus: number
let pageSize: number
let rawRequest: ReturnType<typeof vi.fn>
let mockFetch: ReturnType<typeof vi.fn>

beforeEach(() => {
    database.rows = [row()]
    database.error = null
    executions = []
    canceled = []
    stopStatus = 200
    lookupStatus = 200
    pageSize = 100
    vi.stubEnv('N8N_API_KEY', 'test-only-key')
    rawRequest = vi.fn(async (options) => {
        const id = options.formData.find((entry: { key: string }) => entry.key === 'requestID').value
        return { data: { ok: true, action: 'stop', requestID: id, status: 'stopped' } }
    })
    vi.stubGlobal('n8nFinancialAgent', { rawRequest })
    mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
        const parsed = new URL(url)
        if (parsed.pathname.endsWith('/stop')) {
            const id = parsed.pathname.split('/').at(-2)!
            if (stopStatus === 200) { canceled.push(id); executions.find((e) => e.id === id)!.status = 'canceled' }
            return Response.json({}, { status: stopStatus })
        }
        if (parsed.pathname.endsWith('/executions')) {
            if (lookupStatus !== 200) return Response.json({}, { status: lookupStatus })
            const offset = Number(parsed.searchParams.get('cursor') || 0)
            const filtered = executions.filter((e) => e.status === parsed.searchParams.get('status'))
            return Response.json({ data: filtered.slice(offset, offset + pageSize), nextCursor: filtered.length > offset + pageSize ? String(offset + pageSize) : null })
        }
        const found = executions.find((e) => e.id === parsed.pathname.split('/').at(-1))
        return Response.json(found || {}, { status: found ? 200 : 404 })
    })
    vi.stubGlobal('fetch', mockFetch)
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('batch execution scope', () => {
    it('does not match another batch in the same project', () => expect(executionMatchesScope(execution('1', 'b'), scope)).toBe(false))
    it('rejects mismatched projects and environments even with a known request ID', () => {
        expect(executionMatchesScope(execution('1', 'a', 'running', 'other'), scope)).toBe(false)
        expect(executionMatchesScope(execution('1', 'a', 'running', 'p', 'test'), scope)).toBe(false)
    })
    it('does not match batch IDs embedded in unrelated result rows or text', () => {
        const e = execution('1', 'b')
        Object.assign(e.data.resultData.runData, { 'Read all documents': execution().data.resultData.runData['When Executed by Another Workflow'] })
        expect(executionMatchesScope(e, scope)).toBe(false)
    })
    it('does not cancel a project-wide consolidator that reads this batch', () => {
        const e = { ...execution(), data: { resultData: { runData: { 'When Executed by Another Workflow': [{ data: { main: [[{ json: { projectId: 'p' } }]] } }] } } } }
        expect(executionMatchesScope(e, scope)).toBe(false)
    })
    it('matches queued trigger input before any node has run', () => {
        const e = { ...execution(), data: { executionData: { nodeExecutionStack: [{ node: { type: 'n8n-nodes-base.executeWorkflowTrigger' }, data: { main: [[{ json: { requestID: 'doc-a' } }]] } }] } } }
        expect(executionMatchesScope(e, scope)).toBe(true)
    })
    it('requires every input in a multi-item execution to be in scope', () => {
        const e = execution()
        e.data.resultData.runData['When Executed by Another Workflow'][0].data.main[0].push(execution('2', 'b').data.resultData.runData['When Executed by Another Workflow'][0].data.main[0][0])
        expect(executionMatchesScope(e, scope)).toBe(false)
    })
})

describe('stopBatchSubmission', () => {
    it('does not relabel a stopped retry as completed because old analysis remains', () => {
        expect(deriveSubmissionStatus({ status: 'stopped', extracted_json: '{"old":true}', financial_facts_json: '{}' })).toBe('stopped')
    })
    it('rejects project-only stop requests', async () => {
        await expect(stopBatchSubmission({ params: { projectId: 'p' }, user })).rejects.toThrow('Project-wide')
        expect(mockFetch).not.toHaveBeenCalled()
    })
    it.each([row('foreign', 'b'), row('foreign', 'a', 'other'), row('foreign', 'a', 'p', 'processing', 'test')])('rejects unverified explicit IDs before any mutation', async (foreign) => {
        database.rows.push(foreign)
        await expect(stopBatchSubmission({ params: { ...params, requestIDs: ['foreign'] }, user })).rejects.toThrow('do not belong')
        expect(mockFetch).not.toHaveBeenCalled()
        expect(rawRequest).not.toHaveBeenCalled()
    })
    it('cancels only the selected batch, including waiting and queued executions', async () => {
        executions = [execution('1'), execution('2', 'b'), execution('3', 'a', 'waiting'), execution('4', 'a', 'new'), execution('5', 'a', 'unknown')]
        const result = await stopBatchSubmission({ params, user })
        expect(result.ok).toBe(true)
        expect(canceled.sort()).toEqual(['1', '3', '4', '5'])
        expect(result.canceledExecutions).toBe(4)
        expect(rawRequest).toHaveBeenCalledTimes(1)
    })
    it('follows execution cursors past the first page', async () => {
        pageSize = 1
        executions = [execution('other', 'b'), execution('target')]
        expect((await stopBatchSubmission({ params, user })).ok).toBe(true)
        expect(canceled).toEqual(['target'])
        expect(mockFetch.mock.calls.some(([url]) => String(url).includes('cursor=1'))).toBe(true)
    })
    it('does not report success when a live cancellation fails and there are no active database rows', async () => {
        database.rows = [row('doc-a', 'a', 'p', 'failed')]
        executions = [execution()]
        stopStatus = 503
        expect(await stopBatchSubmission({ params, user })).toMatchObject({ ok: false, canceledExecutions: 0, errors: [expect.stringContaining('503')] })
        expect(rawRequest).not.toHaveBeenCalled()
    })
    it('does not treat a 404 stop response as confirmation while the execution is active', async () => {
        executions = [execution()]
        stopStatus = 404
        expect((await stopBatchSubmission({ params, user })).ok).toBe(false)
        expect(rawRequest).not.toHaveBeenCalled()
    })
    it('reports lookup/authentication failures without marking documents stopped', async () => {
        lookupStatus = 401
        expect((await stopBatchSubmission({ params, user })).ok).toBe(false)
        expect(rawRequest).not.toHaveBeenCalled()
    })
    it('reports missing API credentials explicitly', async () => {
        vi.stubEnv('N8N_API_KEY', '')
        expect(await stopBatchSubmission({ params, user })).toMatchObject({ ok: false, cancellationAvailable: false })
        expect(rawRequest).not.toHaveBeenCalled()
    })
    it('rejects empty or unconfirmed webhook responses', async () => {
        rawRequest.mockResolvedValue({ data: {} })
        expect(await stopBatchSubmission({ params, user })).toMatchObject({ ok: false, stopped: 0 })
    })
    it('reports partial document persistence failures', async () => {
        database.rows.push(row('doc-a2'))
        rawRequest.mockRejectedValueOnce(new Error('Supabase sync failed'))
        expect(await stopBatchSubmission({ params, user })).toMatchObject({ ok: false, stopped: 1, errors: ['Supabase sync failed'] })
    })
    it('keeps completed and failed documents unchanged', async () => {
        database.rows = [row('done', 'a', 'p', 'completed'), row('failed', 'a', 'p', 'failed')]
        expect(await stopBatchSubmission({ params, user })).toMatchObject({ ok: true, stopped: 0 })
        expect(rawRequest).not.toHaveBeenCalled()
    })
    it('uses the published control webhook for test records too', async () => {
        database.rows = [row('doc-a', 'a', 'p', 'processing', 'test')]
        await stopBatchSubmission({ params: { ...params, environment: 'test' }, user })
        expect(rawRequest.mock.calls[0][0]).toMatchObject({ path: 'webhook/dd-document-consideration' })
    })
    it('paginates database rows without silently dropping documents', async () => {
        database.rows = Array.from({ length: 501 }, (_, i) => row(`doc-${i}`, 'a', 'p', i === 500 ? 'processing' : 'completed'))
        expect(await stopBatchSubmission({ params, user })).toMatchObject({ ok: true, requestIDs: ['doc-500'] })
    })
    it('fails safely on unreadable execution data', async () => {
        executions = [{ ...execution(), data: {} } as TestExecution]
        expect(await stopBatchSubmission({ params, user })).toMatchObject({ ok: false, errors: [expect.stringContaining('no readable trigger input')] })
        expect(canceled).toEqual([])
    })
    it('can repeat a confirmed stop without altering terminal records', async () => {
        executions = [execution()]
        expect((await stopBatchSubmission({ params, user })).ok).toBe(true)
        database.rows[0].status = 'stopped'
        rawRequest.mockClear()
        expect(await stopBatchSubmission({ params, user })).toMatchObject({ ok: true, stopped: 0, canceledExecutions: 0 })
        expect(rawRequest).not.toHaveBeenCalled()
    })
})
