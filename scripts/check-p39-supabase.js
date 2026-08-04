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

  const { data: supaDocs, error: supaErr } = await supabase
    .from('documents')
    .select('*')
    .or('project_id.eq.project-20260804-f5ef17c3,deal_name.ilike.%PROJECT 39%,deal_name.ilike.%Iron%')
    .order('id', { ascending: false })

  if (supaErr) {
    console.error('Supabase error:', supaErr)
    return
  }

  console.log(`Found ${supaDocs.length} rows for Project 39 in Supabase:`)
  supaDocs.forEach(d => {
    console.log({
      id: d.id,
      file_name: d.file_name,
      request_id: d.request_id,
      status: d.status,
      company_name: d.company_name,
      financial_facts_json: d.financial_facts_json ? d.financial_facts_json.slice(0, 100) : '',
      ai_summary: d.ai_summary ? d.ai_summary.slice(0, 100) : ''
    })
  })
}

run()
