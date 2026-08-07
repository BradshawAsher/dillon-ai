import { supabase } from '../supabaseClient'

type Params = {
    environment?: 'production' | 'test'
}

const activeSubmissionStatuses = new Set([
    'uploading',
    'accepted',
    'queued',
    'processing',
    'received',
    'running',
    'submitted',
])

function hasText(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0
}

function deriveSubmissionStatus(row: Record<string, any>) {
    const rawStatus = typeof row.status === 'string' ? row.status.trim() : ''
    const normalizedStatus = rawStatus.toLowerCase()
    const hasExtractedAnalysis = hasText(row.extracted_json) || hasText(row.financial_facts_json)
    const failedAfterRetries = String(row.ai_escalation_reason ?? '').trim().toLowerCase() === 'processing_failure'

    if (normalizedStatus === 'completed' || normalizedStatus === 'approved' || hasExtractedAnalysis) {
        return 'completed'
    }

    const updatedAtMs = row.updated_at ? new Date(row.updated_at).getTime() : 0
    const createdAtMs = row.created_at ? new Date(row.created_at).getTime() : 0
    const lastActiveMs = Math.max(updatedAtMs, createdAtMs)
    const elapsedSeconds = lastActiveMs > 0 ? (Date.now() - lastActiveMs) / 1000 : 0

    const batchCount = typeof row.expected_batch_document_count === 'number' && row.expected_batch_document_count > 0
        ? row.expected_batch_document_count
        : 1
    const perDocTimeoutSeconds = Math.max(240, batchCount * 240)

    if (activeSubmissionStatuses.has(normalizedStatus) && elapsedSeconds > perDocTimeoutSeconds) {
        return 'failed'
    }

    const hasTerminalFailureMarkers = activeSubmissionStatuses.has(normalizedStatus)
        && hasText(row.processed_at)
        && (hasText(row.error_message) || failedAfterRetries)

    if (hasTerminalFailureMarkers) {
        return 'failed'
    }

    return rawStatus || 'unknown'
}

async function syncPendingRowsFromN8nDataTable(rows: Array<Record<string, any>>) {
    const pendingRows = rows.filter(r => activeSubmissionStatuses.has(String(r.status ?? '').trim().toLowerCase()) && !hasText(r.extracted_json))
    if (pendingRows.length === 0) return

    try {
        const n8nApiKey = process.env.N8N_API_KEY
        if (!n8nApiKey) return

        const res = await fetch('https://merge-works.app.n8n.cloud/api/v1/data-tables/rBFHVB1W7ldSiObM/rows?limit=100', {
            headers: {
                'X-N8N-API-KEY': n8nApiKey,
                'Accept': 'application/json'
            }
        })

        if (!res.ok) return
        const json = await res.json()
        const n8nRows = (json.data || json || []) as Array<Record<string, any>>

        for (const pendingRow of pendingRows) {
            const reqId = String(pendingRow.request_id ?? pendingRow.requestId ?? '').trim()
            const fileName = String(pendingRow.file_name ?? pendingRow.fileName ?? '').trim().toLowerCase()

            const match = n8nRows.find(n8nRow => {
                const n8nReqId = String(n8nRow.requestID ?? '').trim()
                const n8nFileName = String(n8nRow.fileName ?? '').trim().toLowerCase()
                return (reqId.length > 0 && n8nReqId === reqId) || (fileName.length > 0 && n8nFileName === fileName && String(n8nRow.status ?? '').toLowerCase() === 'completed')
            })

            if (match && String(match.status ?? '').toLowerCase() === 'completed') {
                const updatePayload = {
                    status: 'completed',
                    detected_document_type: match.detectedDocumentType || match.documentType || 'Other',
                    financial_facts_json: match.financialFactsJson || '',
                    extracted_json: match.ai_extractedJson || '',
                    processed_at: match.ai_processedAt || new Date().toISOString(),
                    input_tokens: match.inputTokens || 0,
                    output_tokens: match.outputTokens || 0,
                    total_tokens: match.totalTokens || 0,
                    cost_usd: match.costUsd || 0,
                }

                Object.assign(pendingRow, updatePayload)

                void supabase
                    .from('documents')
                    .update(updatePayload)
                    .eq('id', pendingRow.id)
            }
        }
    } catch {
        // Silently continue if n8n read times out
    }
}

export default async function getSubmissionHistory(req: {
    params: Params
    user: User
}) {
    const environment = req.params.environment === 'test' ? 'test' : 'production'

    const { data: rows, error } = await supabase
        .from('documents')
        .select('*')
        .eq('environment', environment)
        .order('updated_at', { ascending: false })
        .limit(500)

    if (error) throw new Error(`Supabase read failed: ${error.message}`)
    if (!rows) return []

    await syncPendingRowsFromN8nDataTable(rows)

    return (rows as Array<Record<string, any>>).map((row) => {
        const derivedStatus = deriveSubmissionStatus(row)
        const isCompleted = derivedStatus === 'completed'
        return {
            requestID: row.request_id ?? '',
            dealName: row.deal_name ?? '',
            companyName: row.company_name ?? '',
            workstream: row.workstream ?? '',
            submissionNotes: row.submission_notes ?? '',
            analystName: row.analyst_name ?? '',
            analystEmail: row.analyst_email ?? '',
            projectId: row.project_id ?? '',
            projectStage: row.project_stage ?? '',
            documentType: row.document_type ?? '',
            detectedDocumentType: row.detected_document_type ?? '',
            detectedDocumentTypesJson: row.detected_document_types_json ?? '[]',
            tableStructureStatus: row.table_structure_status ?? '',
            tableStructureIssues: row.table_structure_issues ?? '',
            detectedHeaderRow: row.detected_header_row ?? 0,
            columnMapConfidence: row.column_map_confidence ?? 0,
            validatedColumnMap: row.validated_column_map ?? '',
            employeeCount: row.employee_count ?? null,
            employeeType: row.employee_type ?? '',
            employeeAsOfDate: row.employee_as_of_date ?? '',
            employeeConfidence: row.employee_confidence ?? null,
            employeeCitation: row.employee_citation ?? '',
            employeeEvidenceStatus: row.employee_evidence_status ?? '',
            financialFactsJson: row.financial_facts_json ?? '',
            reconciliationJson: row.reconciliation_json ?? '',
            mathCheckStatus: row.math_check_status ?? '',
            submissionBatchId: row.submission_batch_id ?? '',
            expectedBatchDocumentCount: row.expected_batch_document_count ?? 0,
            fileName: row.file_name ?? '',
            fileSize: row.file_size ?? 0,
            fileType: row.file_type ?? '',
            triggerTimestamp: row.trigger_timestamp ?? '',
            status: derivedStatus,
            environment: row.environment ?? '',
            receivedAt: row.received_at ?? '',
            processingStartedAt: row.processing_started_at ?? '',
            processedAt: row.processed_at ?? '',
            errorMessage: isCompleted ? '' : (row.error_message || (derivedStatus === 'failed' ? 'Document processing stalled or stopped (Anthropic API credit limit or n8n node failure).' : '')),
        riskLevel: row.risk_level ?? '',
        category: row.category ?? '',
        trafficLight: row.traffic_light ?? '',
        ebitdaExtracted: row.ebitda_extracted ?? '',
        extractedJson: row.extracted_json ?? '',
        storageFileId: row.storage_file_id ?? '',
        storageFileUrl: row.storage_file_url ?? '',
        needsHumanReview: row.needs_human_review ?? false,
        aiSummary: row.ai_summary ?? '',
        aiTargetValue: row.ai_target_value ?? '',
        aiVariance: row.ai_variance ?? '',
        aiEscalationReason: row.ai_escalation_reason ?? '',
        aiIntent: row.ai_intent ?? '',
        aiCitations: row.ai_citations ?? '',
        aiRedFlags: row.ai_red_flags ?? '',
        aiYellowFlags: row.ai_yellow_flags ?? '',
        aiGreenFlags: row.ai_green_flags ?? '',
        aiConfidence: row.ai_confidence ?? '',
        valuationLowerBound: row.valuation_lower_bound ?? '',
        valuationBaseEstimate: row.valuation_base_estimate ?? '',
        valuationUpperBound: row.valuation_upper_bound ?? '',
        valuationCurrency: row.valuation_currency ?? '',
        investmentIsFavorable: row.investment_is_favorable ?? null,
        investmentBuyReasoning: row.investment_buy_reasoning ?? '',
        isConsidered: row.is_considered !== false,
        inputTokens: Number(row.input_tokens ?? 0),
        outputTokens: Number(row.output_tokens ?? 0),
        totalTokens: Number(row.total_tokens ?? 0),
        costUsd: Number(row.cost_usd ?? 0),
        id: row.id ?? 0,
        createdAt: row.created_at ?? '',
        updatedAt: row.updated_at ?? '',
        }
    })
}
