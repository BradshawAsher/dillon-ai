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
const n8nBaseUrl = 'https://merge-works.app.n8n.cloud/api/v1'

async function run() {
  console.log('=== CHECKING N8N DATA TABLE FOR PROJECT 38 (project-20260804-70c7d186) ===')
  const dtRes = await fetch(`${n8nBaseUrl}/data-tables/rBFHVB1W7ldSiObM/rows?limit=250`, {
    headers: { 'X-N8N-API-KEY': n8nApiKey }
  })
  if (!dtRes.ok) {
    console.error('Data table error:', await dtRes.text())
    return
  }
  const dtData = await dtRes.json()
  const rows = dtData.data || dtData || []
  const p38Rows = rows.filter(r => r.projectId === 'project-20260804-70c7d186')
  console.log(`Found ${p38Rows.length} rows for Project 38 in n8n Data Table:`)
  p38Rows.forEach(r => {
    console.log({
      fileName: r.fileName,
      requestID: r.requestID,
      status: r.status,
      ai_processedAt: r.ai_processedAt,
      financialFactsJson: r.financialFactsJson ? r.financialFactsJson.slice(0, 100) : ''
    })
  })
}

run()
