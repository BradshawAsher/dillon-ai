process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const fs = require('fs')

const config = JSON.parse(fs.readFileSync('C:\\Users\\s-bas\\.gemini\\config\\mcp_config.json', 'utf8'))
const n8nConfig = config.mcpServers.n8n

const updatedPerDocJsCode = `return $input.all().map((item) => {
  const details = JSON.stringify(item.json.error ?? item.json).toLowerCase();
  const isPermanentQuotaError = /credit.*balance|balance.*too low|insufficient.*credit|plans.*billing|invalid.*api.*key|unauthorized|\\b402\\b|\\b401\\b/i.test(details);
  const transient = !isPermanentQuotaError && (/\\b429\\b/.test(details) || /\\b5\\d\\d\\b/.test(details) || /rate.?limit|too many requests|timeout|timed out|econnreset|etimedout|eai_again|temporar|overload|service unavailable|bad gateway|gateway timeout/.test(details));
  const formatFailure = !isPermanentQuotaError && /could not parse|failed to parse|parsing error|model output doesn't fit required format|output_parsing_failure|json.*(?:parse|schema)|expected ',' or '}'|invalid json|structured output|validation error|does not match|zod|schema.*valid/.test(details);
  const attempt = Number(item.json.llmRetryAttempt ?? 0) + 1;
  const unknownFirstAttempt = !isPermanentQuotaError && !transient && !formatFailure && attempt === 1;
  const delays = formatFailure || unknownFirstAttempt ? [2, 6, 15] : [10, 30, 90];
  const retryable = !isPermanentQuotaError && (transient || formatFailure || unknownFirstAttempt) && attempt < 4;
  return {
    json: {
      ...item.json,
      llmRetryAttempt: attempt,
      providerRetryable: retryable,
      providerFailureKind: isPermanentQuotaError ? 'quota_exhausted' : formatFailure ? 'output_format' : transient ? 'provider_transient' : unknownFirstAttempt ? 'unknown_first_attempt' : 'non_retryable',
      providerBackoffSeconds: retryable ? delays[attempt - 1] + Math.floor(Math.random() * 2) : 0
    },
    binary: item.binary
  };
});`

const updatedSynthJsCode = `return $input.all().map((item) => {
  const details = JSON.stringify(item.json.error ?? item.json).toLowerCase();
  const isPermanentQuotaError = /credit.*balance|balance.*too low|insufficient.*credit|plans.*billing|invalid.*api.*key|unauthorized|\\b402\\b|\\b401\\b/i.test(details);
  const transient = !isPermanentQuotaError && (/\\b429\\b/.test(details) || /\\b5\\d\\d\\b/.test(details) || /rate.?limit|too many requests|timeout|timed out|econnreset|etimedout|eai_again|temporar|overload|service unavailable|bad gateway|gateway timeout/.test(details));
  const attempt = Number(item.json.synthesisLlmRetryAttempt ?? 0) + 1;
  const delays = [10, 30, 90];
  const retryable = !isPermanentQuotaError && transient && attempt < 4;
  return {
    json: {
      ...item.json,
      synthesisLlmRetryAttempt: attempt,
      providerRetryable: retryable,
      providerFailureKind: isPermanentQuotaError ? 'quota_exhausted' : transient ? 'provider_transient' : 'non_retryable',
      providerBackoffSeconds: retryable ? delays[attempt - 1] + Math.floor(Math.random() * 4) : 0
    }
  };
});`

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
    else console.log('MCP Result:', JSON.stringify(json.result, null, 2))
  } catch {
    console.log('MCP Raw Response:', text.slice(0, 500))
  }
}

async function run() {
  console.log('=== Updating W5Jp7CJIQbNy0qlY via n8n MCP ===')
  await callMcpTool('update_workflow', {
    workflowId: 'W5Jp7CJIQbNy0qlY',
    versionName: 'Bypass retries on quota error',
    versionDescription: 'Update Classify LLM Provider Error jsCode to fail instantly on credit/key errors',
    operations: [
      {
        type: 'updateNodeParameters',
        nodeName: 'Classify LLM Provider Error',
        parameters: {
          jsCode: updatedPerDocJsCode
        }
      }
    ]
  })

  console.log('\n=== Updating IoSad3rTYJMk4Mon via n8n MCP ===')
  await callMcpTool('update_workflow', {
    workflowId: 'IoSad3rTYJMk4Mon',
    versionName: 'Bypass retries on quota error',
    versionDescription: 'Update Classify Synthesis Provider Error jsCode to fail instantly on credit/key errors',
    operations: [
      {
        type: 'updateNodeParameters',
        nodeName: 'Classify Synthesis Provider Error',
        parameters: {
          jsCode: updatedSynthJsCode
        }
      }
    ]
  })
}

run()
