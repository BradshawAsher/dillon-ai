process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const fs = require('fs')

const config = JSON.parse(fs.readFileSync('C:\\Users\\s-bas\\.gemini\\config\\mcp_config.json', 'utf8'))
const n8nConfig = config.mcpServers.n8n

async function callMcpTool(toolName, args) {
  const body = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
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
  console.log(`MCP Call [${toolName}] status:`, res.status)
  try {
    const json = JSON.parse(text)
    if (json.error) console.error('MCP Error:', json.error)
    else console.log('MCP Result:', text.slice(0, 400))
  } catch {
    console.log('MCP Raw Response:', text.slice(0, 400))
  }
}

async function run() {
  console.log('=== Publishing W5Jp7CJIQbNy0qlY ===')
  await callMcpTool('publish_workflow', { workflowId: 'W5Jp7CJIQbNy0qlY' })

  console.log('\n=== Publishing IoSad3rTYJMk4Mon ===')
  await callMcpTool('publish_workflow', { workflowId: 'IoSad3rTYJMk4Mon' })
}

run()
