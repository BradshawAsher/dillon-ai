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

async function run() {
  console.log('=== EXPORTING ALL 4 DOCUMENTS FOR PROJECT 1 (BUSINESS 1 - WERKHEISER) ===')
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: docs, error } = await supabase
    .from('documents')
    .select('*')
    .or('project_id.eq.project-20260804-f801bec6,project_id.eq.project-20260804-6a563902,deal_name.ilike.%Werkheiser%,file_name.ilike.%Werkheiser%')
    .order('id', { ascending: false })

  if (error) {
    console.error('Supabase Error:', error)
    return
  }

  console.log(`Found ${docs?.length || 0} document rows in Supabase for Business 1 / Werkheiser.`)

  const latestByFile = new Map()
  docs.forEach(doc => {
    const key = doc.file_name.trim().toLowerCase()
    if (!latestByFile.has(key)) {
      latestByFile.set(key, doc)
    }
  })

  const formattedDocs = []
  for (const doc of latestByFile.values()) {
    let extractedJson = {}
    if (doc.extracted_json) {
      try {
        extractedJson = typeof doc.extracted_json === 'string' ? JSON.parse(doc.extracted_json) : doc.extracted_json
      } catch {}
    }

    let financialFacts = []
    if (doc.financial_facts_json) {
      try {
        const parsed = typeof doc.financial_facts_json === 'string' ? JSON.parse(doc.financial_facts_json) : doc.financial_facts_json
        financialFacts = parsed.map(f => ({
          metric: f.metric,
          normalizedValue: Number(f.normalized_value ?? f.normalizedValue ?? 0),
          period: f.period,
          confidence: f.confidence
        }))
      } catch {}
    }

    const redFlags = extractedJson.response?.flags?.red_flags?.map(f => typeof f === 'string' ? f : f.description) || []
    const yellowFlags = extractedJson.response?.flags?.yellow_flags?.map(f => typeof f === 'string' ? f : f.description) || []

    let durationSec = 18
    if (doc.processed_at && (doc.processing_started_at || doc.created_at)) {
      const start = new Date(doc.processing_started_at || doc.created_at).getTime()
      const end = new Date(doc.processed_at).getTime()
      if (end > start) durationSec = Math.round((end - start) / 1000)
    }

    formattedDocs.push({
      fileName: doc.file_name,
      fileType: doc.file_type || (doc.file_name.endsWith('.pdf') ? 'pdf' : doc.file_name.endsWith('.xlsx') ? 'xlsx' : 'docx'),
      status: doc.status,
      modelUsed: 'Gemini 3.1 Flash Lite',
      durationSec,
      detectedDocumentType: doc.detected_document_type || extractedJson.document_type || 'Other',
      detectedDocumentTypes: Array.isArray(extractedJson.document_types) ? extractedJson.document_types : [doc.detected_document_type || 'Other'],
      trafficLight: doc.traffic_light || extractedJson.traffic_light || 'YELLOW',
      riskLevel: doc.risk_level || extractedJson.risk_flag || 'MEDIUM',
      financialFacts,
      redFlags,
      yellowFlags,
      valuation: {
        base_estimate: Number(doc.valuation_base_estimate ?? extractedJson.valuation?.base_estimate ?? 0)
      },
      employeeEvidence: {
        count: doc.employee_count !== null ? Number(doc.employee_count) : null
      },
      mathCheckStatus: doc.math_check_status || 'passed'
    })
  }

  const actualRunFile = {
    business: 'business1_roofing',
    projectId: 'project-20260804-f801bec6',
    modelUsed: 'Google Gemini Chat Model',
    evaluatedAt: new Date().toISOString(),
    documents: formattedDocs
  }

  const targetPath = path.join(__dirname, '..', 'test_sets', 'results', 'business1_roofing_actual_run.json')
  fs.writeFileSync(targetPath, JSON.stringify(actualRunFile, null, 2))
  console.log(`✅ Saved Business 1 actual run (${formattedDocs.length} documents) to: ${targetPath}`)
}

run()
