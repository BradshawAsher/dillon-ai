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
  console.log('=== CHECKING N8N DATA TABLE rBFHVB1W7ldSiObM FOR CASCADIA / DD-001 ===')
  const dtRes = await fetch(`${n8nBaseUrl}/data-tables/rBFHVB1W7ldSiObM/rows?limit=250`, {
    headers: { 'X-N8N-API-KEY': n8nApiKey }
  })
  if (!dtRes.ok) {
    console.error('N8N Data Table error:', await dtRes.text())
    return
  }
  const dtData = await dtRes.json()
  const rows = dtData.data || dtData || []
  console.log(`Total rows in n8n Data Table: ${rows.length}`)

  const matching = rows.filter(r => {
    const str = JSON.stringify(r).toLowerCase()
    return str.includes('cascadia') || str.includes('dd-001') || str.includes('dd_001')
  })

  console.log(`Found ${matching.length} rows matching Cascadia / DD-001:`)
  matching.forEach(r => {
    console.log({
      id: r.id || r._id,
      requestID: r.requestID,
      projectId: r.projectId,
      dealName: r.dealName,
      fileName: r.fileName,
      status: r.status,
      ai_processedAt: r.ai_processedAt,
      financialFactsJson: r.financialFactsJson ? r.financialFactsJson.slice(0, 80) : '',
    })
  })
}

run()
