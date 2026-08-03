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
    const hasUsableAnalysis = hasText(row.extracted_json) || hasText(row.financial_facts_json) || hasText(row.detected_document_type)
    const failedAfterRetries = String(row.ai_escalation_reason ?? '').trim().toLowerCase() === 'processing_failure'

    if (hasUsableAnalysis || (hasText(row.processed_at) && normalizedStatus !== 'failed' && normalizedStatus !== 'error')) {
        return 'completed'
    }

    const updatedAtMs = row.updated_at ? new Date(row.updated_at).getTime() : 0
    const createdAtMs = row.created_at ? new Date(row.created_at).getTime() : 0
    const lastActiveMs = Math.max(updatedAtMs, createdAtMs)
    const elapsedSeconds = lastActiveMs > 0 ? (Date.now() - lastActiveMs) / 1000 : 0

    if (activeSubmissionStatuses.has(normalizedStatus) && elapsedSeconds > 20 && !hasUsableAnalysis) {
        return 'failed'
    }

    const hasTerminalFailureMarkers = activeSubmissionStatuses.has(normalizedStatus)
        && hasText(row.processed_at)
        && (hasText(row.error_message) || failedAfterRetries)
        && !hasUsableAnalysis

    if (hasTerminalFailureMarkers) {
        return 'failed'
    }

    return rawStatus || 'unknown'
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

    return (rows as Array<Record<string, any>>).map((row) => ({
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
        status: deriveSubmissionStatus(row),
        environment: row.environment ?? '',
        receivedAt: row.received_at ?? '',
        processingStartedAt: row.processing_started_at ?? '',
        processedAt: row.processed_at ?? '',
        errorMessage: row.error_message || (deriveSubmissionStatus(row) === 'failed' ? 'Document processing stalled or stopped (Anthropic API credit limit or n8n node failure).' : ''),
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
        id: row.id ?? 0,
        createdAt: row.created_at ?? '',
        updatedAt: row.updated_at ?? '',
    }))
}
