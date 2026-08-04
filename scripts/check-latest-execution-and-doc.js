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

async function run() {
  console.log('=== CHECKING LATEST SUPABASE DOCUMENTS & N8N EXECUTIONS ===')
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: docs, error: docErr } = await supabase
    .from('documents')
    .select('id, request_id, file_name, project_id, deal_name, status, error_message, expected_batch_document_count, created_at, updated_at, processed_at')
    .order('id', { ascending: false })
    .limit(10)

  if (docErr) console.error('Supabase Error:', docErr)
  else {
    console.log('\n--- Recent 10 Documents in Supabase ---')
    docs.forEach(doc => {
      const elapsed = Math.round((Date.now() - new Date(doc.created_at).getTime()) / 1000)
      const batchCount = doc.expected_batch_document_count || 1
      const timeoutSecs = Math.max(240, batchCount * 240)
      console.log(`ID: ${doc.id} | File: ${doc.file_name} | Project: ${doc.project_id}`)
      console.log(`Status: "${doc.status}" | Elapsed: ${elapsed}s (${(elapsed / 60).toFixed(1)}m) | BatchCount: ${batchCount} (Timeout: ${timeoutSecs}s / ${(timeoutSecs / 60).toFixed(1)}m)`)
      console.log(`Error: "${doc.error_message || 'NONE'}"`)
      console.log(`Created: ${doc.created_at} | Updated: ${doc.updated_at}\n`)
    })
  }
}

run()
