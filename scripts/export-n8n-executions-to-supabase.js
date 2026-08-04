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
const config = JSON.parse(fs.readFileSync('C:\\Users\\s-bas\\.gemini\\config\\mcp_config.json', 'utf8'))
const n8nConfig = config.mcpServers.n8n

async function callMcp(toolName, args) {
  const body = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: { name: toolName, arguments: args }
  }

  const res = await fetch(n8nConfig.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      ...n8nConfig.headers
    },
    body: JSON.stringify(body)
  })

  const text = await res.text()
  try {
    const json = JSON.parse(text)
    return json.result
  } catch {
    return text
  }
}

async function run() {
  console.log('=== SYNCING LATEST EXECUTIONS DIRECTLY TO SUPABASE ===')
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  const executionIds = ['57554', '57546', '57544', '57542']

  for (const execId of executionIds) {
    console.log(`\nFetching execution ${execId}…`)
    const result = await callMcp('get_execution', { executionId: execId, workflowId: 'W5Jp7CJIQbNy0qlY' })
    console.log(`Execution ${execId} result summary:`, JSON.stringify(result).slice(0, 300))
  }
}

run()
