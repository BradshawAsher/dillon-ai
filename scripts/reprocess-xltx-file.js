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
  console.log('=== TESTING RE-PROCESSING OF FINANCIAL MODELING FOR IRON TREE.XLTX ===')
  const payload = {
    requestID: '6e8961ae-aab4-40a7-8dbb-bb52705b1539',
    fileName: 'Financial Modeling for Iron Tree.xltx',
    fileSize: 832440,
    fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
    triggerTimestamp: new Date().toISOString(),
    status: 'processing',
    receivedAt: new Date().toISOString(),
    dealName: 'PROJECT 39',
    companyName: 'Iron-Tree Data Networks, Inc.',
    analystName: 'Brad',
    workstream: 'General',
    notes: 'N/A',
    analystEmail: 'bradshin231@gmail.com',
    driveFileID: '1wsIEKCnb-cgVXWViKkmKFHlzhgIpYwFq',
    projectId: 'project-20260804-f5ef17c3',
    projectStage: 'post-loi',
    documentType: 'auto-detect',
    submissionBatchId: 'project-20260804-f5ef17c3',
    expectedBatchDocumentCount: 4
  }

  // Trigger subworkflow W5Jp7CJIQbNy0qlY
  const res = await fetch(`${n8nBaseUrl}/workflows/W5Jp7CJIQbNy0qlY/executions`, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': n8nApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: [payload] })
  })

  if (!res.ok) {
    console.error('Execution trigger response error:', await res.text())
    return
  }

  const exec = await res.json()
  console.log('Triggered execution for .xltx file:', exec)
}

run()
