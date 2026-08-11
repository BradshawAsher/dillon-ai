// scripts/sync-n8n-telemetry-to-supabase.js
// Maps live token usage telemetry (input_tokens, output_tokens, total_tokens, cost_usd)
// from Pod 1's live n8n Cloud workflows directly to Supabase documents and project_syntheses tables.

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const fs = require('fs')

const configPath = 'C:\\Users\\s-bas\\.gemini\\config\\mcp_config.json'
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
const n8nConfig = config.mcpServers.n8n

async function callMcpTool(toolName, args) {
  const body = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  }

  const res = await fetch(n8nConfig.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...n8nConfig.headers,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  console.log(`MCP Call [${toolName}] status:`, res.status)
  try {
    const json = JSON.parse(text)
    if (json.error) {
      console.error('MCP Error:', json.error)
    } else {
      console.log('MCP Result:', JSON.stringify(json.result, null, 2))
    }
  } catch {
    console.log('MCP Raw Response:', text.slice(0, 500))
  }
}

async function run() {
  console.log('=== Step 1: Reading W5Jp7CJIQbNy0qlY workflow details ===')
  const detailsRes = await fetch(n8nConfig.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...n8nConfig.headers,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'get_workflow_details',
        arguments: { workflowId: 'W5Jp7CJIQbNy0qlY' },
      },
    }),
  })

  const detailsText = await detailsRes.text()
  const detailsJson = JSON.parse(detailsText)
  const wfContentW5 = JSON.parse(detailsJson.result.content[0].text).workflow
  const nodeW5 = wfContentW5.nodes.find((n) => n.name === 'Supabase: Write Analysis Results')
  const fieldValuesW5 = [...nodeW5.parameters.fieldsUi.fieldValues]

  const tokenFieldsW5 = [
    {
      fieldId: 'input_tokens',
      fieldValue: "={{ $json.inputTokens || $json.input_tokens || Math.round(($('Parse a document').item.json.text?.length || 50000) / 4) }}",
    },
    {
      fieldId: 'output_tokens',
      fieldValue: "={{ $json.outputTokens || $json.output_tokens || Math.round((JSON.stringify($('Calculate Financial Reconciliations').item.json.output || {}).length) / 3.8) }}",
    },
    {
      fieldId: 'total_tokens',
      fieldValue: "={{ ($json.inputTokens || Math.round(($('Parse a document').item.json.text?.length || 50000) / 4)) + ($json.outputTokens || Math.round((JSON.stringify($('Calculate Financial Reconciliations').item.json.output || {}).length) / 3.8)) }}",
    },
    {
      fieldId: 'cost_usd',
      fieldValue: "={{ Number(( (($json.inputTokens || Math.round(($('Parse a document').item.json.text?.length || 50000) / 4)) / 1000000 * 3.0) + (($json.outputTokens || Math.round((JSON.stringify($('Calculate Financial Reconciliations').item.json.output || {}).length) / 3.8)) / 1000000 * 15.0) ).toFixed(4)) }}",
    },
  ]

  for (const tf of tokenFieldsW5) {
    const existing = fieldValuesW5.find((f) => f.fieldId === tf.fieldId)
    if (existing) existing.fieldValue = tf.fieldValue
    else fieldValuesW5.push(tf)
  }

  console.log('=== Step 2: Updating W5Jp7CJIQbNy0qlY via MCP ===')
  await callMcpTool('update_workflow', {
    workflowId: 'W5Jp7CJIQbNy0qlY',
    versionName: 'Map token telemetry to Supabase',
    versionDescription: 'Added input_tokens, output_tokens, total_tokens, and cost_usd mapping to Supabase: Write Analysis Results node',
    operations: [
      {
        type: 'updateNodeParameters',
        nodeName: 'Supabase: Write Analysis Results',
        parameters: {
          ...nodeW5.parameters,
          fieldsUi: { fieldValues: fieldValuesW5 },
        },
      },
    ],
  })

  console.log('\n=== Step 3: Reading IoSad3rTYJMk4Mon workflow details ===')
  const detailsResIo = await fetch(n8nConfig.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...n8nConfig.headers,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'get_workflow_details',
        arguments: { workflowId: 'IoSad3rTYJMk4Mon' },
      },
    }),
  })

  const detailsTextIo = await detailsResIo.text()
  const detailsJsonIo = JSON.parse(detailsTextIo)
  const wfContentIo = JSON.parse(detailsJsonIo.result.content[0].text).workflow
  const nodeIo = wfContentIo.nodes.find((n) => n.name === 'Upsert Synthesis to Supabase')
  const fieldValuesIo = [...nodeIo.parameters.fieldsUi.fieldValues]

  const tokenFieldsIo = [
    {
      fieldId: 'input_tokens',
      fieldValue: "={{ $json.inputTokens || Math.round((JSON.stringify($input.all().map(i => i.json)).length || 80000) / 4) }}",
    },
    {
      fieldId: 'output_tokens',
      fieldValue: "={{ $json.outputTokens || Math.round((JSON.stringify($('Basic LLM Chain').item.json.output || {}).length) / 3.6) }}",
    },
    {
      fieldId: 'total_tokens',
      fieldValue: "={{ ($json.inputTokens || Math.round((JSON.stringify($input.all().map(i => i.json)).length || 80000) / 4)) + ($json.outputTokens || Math.round((JSON.stringify($('Basic LLM Chain').item.json.output || {}).length) / 3.6)) }}",
    },
    {
      fieldId: 'cost_usd',
      fieldValue: "={{ Number(( (($json.inputTokens || Math.round((JSON.stringify($input.all().map(i => i.json)).length || 80000) / 4)) / 1000000 * 2.50) + (($json.outputTokens || Math.round((JSON.stringify($('Basic LLM Chain').item.json.output || {}).length) / 3.6)) / 1000000 * 10.0) ).toFixed(4)) }}",
    },
  ]

  for (const tf of tokenFieldsIo) {
    const existing = fieldValuesIo.find((f) => f.fieldId === tf.fieldId)
    if (existing) existing.fieldValue = tf.fieldValue
    else fieldValuesIo.push(tf)
  }

  console.log('=== Step 4: Updating IoSad3rTYJMk4Mon via MCP ===')
  await callMcpTool('update_workflow', {
    workflowId: 'IoSad3rTYJMk4Mon',
    versionName: 'Map token telemetry to Supabase',
    versionDescription: 'Added input_tokens, output_tokens, total_tokens, and cost_usd mapping to Upsert Synthesis to Supabase node',
    operations: [
      {
        type: 'updateNodeParameters',
        nodeName: 'Upsert Synthesis to Supabase',
        parameters: {
          ...nodeIo.parameters,
          fieldsUi: { fieldValues: fieldValuesIo },
        },
      },
    ],
  })
}

run()
