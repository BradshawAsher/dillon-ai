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
  const wfRes = await fetch(`${n8nBaseUrl}/workflows/vBnMdx8cvSFIFx6m`, {
    headers: { 'X-N8N-API-KEY': n8nApiKey }
  })
  const wf = await wfRes.json()
  const node = wf.nodes.find(n => n.name === 'Edit Fields')
  console.log('Edit Fields Node Parameters:', JSON.stringify(node.parameters, null, 2))
}

run()
