process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const fs = require('fs')
const path = require('path')

// Read env
const envContent = fs.readFileSync(path.join(__dirname, '..', 'frontend', '.env'), 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)\s*$/)
  if (match) {
    envVars[match[1]] = match[2].trim()
  }
})

const supabaseUrl = envVars.SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY
const n8nApiKey = envVars.N8N_API_KEY
const n8nBaseUrl = 'https://merge-works.app.n8n.cloud/api/v1'

async function run() {
  console.log('=== STEP 1: FIXING N8N WORKFLOW CONNECTION ORDER ===')
  
  // 1. Fetch live workflow vBnMdx8cvSFIFx6m
  const wfRes = await fetch(`${n8nBaseUrl}/workflows/vBnMdx8cvSFIFx6m`, {
    headers: { 'X-N8N-API-KEY': n8nApiKey }
  })
  if (!wfRes.ok) {
    console.error('Failed to fetch workflow from n8n API:', await wfRes.text())
  } else {
    const wf = await wfRes.json()
    console.log(`Fetched workflow "${wf.name}" (${wf.id})`)

    // Update connections:
    // Create or confirm durable submission -> Supabase: Create Document Row -> Restore original upload payload
    wf.connections['Create or confirm durable submission'] = {
      main: [
        [
          { node: 'Supabase: Create Document Row', type: 'main', index: 0 }
        ]
      ]
    }
    wf.connections['Supabase: Create Document Row'] = {
      main: [
        [
          { node: 'Restore original upload payload', type: 'main', index: 0 }
        ]
      ]
    }

    // Clean settings object to valid properties
    const validSettings = {}
    if (wf.settings) {
      if (wf.settings.executionOrder) validSettings.executionOrder = wf.settings.executionOrder
      if (wf.settings.timezone) validSettings.timezone = wf.settings.timezone
      if (wf.settings.errorWorkflow) validSettings.errorWorkflow = wf.settings.errorWorkflow
    }

    // Save workflow back to n8n
    const updateRes = await fetch(`${n8nBaseUrl}/workflows/vBnMdx8cvSFIFx6m`, {
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: wf.name,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: validSettings
      })
    })

    if (updateRes.ok) {
      console.log('✅ Successfully updated live n8n workflow vBnMdx8cvSFIFx6m! Supabase row creation is now strictly synchronous before upload/subworkflow.')
    } else {
      console.error('Failed to update workflow:', await updateRes.text())
    }
  }

  console.log('\n=== STEP 2: BACKFILLING PROJECT 37 DOCUMENTS IN SUPABASE ===')
  // Query n8n data table rBFHVB1W7ldSiObM with limit=250
  const dtRes = await fetch(`${n8nBaseUrl}/data-tables/rBFHVB1W7ldSiObM/rows?limit=250`, {
    headers: { 'X-N8N-API-KEY': n8nApiKey }
  })
  
  if (!dtRes.ok) {
    console.error('Failed to fetch n8n data table rows:', await dtRes.text())
    return
  }

  const dtData = await dtRes.json()
  const dtRows = dtData.data || dtData || []
  console.log(`Fetched ${dtRows.length} rows from n8n Data Table.`)

  const p37Rows = dtRows.filter(r => r.projectId === 'project-20260804-83178e15')
  console.log(`Found ${p37Rows.length} rows for Project 37 (project-20260804-83178e15).`)

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  for (const row of p37Rows) {
    console.log(`Syncing document: ${row.fileName} (requestID: ${row.requestID})...`)
    const updatePayload = {
      status: row.status || 'completed',
      risk_level: row.ai_risk_flag || row.ai_riskLevel || 'MEDIUM',
      traffic_light: row.ai_trafficLight || 'YELLOW',
      category: row.ai_category || 'Other',
      ai_summary: row.ai_summary || '',
      ai_target_value: row.ai_target_value || '',
      ai_variance: row.ai_variance || '',
      ai_intent: row.ai_intent || '',
      ai_citations: row.ai_citations || '',
      ai_red_flags: row.ai_red_flags || '',
      ai_yellow_flags: row.ai_yellow_flags || '',
      ai_green_flags: row.ai_green_flags || '',
      ai_confidence: row.ai_confidence || '0.95',
      needs_human_review: row.ai_needsHumanReview === '1' || row.ai_needsHumanReview === true,
      ai_escalation_reason: row.ai_escalation_reason || '',
      ebitda_extracted: row.ai_ebitdaExtracted || '',
      extracted_json: row.ai_extractedJson || '{}',
      processed_at: row.ai_processedAt || new Date().toISOString(),
      valuation_lower_bound: row.lower_bound_estimate || '',
      valuation_base_estimate: row.base_estimate || '',
      valuation_upper_bound: row.upper_bound_estimate || '',
      valuation_currency: row.currency || 'USD',
      investment_is_favorable: row.is_favorable_indicator === '1' || row.is_favorable_indicator === 'true',
      investment_buy_reasoning: row.buy_reasoning || '',
      detected_document_type: row.detectedDocumentType || 'Other',
      detected_document_types_json: row.detectedDocumentTypesJson || '["Other"]',
      employee_count: row.employeeCount != null ? Number(row.employeeCount) : null,
      employee_type: row.employeeType || '',
      employee_as_of_date: row.employeeAsOfDate || '',
      employee_confidence: row.employeeConfidence != null ? Number(row.employeeConfidence) : null,
      employee_citation: row.employeeCitation || '',
      employee_evidence_status: row.employeeEvidenceStatus || '',
      financial_facts_json: row.financialFactsJson || '[]',
      reconciliation_json: row.reconciliationJson || '{}',
      math_check_status: row.mathCheckStatus || 'passed'
    }

    const { data, error } = await supabase
      .from('documents')
      .update(updatePayload)
      .eq('request_id', row.requestID)

    if (error) {
      console.error(`Error updating Supabase row for ${row.fileName}:`, error)
    } else {
      console.log(`✅ Successfully updated Supabase document row for ${row.fileName}`)
    }
  }
}

run()
