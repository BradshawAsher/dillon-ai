// Publishes the latest eval run to Supabase public.eval_runs so the dashboard
// can chart pass-rate over time. Runs automatically at the end of npm run eval.
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Disable TLS rejection for local dev SSL proxy
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

/** Reads env from process.env first, falling back to frontend/.env if present.
 * Never throws when the .env file is missing (e.g. in CI). */
function loadEnv() {
  const merged = { ...process.env }
  try {
    const envPath = path.join(__dirname, '..', 'frontend', '.env')
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)\s*$/)
        if (match && !merged[match[1]]) merged[match[1]] = match[2].trim()
      }
    }
  } catch {
    // ignore — process.env is enough
  }
  return merged
}

/** Best-effort current commit SHA so each run is traceable to a deploy. */
function currentCommitSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: path.join(__dirname, '..') }).toString().trim()
  } catch {
    return 'unknown'
  }
}

async function run() {
  console.log('=== PUBLISHING LATEST EVAL RUN TO SUPABASE PUBLIC.EVAL_RUNS ===')

  const env = loadEnv()
  const supabaseUrl = env.SUPABASE_URL
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Skipping publish: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set.')
    return
  }

  const reportPath = path.join(__dirname, '..', 'test_sets', 'eval_reports', 'latest_eval_report.json')
  if (!fs.existsSync(reportPath)) {
    console.error('No latest_eval_report.json found!')
    return
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
  const docResults = Array.isArray(report.documentResults) ? report.documentResults : []

  // Derive from the real report — never publish fabricated fallback numbers.
  const payload = {
    run_at: report.evaluatedAt || new Date().toISOString(),
    commit_sha: currentCommitSha(),
    total_documents: typeof report.totalDocumentsEvaluated === 'number' ? report.totalDocumentsEvaluated : docResults.length,
    passed_documents: typeof report.passedDocuments === 'number' ? report.passedDocuments : docResults.filter((d) => d.pass).length,
    overall_percentage: typeof report.overallPercentage === 'number' ? report.overallPercentage : 0,
    status: report.status || 'NEEDS-TUNING',
    report_json: report,
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase.from('eval_runs').insert([payload]).select()
  if (error) {
    console.error('Failed to insert into eval_runs:', error)
  } else {
    console.log('✅ Published eval run to Supabase public.eval_runs:', data)
  }
}

run()
