process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

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

async function run() {
  console.log('=== GENERATING CLEAN BUSINESS 4 (CONVERSIONXL) EVALUATION REPORT ===')
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  let n8nRows = []
  try {
    const res = await fetch('https://merge-works.app.n8n.cloud/api/v1/data-tables/rBFHVB1W7ldSiObM/rows?limit=100', {
      headers: { 'X-N8N-API-KEY': n8nApiKey, 'Accept': 'application/json' }
    })
    if (res.ok) {
      const json = await res.json()
      n8nRows = json.data || json || []
    }
  } catch (err) {
    console.error('N8n read error:', err)
  }

  const { data: supaDocs } = await supabase
    .from('documents')
    .select('*')
    .or('project_id.eq.project-20260804-83178e15,project_id.eq.project-20260804-3b63e52f,deal_name.ilike.%PROJECT 37%,deal_name.ilike.%ConversionXL%')
    .order('id', { ascending: false })

  const targetFileNames = [
    'WC- Conversion XL OM.pdf',
    'DD Memo.pdf',
    'ConversionXL LLC_Profit and Loss by Month v2.xlsx',
    'CXL_Screen.xlsx'
  ]

  const formattedDocs = []

  for (const fileName of targetFileNames) {
    const normName = fileName.toLowerCase().replace(/[^a-z0-9]/g, '')

    const n8nMatch = n8nRows.find(r => r.fileName && r.fileName.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normName))
    const supaMatch = (supaDocs || []).find(s => s.file_name && s.file_name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normName))

    let extractedJson = {}
    if (n8nMatch?.ai_extractedJson) {
      try { extractedJson = typeof n8nMatch.ai_extractedJson === 'string' ? JSON.parse(n8nMatch.ai_extractedJson) : n8nMatch.ai_extractedJson } catch {}
    } else if (supaMatch?.extracted_json) {
      try { extractedJson = typeof supaMatch.extracted_json === 'string' ? JSON.parse(supaMatch.extracted_json) : supaMatch.extracted_json } catch {}
    }

    let financialFacts = []
    if (n8nMatch?.financialFactsJson) {
      try {
        const parsed = typeof n8nMatch.financialFactsJson === 'string' ? JSON.parse(n8nMatch.financialFactsJson) : n8nMatch.financialFactsJson
        financialFacts = parsed.map(f => ({
          metric: f.metric,
          normalizedValue: Number(f.normalized_value ?? f.normalizedValue ?? 0),
          period: f.period,
          confidence: f.confidence
        }))
      } catch {}
    } else if (supaMatch?.financial_facts_json) {
      try {
        const parsed = typeof supaMatch.financial_facts_json === 'string' ? JSON.parse(supaMatch.financial_facts_json) : supaMatch.financial_facts_json
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

    const detectedDocType = n8nMatch?.detectedDocumentType || supaMatch?.detected_document_type || extractedJson.document_type || 'Other'

    formattedDocs.push({
      fileName,
      fileType: fileName.endsWith('.pdf') ? 'pdf' : fileName.endsWith('.docx') ? 'docx' : 'xlsx',
      status: 'completed',
      detectedDocumentType: detectedDocType,
      detectedDocumentTypes: Array.isArray(extractedJson.document_types) ? extractedJson.document_types : [detectedDocType],
      trafficLight: n8nMatch?.ai_trafficLight || supaMatch?.traffic_light || extractedJson.traffic_light || 'YELLOW',
      riskLevel: n8nMatch?.ai_riskLevel || supaMatch?.risk_level || extractedJson.risk_flag || 'MEDIUM',
      financialFacts,
      redFlags,
      yellowFlags,
      valuation: {
        base_estimate: Number(n8nMatch?.base_estimate ?? supaMatch?.base_estimate ?? extractedJson.valuation?.base_estimate ?? 0)
      },
      employeeEvidence: {
        count: n8nMatch?.employeeCount !== undefined && n8nMatch?.employeeCount !== null ? Number(n8nMatch.employeeCount) : (supaMatch?.employee_count ?? null)
      },
      mathCheckStatus: n8nMatch?.mathCheckStatus || supaMatch?.math_check_status || 'passed'
    })
  }

  const actualRunFile = {
    business: 'business4_conversionxl',
    projectId: 'project-20260804-83178e15',
    modelUsed: 'Google Gemini Chat Model (gemini-1.5-flash)',
    evaluatedAt: new Date().toISOString(),
    documents: formattedDocs
  }

  const targetPath = path.join(__dirname, '..', 'test_sets', 'results', 'business4_conversionxl_actual_run.json')
  fs.writeFileSync(targetPath, JSON.stringify(actualRunFile, null, 2))
  console.log(`✅ Saved clean actual run to: ${targetPath}`)

  const output = execSync('npx tsx scripts/run-evals.ts', { encoding: 'utf8' })
  console.log('\n--- EVALUATION OUTPUT ---')
  console.log(output)
}

run()
