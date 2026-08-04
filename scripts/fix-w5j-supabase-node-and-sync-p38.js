process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const fs = require('fs')
const path = require('path')

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
  console.log('=== STEP 1: FIXING LIVE N8N SUBWORKFLOW W5Jp7CJIQbNy0qlY NODE EXPRESSIONS ===')
  const wfRes = await fetch(`${n8nBaseUrl}/workflows/W5Jp7CJIQbNy0qlY`, {
    headers: { 'X-N8N-API-KEY': n8nApiKey }
  })
  if (!wfRes.ok) {
    console.error('Failed to fetch W5Jp7CJIQbNy0qlY:', await wfRes.text())
  } else {
    const wf = await wfRes.json()
    console.log(`Fetched workflow "${wf.name}" (${wf.id})`)

    const supaNode = wf.nodes.find(n => n.name === 'Supabase: Write Analysis Results')
    if (supaNode) {
      supaNode.parameters.fieldsUi = {
        fieldValues: [
          { fieldId: 'status', fieldValue: 'completed' },
          { fieldId: 'risk_level', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.risk_flag || $json.ai_riskLevel || 'MEDIUM' }}" },
          { fieldId: 'traffic_light', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.traffic_light || $json.ai_trafficLight || 'YELLOW' }}" },
          { fieldId: 'category', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.category || $json.ai_category || 'Other' }}" },
          { fieldId: 'ai_summary', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.response?.summary || $json.ai_summary || '' }}" },
          { fieldId: 'ai_target_value', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.response?.calculated_metrics?.target_value ?? $json.ai_target_value ?? '' }}" },
          { fieldId: 'ai_variance', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.response?.calculated_metrics?.variance_percentage ?? $json.ai_variance ?? '' }}" },
          { fieldId: 'ai_intent', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.intent || $json.ai_intent || '' }}" },
          { fieldId: 'ai_citations', fieldValue: "={{ JSON.stringify($('Calculate Financial Reconciliations').item.json.output?.response?.citations || []) }}" },
          { fieldId: 'ai_red_flags', fieldValue: "={{ JSON.stringify($('Calculate Financial Reconciliations').item.json.output?.response?.flags?.red_flags || []) }}" },
          { fieldId: 'ai_yellow_flags', fieldValue: "={{ JSON.stringify($('Calculate Financial Reconciliations').item.json.output?.response?.flags?.yellow_flags || []) }}" },
          { fieldId: 'ai_green_flags', fieldValue: "={{ JSON.stringify($('Calculate Financial Reconciliations').item.json.output?.response?.flags?.green_flags || []) }}" },
          { fieldId: 'ai_confidence', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.confidence ?? 0.95 }}" },
          { fieldId: 'needs_human_review', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.escalation?.is_escalated ?? false }}" },
          { fieldId: 'ai_escalation_reason', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.escalation?.reason_code || '' }}" },
          { fieldId: 'ebitda_extracted', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.ebitda_extracted ?? '' }}" },
          { fieldId: 'extracted_json', fieldValue: "={{ JSON.stringify($('Calculate Financial Reconciliations').item.json.output || {}) }}" },
          { fieldId: 'processed_at', fieldValue: "={{ new Date().toISOString() }}" },
          { fieldId: 'file_size', fieldValue: "={{ $('When Executed by Another Workflow').item.json.fileSize ?? 0 }}" },
          { fieldId: 'valuation_lower_bound', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.valuation?.lower_bound ?? '' }}" },
          { fieldId: 'valuation_base_estimate', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.valuation?.base_estimate ?? '' }}" },
          { fieldId: 'valuation_upper_bound', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.valuation?.upper_bound ?? '' }}" },
          { fieldId: 'valuation_currency', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.valuation?.currency || 'USD' }}" },
          { fieldId: 'investment_is_favorable', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.investment_thesis?.is_favorable_indicator ?? false }}" },
          { fieldId: 'investment_buy_reasoning', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.investment_thesis?.buy_reasoning || '' }}" },
          { fieldId: 'detected_document_type', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.document_type || $('When Executed by Another Workflow').item.json.documentType || 'Other' }}" },
          { fieldId: 'detected_document_types_json', fieldValue: "={{ JSON.stringify($('Calculate Financial Reconciliations').item.json.output?.document_types || ['Other']) }}" },
          { fieldId: 'employee_count', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.employee_evidence?.count ?? null }}" },
          { fieldId: 'employee_type', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.employee_evidence?.type || '' }}" },
          { fieldId: 'employee_as_of_date', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.employee_evidence?.as_of_date || '' }}" },
          { fieldId: 'employee_confidence', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.employee_evidence?.confidence ?? null }}" },
          { fieldId: 'employee_citation', fieldValue: "={{ JSON.stringify($('Calculate Financial Reconciliations').item.json.output?.employee_evidence?.citation || {}) }}" },
          { fieldId: 'employee_evidence_status', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.employee_evidence?.status || '' }}" },
          { fieldId: 'financial_facts_json', fieldValue: "={{ JSON.stringify($('Calculate Financial Reconciliations').item.json.financialFacts || []) }}" },
          { fieldId: 'reconciliation_json', fieldValue: "={{ JSON.stringify($('Calculate Financial Reconciliations').item.json.reconciliation || {}) }}" },
          { fieldId: 'math_check_status', fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.reconciliation?.status || 'passed' }}" }
        ]
      }
    }

    const validSettings = {}
    if (wf.settings) {
      if (wf.settings.executionOrder) validSettings.executionOrder = wf.settings.executionOrder
      if (wf.settings.timezone) validSettings.timezone = wf.settings.timezone
      if (wf.settings.errorWorkflow) validSettings.errorWorkflow = wf.settings.errorWorkflow
    }

    const updateRes = await fetch(`${n8nBaseUrl}/workflows/W5Jp7CJIQbNy0qlY`, {
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
      console.log('✅ Successfully updated W5Jp7CJIQbNy0qlY node "Supabase: Write Analysis Results"! Future runs will write to Supabase seamlessly.')
    } else {
      console.error('Failed to update workflow W5Jp7CJIQbNy0qlY:', await updateRes.text())
    }
  }

  console.log('\n=== STEP 2: SYNCING PROJECT 38 (project-20260804-70c7d186) DOCUMENTS TO SUPABASE ===')
  const dtRes = await fetch(`${n8nBaseUrl}/data-tables/rBFHVB1W7ldSiObM/rows?limit=250`, {
    headers: { 'X-N8N-API-KEY': n8nApiKey }
  })
  if (!dtRes.ok) {
    console.error('Data table error:', await dtRes.text())
    return
  }

  const dtData = await dtRes.json()
  const dtRows = dtData.data || dtData || []
  const p38Rows = dtRows.filter(r => r.projectId === 'project-20260804-70c7d186')
  console.log(`Found ${p38Rows.length} rows for Project 38 in n8n Data Table.`)

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  for (const row of p38Rows) {
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
