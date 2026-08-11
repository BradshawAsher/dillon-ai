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
  console.log('=== CHECKING PROJECT-LEVEL DATA TABLE DTrLU8hBUwYzmBig ===')
  const res = await fetch(`${n8nBaseUrl}/data-tables/DTrLU8hBUwYzmBig/rows?limit=100`, {
    headers: { 'X-N8N-API-KEY': n8nApiKey }
  })
  if (!res.ok) {
    console.error('Error:', await res.text())
    return
  }
  const data = await res.json()
  const rows = data.data || data || []
  console.log(`Found ${rows.length} total project synthesis rows in n8n table DTrLU8hBUwYzmBig:`)
  rows.forEach(r => {
    console.log({
      id: r.id || r._id,
      projectId: r.projectId,
      projectName: r.projectName,
      targetCompany: r.targetCompany,
      finalRecommendation: r.finalRecommendation,
      projectStatus: r.projectStatus,
      documentsCompletedCount: r.documentsCompletedCount,
      documentsReceivedCount: r.documentsReceivedCount,
      ai_processedAt: r.ai_processedAt,
    })
  })
}

run()
