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
  console.log('=== INSPECTING LATEST DOCUMENTS IN SUPABASE ===')
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, file_name, status, deal_name, project_id, detected_document_type, financial_facts_json, created_at, updated_at')
    .order('id', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Supabase Error:', error)
    return
  }

  console.log(`Top 10 Most Recent Documents in Supabase:`)
  docs.forEach(doc => {
    let factsCount = 0
    if (doc.financial_facts_json) {
      try {
        const parsed = typeof doc.financial_facts_json === 'string' ? JSON.parse(doc.financial_facts_json) : doc.financial_facts_json
        factsCount = Array.isArray(parsed) ? parsed.length : 0
      } catch {}
    }
    console.log(`- ID: ${doc.id} | File: "${doc.file_name}" | Status: ${doc.status} | ProjectId: ${doc.project_id} | Type: ${doc.detected_document_type} | Facts: ${factsCount} | Updated: ${doc.updated_at || doc.created_at}`)
  })
}

run()
