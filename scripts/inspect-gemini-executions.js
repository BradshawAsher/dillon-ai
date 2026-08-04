process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const fs = require('fs')
const path = require('path')

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
  console.log('=== INSPECTING EXECUTIONS 57554, 57546, 57544, 57542 ===')
  const executionIds = ['57554', '57546', '57544', '57542']

  for (const execId of executionIds) {
    const result = await callMcp('get_execution', { executionId: execId, workflowId: 'W5Jp7CJIQbNy0qlY' })
    console.log(`\n--- EXECUTION ${execId} ---`)
    console.log(typeof result === 'string' ? result.slice(0, 1000) : JSON.stringify(result, null, 2).slice(0, 1000))
  }
}

run()
