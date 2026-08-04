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
  const webhookUrl = 'https://merge-works.app.n8n.cloud/webhook/d6884691-1689-479d-b1b3-ee7a8bca7380'
  const payload = {
    projectId: 'project-20260804-test-xltx',
    dealName: 'PROJECT TEST XLTX',
    companyName: 'Iron-Tree Data Networks, Inc.',
    analystName: 'Brad',
    analystEmail: 'bradshin231@gmail.com',
    workstream: 'General',
    notes: 'Testing .xltx extension normalization fix',
    projectStage: 'post-loi',
    documentType: 'auto-detect',
    fileName: 'Financial Modeling for Iron Tree.xltx',
    fileSize: 832440,
    fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
    driveFileID: '1wsIEKCnb-cgVXWViKkmKFHlzhgIpYwFq',
    submissionBatchId: 'project-20260804-test-xltx-batch',
    expectedBatchDocumentCount: 1
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
