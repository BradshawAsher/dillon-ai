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
  console.log('=== EXPORTING WIDGETCO RUN RESULTS FROM SUPABASE ===')
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from('documents')
    .select('file_name, extracted_json, status')
    .eq('project_id', 'project-20260806-a44a8d3b')

  if (error) {
    console.error('Supabase query error:', error)
    return
  }

  const documents = (data || []).map((d) => ({
    fileName: d.file_name,
    extractedJson: typeof d.extracted_json === 'string' ? d.extracted_json : JSON.stringify(d.extracted_json),
    status: d.status,
  }))

  const payload = {
    business: 'WidgetCo Forensic Set',
    projectId: 'project-20260806-a44a8d3b',
    evaluatedAt: new Date().toISOString(),
    documents,
  }

  const outputPath = path.join(__dirname, '..', 'test_sets', 'results', 'widgetco_actual_run.json')
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2))
  console.log('✅ Successfully exported WidgetCo run results to:', outputPath, 'with', documents.length, 'documents!')
}

run().catch(console.error)
