#!/usr/bin/env tsx
/**
 * One-time migration: fetch all data from n8n webhooks and insert into Supabase.
 *
 * Usage:
 *   cd frontend && npx tsx ../scripts/migrate-n8n-to-supabase.ts
 *
 * Requires .env to have:
 *   N8N_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js'

// Load env
try { process.loadEnvFile() } catch { /* no .env — use shell env */ }

const N8N_BASE = 'https://merge-works.app.n8n.cloud/'
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET ?? ''
const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
})

async function fetchN8n<T>(path: string): Promise<T> {
    const headers: Record<string, string> = {}
    if (WEBHOOK_SECRET) headers['x-webhook-secret'] = WEBHOOK_SECRET
    const res = await fetch(new URL(path, N8N_BASE).toString(), { headers })
    if (!res.ok) throw new Error(`n8n ${path} returned ${res.status}`)
    return res.json() as Promise<T>
}

async function fetchDataTable<T>(tableId: string): Promise<T[]> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (WEBHOOK_SECRET) headers['x-webhook-secret'] = WEBHOOK_SECRET
    const url = new URL('webhook/migration-read-temp', N8N_BASE).toString()
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ tableId }) })
    if (!res.ok) throw new Error(`n8n data table ${tableId} returned ${res.status}`)
    const data = await res.json() as unknown
    return (Array.isArray(data) ? data : []) as T[]
}

function str(v: unknown): string { return typeof v === 'string' ? v : (v == null ? '' : String(v)) }
function num(v: unknown): number | null {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string') { const p = Number(v); return Number.isFinite(p) ? p : null }
    return null
}
function bool(v: unknown): boolean {
    if (typeof v === 'boolean') return v
    if (v === 'true' || v === '1' || v === 1) return true
    return false
}

// ---------- Documents (submission history) ----------
async function migrateDocuments() {
    console.log('Fetching documents from n8n data table...')
    const rows = await fetchDataTable<Record<string, unknown>>('rBFHVB1W7ldSiObM')

    console.log(`  Found ${rows.length} document rows`)
    if (rows.length === 0) return

    const mapped = rows.map(r => ({
        request_id: str(r.requestID) || crypto.randomUUID(),
        project_id: str(r.projectId),
        deal_name: str(r.dealName),
        company_name: str(r.companyName),
        workstream: str(r.workstream),
        submission_notes: str(r.submissionNotes ?? r.notes),
        analyst_name: str(r.analystName),
        analyst_email: str(r.analystEmail),
        project_stage: str(r.projectStage),
        document_type: str(r.documentType),
        detected_document_type: str(r.detectedDocumentType),
        detected_document_types_json: str(r.detectedDocumentTypesJson) || '[]',
        table_structure_status: str(r.tableStructureStatus),
        table_structure_issues: str(r.tableStructureIssues),
        detected_header_row: num(r.detectedHeaderRow) ?? 0,
        column_map_confidence: num(r.columnMapConfidence) ?? 0,
        validated_column_map: str(r.validatedColumnMap),
        employee_count: num(r.employeeCount),
        employee_type: str(r.employeeType),
        employee_as_of_date: str(r.employeeAsOfDate),
        employee_confidence: num(r.employeeConfidence),
        employee_citation: str(r.employeeCitation),
        employee_evidence_status: str(r.employeeEvidenceStatus),
        financial_facts_json: str(r.financialFactsJson),
        reconciliation_json: str(r.reconciliationJson),
        math_check_status: str(r.mathCheckStatus),
        submission_batch_id: str(r.submissionBatchId),
        expected_batch_document_count: num(r.expectedBatchDocumentCount) ?? 0,
        file_name: str(r.fileName),
        file_size: num(r.fileSize) ?? 0,
        file_type: str(r.fileType),
        trigger_timestamp: str(r.triggerTimestamp),
        status: str(r.status) || 'unknown',
        environment: str(r.environment) || 'production',
        received_at: str(r.receivedAt),
        processing_started_at: str(r.processingStartedAt),
        processed_at: str(r.processedAt ?? r.ai_processedAt),
        error_message: str(r.errorMessage ?? r.ai_errorMessage),
        risk_level: str(r.riskLevel ?? r.ai_riskLevel ?? r.ai_risk_flag),
        category: str(r.category ?? r.ai_category),
        traffic_light: str(r.trafficLight ?? r.ai_trafficLight),
        ebitda_extracted: str(r.ebitdaExtracted ?? r.ai_ebitdaExtracted),
        extracted_json: str(r.extractedJson ?? r.ai_extractedJson),
        storage_file_id: str(r.storageFileId ?? r.driveFileID),
        storage_file_url: str(r.storageFileUrl),
        needs_human_review: bool(r.needsHumanReview ?? r.humanReviewRequired ?? r.ai_needsHumanReview ?? r.ai_is_escalated),
        ai_summary: str(r.ai_summary),
        ai_target_value: str(r.ai_target_value),
        ai_variance: str(r.ai_variance),
        ai_escalation_reason: str(r.ai_escalation_reason),
        ai_intent: str(r.ai_intent),
        ai_citations: str(r.ai_citations),
        ai_red_flags: str(r.ai_red_flags),
        ai_yellow_flags: str(r.ai_yellow_flags),
        ai_green_flags: str(r.ai_green_flags),
        ai_confidence: str(r.ai_confidence),
        valuation_lower_bound: str(r.lower_bound_estimate),
        valuation_base_estimate: str(r.base_estimate),
        valuation_upper_bound: str(r.upper_bound_estimate),
        valuation_currency: str(r.currency),
        investment_is_favorable: r.is_favorable_indicator == null ? null : bool(r.is_favorable_indicator),
        investment_buy_reasoning: str(r.buy_reasoning),
        is_considered: (r as { isConsidered?: unknown }).isConsidered !== false,
    }))

    const deduped = new Map<string, typeof mapped[0]>()
    for (const row of mapped) deduped.set(row.request_id, row)
    const unique = [...deduped.values()]
    console.log(`  ${mapped.length - unique.length} duplicates removed, ${unique.length} unique documents`)

    for (let i = 0; i < unique.length; i += 50) {
        const batch = unique.slice(i, i + 50)
        const { error } = await supabase.from('documents').upsert(batch, { onConflict: 'request_id' })
        if (error) { console.error(`  documents batch ${i} error:`, error.message); return }
    }
    console.log(`  ✓ ${unique.length} documents migrated`)
}

// ---------- Project Syntheses ----------
async function migrateSyntheses() {
    console.log('Fetching project syntheses from n8n data table...')
    const list = await fetchDataTable<Record<string, unknown>>('DTrLU8hBUwYzmBig')

    const rows = list.filter(r => str(r.projectId ?? r.project_id).trim().length > 0)
    console.log(`  Found ${rows.length} synthesis rows`)
    if (rows.length === 0) return

    const mapped = rows.map(r => ({
        project_id: str(r.projectId ?? r.project_id),
        project_name: str(r.projectName ?? r.project_name ?? r.dealName ?? r.deal_name),
        company_name: str(r.companyName ?? r.company_name),
        project_status: str(r.projectStatus ?? r.project_status),
        documents_received_count: num(r.documentsReceivedCount ?? r.documents_received_count) ?? 0,
        documents_completed_count: num(r.documentsCompletedCount ?? r.documents_completed_count) ?? 0,
        missing_documents_json: typeof r.missingDocumentsJson === 'string' ? r.missingDocumentsJson
            : JSON.stringify(r.missingDocumentsJson ?? r.missing_documents ?? r.missingDocuments ?? []),
        cross_document_conflicts_json: typeof r.crossDocumentConflictsJson === 'string' ? r.crossDocumentConflictsJson
            : JSON.stringify(r.crossDocumentConflictsJson ?? r.cross_document_conflicts ?? r.crossDocumentConflicts ?? []),
        open_questions_json: typeof r.openQuestionsJson === 'string' ? r.openQuestionsJson
            : JSON.stringify(r.openQuestionsJson ?? r.open_questions ?? r.openQuestions ?? []),
        negotiation_levers_json: typeof r.negotiationLeversJson === 'string' ? r.negotiationLeversJson
            : JSON.stringify(r.negotiationLeversJson ?? r.negotiation_levers ?? r.negotiationLevers ?? []),
        final_judgment_json: typeof r.finalJudgmentJson === 'string' ? r.finalJudgmentJson
            : typeof r.finalJudgementJson === 'string' ? r.finalJudgementJson
            : JSON.stringify(r.finalJudgmentJson ?? r.finalJudgementJson ?? r.final_judgment ?? r.finalJudgment ?? ''),
        final_recommendation: str(r.finalRecommendation ?? r.final_recommendation),
        final_risk_level: str(r.finalRiskLevel ?? r.final_risk_level ?? r.ai_risk_flag),
        final_traffic_light: str(r.finalTrafficLight ?? r.final_traffic_light),
        ai_error_message: str(r.ai_error_message),
        ai_confidence: str(r.ai_confidence ?? r.aiConfidence),
        ai_citations: typeof r.aiCitations === 'string' ? r.aiCitations
            : typeof r.ai_citations === 'string' ? r.ai_citations : JSON.stringify(r.aiCitations ?? r.ai_citations ?? ''),
        valuation_lower_bound: str(r.valuationLowerBound ?? r.lower_bound_estimate),
        valuation_base_estimate: str(r.valuationBaseEstimate ?? r.base_estimate),
        valuation_upper_bound: str(r.valuationUpperBound ?? r.upper_bound_estimate),
        valuation_currency: str(r.valuationCurrency ?? r.currency),
        project_processed_at: str(r.projectProcessedAt ?? r.project_processed_at ?? r.ai_processedAt ?? r.updatedAt),
    }))

    for (let i = 0; i < mapped.length; i += 50) {
        const batch = mapped.slice(i, i + 50)
        const { error } = await supabase.from('project_syntheses').upsert(batch, { onConflict: 'project_id' })
        if (error) { console.error(`  syntheses batch ${i} error:`, error.message); return }
    }
    console.log(`  ✓ ${mapped.length} syntheses migrated`)
}

// ---------- Deal Models ----------
async function migrateDealModels() {
    console.log('Fetching deal models from n8n data table...')
    const rows = await fetchDataTable<Record<string, unknown>>('eU2nnH4bVmdPocI8')
    console.log(`  Found ${rows.length} deal model rows`)
    if (rows.length === 0) return

    const mapped = rows.map(r => ({
        project_id: str(r.projectId),
        asking_price: num(r.askingPrice),
        purchase_price: num(r.purchasePrice),
        debt_assumed: num(r.debtAssumed),
        cash_acquired: num(r.cashAcquired),
        working_capital_requirement: num(r.workingCapitalRequirement),
        transaction_fees: num(r.transactionFees),
        hold_period_years: num(r.holdPeriodYears),
        tax_rate: num(r.taxRate),
        closing_costs: num(r.closingCosts),
        maintenance_capex: num(r.maintenanceCapex),
        exit_multiple: num(r.exitMultiple),
        exit_costs: num(r.exitCosts),
        equity_contribution_percent: num(r.equityContributionPercent),
        interest_rate: num(r.interestRate),
        amortization_years: num(r.amortizationYears),
        seller_note_amount: num(r.sellerNoteAmount),
        bear_revenue_growth: num(r.bearRevenueGrowth),
        base_revenue_growth: num(r.baseRevenueGrowth),
        bull_revenue_growth: num(r.bullRevenueGrowth),
        bear_ebitda_margin: num(r.bearEbitdaMargin),
        base_ebitda_margin: num(r.baseEbitdaMargin),
        bull_ebitda_margin: num(r.bullEbitdaMargin),
        bear_exit_multiple: num(r.bearExitMultiple),
        base_exit_multiple: num(r.baseExitMultiple),
        bull_exit_multiple: num(r.bullExitMultiple),
        revenue_multiple: num(r.revenueMultiple),
        ebitda_multiple: num(r.ebitdaMultiple),
        asset_haircut_percent: num(r.assetHaircutPercent),
        documented_facts_json: str(r.documentedFactsJson),
        documented_facts_status: str(r.documentedFactsStatus),
        model_updated_at: str(r.modelUpdatedAt),
        model_updated_by: str(r.modelUpdatedBy),
    }))

    for (let i = 0; i < mapped.length; i += 50) {
        const batch = mapped.slice(i, i + 50)
        const { error } = await supabase.from('deal_models').upsert(batch, { onConflict: 'project_id' })
        if (error) { console.error(`  deal_models batch ${i} error:`, error.message); return }
    }
    console.log(`  ✓ ${mapped.length} deal models migrated`)
}

// ---------- Workflow Errors ----------
async function migrateWorkflowErrors() {
    console.log('Fetching workflow errors from n8n data table...')
    const rows = await fetchDataTable<Record<string, unknown>>('aSPSRYm0ScfGsV0b')
    console.log(`  Found ${rows.length} error rows`)
    if (rows.length === 0) return

    const mapped = rows.map(r => ({
        workflow_id: str(r.workflowId),
        workflow_name: str(r.workflowName),
        execution_id: str(r.executionId),
        failed_node: str(r.failedNode),
        error_message: str(r.errorMessage),
        last_node_executed: str(r.lastNodeExecuted),
        severity: str(r.severity) || 'uncaught',
        occurred_at: str(r.occurredAt),
    }))

    for (let i = 0; i < mapped.length; i += 50) {
        const batch = mapped.slice(i, i + 50)
        const { error } = await supabase.from('workflow_errors').insert(batch)
        if (error) { console.error(`  workflow_errors batch ${i} error:`, error.message); return }
    }
    console.log(`  ✓ ${mapped.length} workflow errors migrated`)
}

// ---------- Run all ----------
async function main() {
    console.log('=== n8n → Supabase migration ===\n')
    await migrateDocuments()
    await migrateSyntheses()
    await migrateDealModels()
    await migrateWorkflowErrors()
    console.log('\n=== Migration complete ===')
    console.log('Verify in Supabase Dashboard → Table Editor that row counts match.')
}

main().catch(err => { console.error(err); process.exit(1) })
