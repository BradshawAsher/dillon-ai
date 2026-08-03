import fs from 'fs'
import path from 'path'

// Allow local SSL inspection/proxy certificates if present
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let value = match[2] || ''
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
        process.env[key] = value.trim()
      }
    }
  }
}

async function main() {
  loadEnv()
  const apiKey = process.env.N8N_API_KEY || ''
  console.log('N8N_API_KEY present:', !!apiKey, apiKey ? `(starts with ${apiKey.slice(0, 15)}...)` : 'NONE')

  if (!apiKey) {
    console.error('No N8N_API_KEY found in frontend/.env!')
    return
  }

  const res = await fetch('https://merge-works.app.n8n.cloud/api/v1/executions?limit=5', {
    headers: {
      'X-N8N-API-KEY': apiKey,
    },
  })

  console.log('HTTP Status:', res.status, res.statusText)
  const data = await res.json()
  if (res.ok) {
    console.log('✅ SUCCESS! Authenticated with n8n Cloud REST API for your organization.')
    console.log('Loaded executions count:', data?.data?.length)
    if (data?.data && data.data.length > 0) {
      console.log('Latest execution sample:', {
        id: data.data[0].id,
        workflowId: data.data[0].workflowId,
        finished: data.data[0].finished,
        mode: data.data[0].mode,
        status: data.data[0].status || (data.data[0].finished ? 'finished' : 'running'),
      })
    }
  } else {
    console.error('❌ API Error:', data)
  }
}

main().catch(console.error)
