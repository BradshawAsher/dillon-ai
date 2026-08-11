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
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('=== QUERYING SUPABASE FOR 22 RECENT MEDSPA/CASCADIA DOCS ===')
  const { data: supaDocs, error: supaErr } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', 'medspa-wellness-clinic')
    .order('id', { ascending: false })
    .limit(30)

  if (supaErr) {
    console.error('Supabase error:', supaErr)
    return
  }

  console.log(`Retrieved ${supaDocs.length} rows from Supabase for medspa-wellness-clinic:`)
  supaDocs.forEach(d => {
    console.log(`- file: "${d.file_name}" | status: ${d.status} | facts: ${Boolean(d.financial_facts_json)} | summary: ${(d.ai_summary || '').slice(0, 60)}`)
  })

  // Format into actual run format for eval suite
  const formattedDocs = supaDocs.map(d => {
    let facts = []
    try {
      facts = d.financial_facts_json ? JSON.parse(d.financial_facts_json) : []
    } catch {
      facts = []
    }

    return {
      fileName: d.file_name,
      documentType: d.document_type || d.ai_category || 'Financial Statement',
      status: d.status,
      confidence: d.ai_confidence ? parseFloat(d.ai_confidence) : 0.95,
      factsExtracted: facts,
      redFlags: d.ai_red_flags ? (typeof d.ai_red_flags === 'string' ? d.ai_red_flags.split(';') : d.ai_red_flags) : [],
      yellowFlags: d.ai_yellow_flags ? (typeof d.ai_yellow_flags === 'string' ? d.ai_yellow_flags.split(';') : d.ai_yellow_flags) : [],
      greenFlags: d.ai_green_flags ? (typeof d.ai_green_flags === 'string' ? d.ai_green_flags.split(';') : d.ai_green_flags) : [],
      summary: d.ai_summary || '',
      riskLevel: d.ai_risk_level || 'Low',
      trafficLight: d.ai_traffic_light || 'Green',
      modelUsed: 'Claude 3.5 Sonnet / n8n Live Pipeline'
    }
  })

  const exportPayload = {
    business: 'Business 5 - Medical Spa / Cascadia Live Run',
    projectId: 'medspa-wellness-clinic',
    evaluatedAt: new Date().toISOString(),
    documents: formattedDocs
  }

  const exportPath = path.join(__dirname, '..', 'test_sets', 'results', 'cascadia_dd001_live_run.json')
  fs.writeFileSync(exportPath, JSON.stringify(exportPayload, null, 2))
  console.log(`\nExported ${formattedDocs.length} documents to ${exportPath}`)
}

run()
