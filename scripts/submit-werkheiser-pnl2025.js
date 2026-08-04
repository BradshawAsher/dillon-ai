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

async function run() {
  console.log('=== SUBMITTING WERKHEISER P&L 2025 FOR PROJECT 1 ===')
  const webhookUrl = 'https://merge-works.app.n8n.cloud/webhook/d6884691-1689-479d-b1b3-ee7a8bca7380'
  const payload = {
    projectId: 'project-20260804-f801bec6',
    dealName: 'PROJECT 42',
    companyName: 'Werkheiser Commercial Cleaning',
    analystName: 'Brad',
    analystEmail: 'bradshin231@gmail.com',
    workstream: 'General',
    notes: 'Submitting missing 4th file',
    projectStage: 'post-loi',
    documentType: 'auto-detect',
    fileName: 'Werkheiser_Commercial_Cleaning_P&L_2025.pdf',
    fileSize: 1197000,
    fileType: 'application/pdf',
    driveFileID: '1wsIEKCnb-cgVXWViKkmKFHlzhgIpYwFq',
    submissionBatchId: 'project-20260804-f801bec6',
    expectedBatchDocumentCount: 4
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': envVars.N8N_WEBHOOK_SECRET || 'mergeworks-pod1-secret'
    },
    body: JSON.stringify(payload)
  })

  console.log('Webhook Response Status:', res.status)
  console.log('Webhook Response Text:', await res.text())
}

run()
