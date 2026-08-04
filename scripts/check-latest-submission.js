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
  console.log('=== CHECKING RECENT DOCUMENTS IN SUPABASE ===')
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: supaDocs, error: supaErr } = await supabase
    .from('documents')
    .select('*')
    .order('id', { ascending: false })
    .limit(10)

  if (supaErr) {
    console.error('Supabase error:', supaErr)
  } else {
    console.log(`Found ${supaDocs.length} recent rows in Supabase documents table:`)
    supaDocs.forEach(d => {
      console.log({
        id: d.id,
        project_id: d.project_id,
        deal_name: d.deal_name,
        file_name: d.file_name,
        request_id: d.request_id,
        status: d.status,
        financial_facts_json: d.financial_facts_json ? d.financial_facts_json.slice(0, 100) : '',
        ai_summary: d.ai_summary ? d.ai_summary.slice(0, 100) : ''
      })
    })
  }

  console.log('\n=== CHECKING RECENT ROWS IN N8N DATA TABLE rBFHVB1W7ldSiObM ===')
  const dtRes = await fetch(`${n8nBaseUrl}/data-tables/rBFHVB1W7ldSiObM/rows?limit=250`, {
    headers: { 'X-N8N-API-KEY': n8nApiKey }
  })
  if (!dtRes.ok) {
    console.error('N8N Data Table error:', await dtRes.text())
    return
  }
  const dtData = await dtRes.json()
  const rows = dtData.data || dtData || []
  const recentDtRows = rows.slice(-10)
  console.log(`Found ${rows.length} total rows in n8n Data Table. Last 10 rows:`)
  recentDtRows.forEach(r => {
    console.log({
      requestID: r.requestID,
      projectId: r.projectId,
      dealName: r.dealName,
      fileName: r.fileName,
      status: r.status,
      ai_processedAt: r.ai_processedAt,
      financialFactsJson: r.financialFactsJson ? r.financialFactsJson.slice(0, 100) : '',
      ai_summary: r.ai_summary ? r.ai_summary.slice(0, 100) : ''
    })
  })
}

run()
