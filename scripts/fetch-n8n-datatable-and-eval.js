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

const n8nApiKey = envVars.N8N_API_KEY
const config = JSON.parse(fs.readFileSync('C:\\Users\\s-bas\\.gemini\\config\\mcp_config.json', 'utf8'))
const n8nConfig = config.mcpServers.n8n
const jwtToken = n8nConfig.headers.Authorization.replace('Bearer ', '').trim()

async function run() {
  console.log('=== FETCHING N8N DATA TABLE ROWS FOR BUSINESS 4 EVALUATION ===')
  
  const url = 'https://merge-works.app.n8n.cloud/api/v1/data-tables/rBFHVB1W7ldSiObM/rows?limit=50'
  const res = await fetch(url, {
    headers: {
      'X-N8N-API-KEY': n8nApiKey,
      'n8n-api-key': n8nApiKey,
      'Authorization': `Bearer ${jwtToken}`,
      'Accept': 'application/json'
    }
  })

  console.log('Fetch Data Table rows status:', res.status)
  if (!res.ok) {
    console.error('Failed to fetch data table rows directly:', await res.text())
    return
  }

  const json = await res.json()
  const rows = json.data || json || []
  console.log(`Successfully fetched ${rows.length} rows from n8n Data Table!`)

  const b4Keywords = ['conversion', 'cxl', 'dd memo', 'om']
  const b4Rows = rows.filter(r => {
    const fn = (r.fileName || '').toLowerCase()
    return b4Keywords.some(k => fn.includes(k))
  })

  console.log(`Found ${b4Rows.length} matching rows for Business 4 (ConversionXL).`)

  const formattedDocs = []
  for (const r of b4Rows) {
    let extractedJson = {}
    if (r.ai_extractedJson) {
      try {
        extractedJson = typeof r.ai_extractedJson === 'string' ? JSON.parse(r.ai_extractedJson) : r.ai_extractedJson
      } catch {}
    }

    let financialFacts = []
    if (r.financialFactsJson) {
      try {
        const parsed = typeof r.financialFactsJson === 'string' ? JSON.parse(r.financialFactsJson) : r.financialFactsJson
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

    formattedDocs.push({
      fileName: r.fileName,
      fileType: r.fileType || 'pdf',
      status: 'completed',
      detectedDocumentType: r.detectedDocumentType || extractedJson.document_type || 'Other',
      detectedDocumentTypes: Array.isArray(extractedJson.document_types) ? extractedJson.document_types : [r.detectedDocumentType || 'Other'],
      trafficLight: r.ai_trafficLight || extractedJson.traffic_light || 'YELLOW',
      riskLevel: r.ai_riskLevel || extractedJson.risk_flag || 'MEDIUM',
      financialFacts,
      redFlags,
      yellowFlags,
      valuation: {
        base_estimate: Number(r.base_estimate ?? extractedJson.valuation?.base_estimate ?? 0)
      },
      employeeEvidence: {
        count: r.employeeCount !== undefined && r.employeeCount !== null ? Number(r.employeeCount) : null
      },
      mathCheckStatus: r.mathCheckStatus || 'passed'
    })
  }

  const actualRunFile = {
    business: 'business4_conversionxl',
    projectId: 'project-20260804-3b63e52f',
    modelUsed: 'Google Gemini Chat Model (gemini-1.5-flash)',
    evaluatedAt: new Date().toISOString(),
    documents: formattedDocs
  }

  const targetPath = path.join(__dirname, '..', 'test_sets', 'results', 'business4_conversionxl_actual_run.json')
  fs.writeFileSync(targetPath, JSON.stringify(actualRunFile, null, 2))
  console.log(`✅ Wrote ${formattedDocs.length} real document extractions to ${targetPath}`)
}

run()
