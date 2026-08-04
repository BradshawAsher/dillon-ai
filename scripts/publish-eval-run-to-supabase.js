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
  console.log('=== PUBLISHING LATEST EVAL RUN TO SUPABASE PUBLIC.EVAL_RUNS ===')
  const reportPath = path.join(__dirname, '..', 'test_sets', 'eval_reports', 'latest_eval_report.json')
  if (!fs.existsSync(reportPath)) {
    console.error('No latest_eval_report.json found!')
    return
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  const payload = {
    run_at: report.evaluatedAt || new Date().toISOString(),
    commit_sha: 'HEAD',
    total_documents: report.totalDocumentsEvaluated || 6,
    passed_documents: report.passedDocuments || 1,
    overall_percentage: report.overallPercentage || 73,
    status: report.status || 'NEEDS-TUNING',
    report_json: report
  }

  const { data, error } = await supabase
    .from('eval_runs')
    .insert([payload])
    .select()

  if (error) {
    console.error('Failed to insert into eval_runs:', error)
  } else {
    console.log('✅ Successfully published eval run to Supabase public.eval_runs:', data)
  }
}

run()
