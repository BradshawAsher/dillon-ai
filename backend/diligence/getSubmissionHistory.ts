import { supabase } from '../supabaseClient'

type Params = {
    environment?: 'production' | 'test'
    projectId?: string
    limit?: number | string
    full?: boolean | string
}

const STORAGE_CDN_URL = (process.env.VITE_STORAGE_CDN_URL || process.env.STORAGE_CDN_URL || 'https://dillon-ai-worker.bradshin231.workers.dev').replace(/\/+$/, '')
const SUPABASE_STORAGE_ORIGIN = 'https://sihpsqrunkwkxhhnwoqe.supabase.co'

function resolveStorageCdnUrl(url: string | undefined | null): string {
    if (!url || typeof url !== 'string') return ''
    if (url.startsWith(SUPABASE_STORAGE_ORIGIN)) {
        return url.replace(SUPABASE_STORAGE_ORIGIN, STORAGE_CDN_URL)
    }
    return url
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
    const perDocTimeoutSeconds = Math.max(600, batchCount * 300)

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
                    model_used: match.modelUsed || match.model_used || '',
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

function unpackExtractedFallback(row: Record<string, any>) {
    let parsed: any = null
    if (row.extracted_json && typeof row.extracted_json === 'string') {
        try {
            parsed = JSON.parse(row.extracted_json)
        } catch {}
    } else if (row.extracted_json && typeof row.extracted_json === 'object') {
        parsed = row.extracted_json
    }

    if (!parsed) return {}

    const res = parsed.response || parsed.output?.response || parsed
    const flags = res.flags || parsed.flags || {}
    const redFlags = Array.isArray(flags.red_flags) ? flags.red_flags : []
    const yellowFlags = Array.isArray(flags.yellow_flags) ? flags.yellow_flags : []
    const greenFlags = Array.isArray(flags.green_flags) ? flags.green_flags : []
    const summary = typeof res.summary === 'string' ? res.summary : (typeof parsed.summary === 'string' ? parsed.summary : '')
    const riskLevel = parsed.risk_flag || parsed.riskLevel || parsed.risk_level || ''
    const trafficLight = parsed.traffic_light || parsed.trafficLight || ''
    const category = parsed.category || parsed.output?.category || parsed.document_type || parsed.output?.document_type || (Array.isArray(parsed.document_types) ? parsed.document_types[0] : '') || ''
    const companyName = parsed.company_name || parsed.output?.company_name || res.company_name || ''
    const confidence = parsed.global_confidence ?? parsed.ai_confidence ?? parsed.output?.global_confidence ?? null

    return {
        summary,
        redFlags: redFlags.length > 0 ? JSON.stringify(redFlags) : '',
        yellowFlags: yellowFlags.length > 0 ? JSON.stringify(yellowFlags) : '',
        greenFlags: greenFlags.length > 0 ? JSON.stringify(greenFlags) : '',
        riskLevel,
        trafficLight,
        category,
        companyName,
        confidence,
    }
}

export default async function getSubmissionHistory(req: {
    params: Params
    user: User
}) {
    const environment = req.params.environment === 'test' ? 'test' : 'production'
    const isScopedProject = Boolean(req.params.projectId && req.params.projectId.trim().length > 0)
    const isFull = req.params.full === true || req.params.full === 'true' || isScopedProject

    const defaultLimit = isScopedProject ? 100 : 100
    const limitNum = typeof req.params.limit === 'number'
        ? req.params.limit
        : typeof req.params.limit === 'string' && parseInt(req.params.limit, 10) > 0
            ? parseInt(req.params.limit, 10)
            : defaultLimit

    const fullColumns = `
        id, request_id, deal_name, company_name, workstream, submission_notes,
        analyst_name, analyst_email, project_id, project_stage, document_type,
        detected_document_type, detected_document_types_json, table_structure_status,
        table_structure_issues, detected_header_row, column_map_confidence, validated_column_map,
        employee_count, employee_type, employee_as_of_date, employee_confidence, employee_citation,
        employee_evidence_status, financial_facts_json, reconciliation_json, math_check_status,
        submission_batch_id, expected_batch_document_count, file_name, file_size, file_type,
        trigger_timestamp, status, environment, received_at, processing_started_at, processed_at,
        error_message, risk_level, category, traffic_light, ebitda_extracted, extracted_json,
        storage_file_id, storage_file_url, needs_human_review, ai_summary, ai_target_value,
        ai_variance, ai_escalation_reason, ai_intent, ai_citations, ai_red_flags,
        ai_yellow_flags, ai_green_flags, ai_confidence, valuation_lower_bound,
        valuation_base_estimate, valuation_upper_bound, valuation_currency, valuation_confidence,
        investment_is_favorable, investment_buy_reasoning, investment_confidence, is_considered,
        input_tokens, output_tokens, total_tokens, cost_usd, model_used, created_at, updated_at
    `

    const lightweightColumns = `
        id, request_id, deal_name, company_name, workstream, submission_notes,
        analyst_name, analyst_email, project_id, project_stage, document_type,
        detected_document_type, table_structure_status, math_check_status,
        submission_batch_id, expected_batch_document_count, file_name, file_size, file_type,
        trigger_timestamp, status, environment, received_at, processing_started_at, processed_at,
        error_message, risk_level, category, traffic_light, ebitda_extracted,
        storage_file_id, storage_file_url, needs_human_review, ai_summary, ai_target_value,
        ai_variance, ai_escalation_reason, ai_confidence, valuation_lower_bound,
        valuation_base_estimate, valuation_upper_bound, valuation_currency, valuation_confidence,
        investment_is_favorable, investment_confidence, is_considered,
        input_tokens, output_tokens, total_tokens, cost_usd, model_used, created_at, updated_at
    `

    let query = (supabase.from('documents') as any)
        .select(isFull ? fullColumns : lightweightColumns)
        .eq('environment', environment)

    if (req.params.projectId && req.params.projectId.trim().length > 0) {
        query = query.eq('project_id', req.params.projectId.trim())
    }

    const { data: rows, error } = await query
        .order('updated_at', { ascending: false })
        .limit(limitNum)

    if (error) throw new Error(`Supabase read failed: ${error.message}`)
    if (!rows) return []

    await syncPendingRowsFromN8nDataTable(rows)

    return (rows as Array<Record<string, any>>).map((row) => {
        const derivedStatus = deriveSubmissionStatus(row)
        const isCompleted = derivedStatus === 'completed'
        const fallback = unpackExtractedFallback(row)
        const resolvedSummary = hasText(row.ai_summary) ? row.ai_summary : (fallback.summary || '')
        const resolvedRedFlags = hasText(row.ai_red_flags) && row.ai_red_flags !== '[]' ? row.ai_red_flags : (fallback.redFlags || row.ai_red_flags || '[]')
        const resolvedYellowFlags = hasText(row.ai_yellow_flags) && row.ai_yellow_flags !== '[]' ? row.ai_yellow_flags : (fallback.yellowFlags || row.ai_yellow_flags || '[]')
        const resolvedGreenFlags = hasText(row.ai_green_flags) && row.ai_green_flags !== '[]' ? row.ai_green_flags : (fallback.greenFlags || row.ai_green_flags || '[]')
        const resolvedRiskLevel = hasText(row.risk_level) ? row.risk_level : (fallback.riskLevel || '')
        const resolvedTrafficLight = hasText(row.traffic_light) ? row.traffic_light : (fallback.trafficLight || '')

        const rawDetectedType = (row.detected_document_type || '').trim()
        const isGenericType = !rawDetectedType || ['auto-detect', 'not detected', 'other', 'unknown'].includes(rawDetectedType.toLowerCase())
        const resolvedDetectedType = !isGenericType
            ? rawDetectedType
            : (hasText(fallback.category) && !['auto-detect', 'not detected', 'other'].includes(fallback.category.toLowerCase())
                ? fallback.category
                : (hasText(row.category) && !['auto-detect', 'not detected', 'other'].includes(row.category.toLowerCase())
                    ? row.category
                    : (hasText(row.document_type) && !['auto-detect', 'not detected'].includes(row.document_type.toLowerCase())
                        ? row.document_type
                        : (rawDetectedType || fallback.category || row.category || 'Other'))))

        const resolvedCompanyName = hasText(row.company_name) ? row.company_name : (fallback.companyName || row.deal_name || '')

        const resolvedConfidence = row.ai_confidence !== null && row.ai_confidence !== undefined && row.ai_confidence !== ''
            ? row.ai_confidence
            : (fallback.confidence !== null && fallback.confidence !== undefined
                ? fallback.confidence
                : '')

        return {
            requestID: row.request_id ?? '',
            dealName: row.deal_name ?? '',
            companyName: resolvedCompanyName,
            workstream: row.workstream ?? '',
            submissionNotes: row.submission_notes ?? '',
            analystName: row.analyst_name ?? '',
            analystEmail: row.analyst_email ?? '',
            projectId: row.project_id ?? '',
            projectStage: row.project_stage ?? '',
            documentType: row.document_type ?? '',
            detectedDocumentType: resolvedDetectedType,
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
            riskLevel: resolvedRiskLevel,
            category: row.category ?? '',
            trafficLight: resolvedTrafficLight,
            ebitdaExtracted: row.ebitda_extracted ?? '',
            extractedJson: row.extracted_json ?? '',
            storageFileId: row.storage_file_id ?? '',
            storageFileUrl: resolveStorageCdnUrl(row.storage_file_url),
            needsHumanReview: row.needs_human_review ?? false,
            aiSummary: resolvedSummary,
            aiTargetValue: row.ai_target_value ?? '',
            aiVariance: row.ai_variance ?? '',
            aiEscalationReason: row.ai_escalation_reason ?? '',
            aiIntent: row.ai_intent ?? '',
            aiCitations: row.ai_citations ?? '',
            aiRedFlags: resolvedRedFlags,
            aiYellowFlags: resolvedYellowFlags,
            aiGreenFlags: resolvedGreenFlags,
            aiConfidence: resolvedConfidence,
            valuationLowerBound: row.valuation_lower_bound ?? '',
            valuationBaseEstimate: row.valuation_base_estimate ?? '',
            valuationUpperBound: row.valuation_upper_bound ?? '',
            valuationCurrency: row.valuation_currency ?? '',
            valuationConfidence: row.valuation_confidence ?? null,
            investmentIsFavorable: row.investment_is_favorable ?? null,
            investmentBuyReasoning: row.investment_buy_reasoning ?? '',
            investmentConfidence: row.investment_confidence ?? null,
            isConsidered: row.is_considered !== false,
            inputTokens: Number(row.input_tokens ?? 0),
            outputTokens: Number(row.output_tokens ?? 0),
            totalTokens: Number(row.total_tokens ?? 0),
            costUsd: Number(row.cost_usd ?? 0),
            modelUsed: row.model_used ?? '',
            model_used: row.model_used ?? '',
            id: row.id ?? 0,
            createdAt: row.created_at ?? '',
            updatedAt: row.updated_at ?? '',
        }
    })
}
