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

  console.log('=== QUERYING SUPABASE FOR LAST 50 DOCUMENTS ===')
  const { data: docs, error: docErr } = await supabase
    .from('documents')
    .select('id, project_id, deal_name, file_name, status, created_at')
    .order('id', { ascending: false })
    .limit(50)

  if (docErr) {
    console.error('Doc query error:', docErr)
  } else {
    console.log(`Found ${docs?.length || 0} document rows in Supabase:`)
    docs?.forEach(d => {
      console.log(`- [ID ${d.id}] file: "${d.file_name}" | status: ${d.status} | project: "${d.project_id}" | deal: "${d.deal_name}" | created: ${d.created_at}`)
    })
  }

  console.log('\n=== QUERYING SUPABASE FOR LAST 10 SYNTHESIS ROWS ===')
  const { data: synths, error: synthErr } = await supabase
    .from('project_syntheses')
    .select('id, project_id, project_name, company_name, final_recommendation, documents_completed_count, created_at, updated_at')
    .order('id', { ascending: false })
    .limit(10)

  if (synthErr) {
    console.error('Synth query error:', synthErr)
  } else {
    console.log(`Found ${synths?.length || 0} synthesis rows in Supabase:`)
    synths?.forEach(s => {
      console.log(`- [ID ${s.id}] project_id: "${s.project_id}" | name: "${s.project_name}" | rec: ${s.final_recommendation} | updated: ${s.updated_at}`)
    })
  }
}

run()
