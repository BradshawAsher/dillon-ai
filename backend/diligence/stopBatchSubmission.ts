import { supabase } from '../supabaseClient'
import { cancelBatchExecutions, type CancellationScope } from './n8nExecutionCancellation'

type Params = {
    requestIDs?: string[]
    projectId?: string
    submissionBatchId?: string
    environment?: 'production' | 'test'
}

const ACTIVE_STATUSES = new Set(['accepted', 'queued', 'pending', 'processing', 'received', 'running', 'submitted', 'uploading', 'waiting'])
const TERMINAL_STATUSES = new Set(['completed', 'approved', 'failed', 'processing_failed', 'error', 'rejected', 'upload_failed', 'stopped', 'stopped_by_user'])
const normalizedText = (value: unknown) => typeof value === 'string' ? value.trim() : ''

export default async function stopBatchSubmission(req: { params: Params; user: User }) {
    const environment = req.params.environment === 'test' ? 'test' : 'production'
    const projectId = normalizedText(req.params.projectId)
    const submissionBatchId = normalizedText(req.params.submissionBatchId)
    const explicitIds = new Set(Array.isArray(req.params.requestIDs) ? req.params.requestIDs.map(normalizedText).filter(Boolean) : [])
    if (!projectId || (!submissionBatchId && explicitIds.size === 0)) {
        throw new Error('A projectId and submissionBatchId or requestIDs are required. Project-wide cancellation is not supported here.')
    }

    const resolveRows = async () => {
        const rows: Array<{ request_id: string; status: string }> = []
        for (let offset = 0; ; offset += 500) {
            let query = supabase.from('documents').select('request_id, status')
                .eq('environment', environment).eq('project_id', projectId)
            if (submissionBatchId) query = query.eq('submission_batch_id', submissionBatchId)
            else query = query.in('request_id', [...explicitIds])
            const { data, error } = await query.order('request_id').range(offset, offset + 499)
            if (error) throw new Error(`Unable to verify batch documents: ${error.message}`)
            rows.push(...(data || []))
            if (!data || data.length < 500) return rows
        }
    }
    const rows = await resolveRows()
    const verifiedIds = new Set(rows.map((row) => normalizedText(row.request_id)).filter(Boolean))
    if ([...explicitIds].some((id) => !verifiedIds.has(id))) {
        throw new Error('Some requested documents do not belong to this project, batch, and environment. Refresh the batch before stopping it.')
    }
    const scope: CancellationScope = { projectId, submissionBatchId, environment, requestIDs: verifiedIds }
    const cancellation = await cancelBatchExecutions(scope)
    // Do not label documents stopped while their execution might still write a result.
    if (cancellation.errors.length > 0) return {
        ok: false, stopped: 0, requestIDs: [], matchedExecutions: cancellation.matched,
        canceledExecutions: cancellation.canceled, cancellationAvailable: cancellation.available,
        errors: cancellation.errors,
    }

    const statusResults: Array<{ requestID: string; stopped: boolean; error: string }> = []
    // Intake may have persisted another document while its execution was stopping.
    const currentRows = await resolveRows()
    currentRows.forEach((row) => scope.requestIDs.add(row.request_id))
    const activeRows = currentRows.filter((row) => ACTIVE_STATUSES.has(normalizedText(row.status).toLowerCase()))
    // Bound webhook concurrency so large batches do not exhaust n8n's execution slots.
    for (let offset = 0; offset < activeRows.length; offset += 3) {
        statusResults.push(...await Promise.all(activeRows.slice(offset, offset + 3).map(async (row) => {
            try {
                const response = await n8nFinancialAgent.rawRequest<{ ok?: boolean; requestID?: string; action?: string; status?: string }>({
                    // Test data still uses a published control webhook; webhook-test needs an editor listener.
                    path: 'webhook/dd-document-consideration', method: 'POST', bodyType: 'form-data',
                    formData: [
                        { key: 'requestID', value: row.request_id }, { key: 'action', value: 'stop' },
                        { key: 'projectId', value: projectId }, { key: 'submissionBatchId', value: submissionBatchId },
                        { key: 'environment', value: environment },
                    ],
                })
                const ack = response.data
                if (ack?.ok !== true || ack.requestID !== row.request_id || ack.action !== 'stop'
                    || !TERMINAL_STATUSES.has(normalizedText(ack.status).toLowerCase())) {
                    throw new Error(`Document ${row.request_id}: stop was not confirmed by n8n.`)
                }
                return { requestID: row.request_id, stopped: ack.status === 'stopped', error: '' }
            } catch (error) {
                return { requestID: row.request_id, stopped: false, error: error instanceof Error ? error.message : 'Document stop failed.' }
            }
        })))
    }
    const finalCheck = await cancelBatchExecutions(scope)
    const errors = [...statusResults.map((result) => result.error).filter(Boolean), ...finalCheck.errors]
    const stoppedIds = statusResults.filter((result) => result.stopped).map((result) => result.requestID)
    return {
        ok: errors.length === 0, stopped: stoppedIds.length, requestIDs: stoppedIds,
        matchedExecutions: cancellation.matched + finalCheck.matched,
        canceledExecutions: cancellation.canceled + finalCheck.canceled,
        cancellationAvailable: cancellation.available, errors,
    }
}
