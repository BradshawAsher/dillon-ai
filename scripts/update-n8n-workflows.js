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
const baseUrl = 'https://mergeworks.app.n8n.cloud/api/v1'

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

async function updateWorkflow(workflowId, nodeName, newJsCode) {
  console.log(`\n=== Fetching workflow ${workflowId} ===`)
  
  // Try X-N8N-API-KEY and n8n-api-key headers
  const getRes = await fetch(`${baseUrl}/workflows/${workflowId}`, {
    headers: { 'n8n-api-key': n8nApiKey, 'X-N8N-API-KEY': n8nApiKey }
  })
  
  if (!getRes.ok) {
    console.error(`Failed to fetch workflow ${workflowId}:`, getRes.status, await getRes.text())
    return
  }
  const workflow = await getRes.json()
  const targetNode = workflow.nodes.find(n => n.name === nodeName || n.id === nodeName)
  if (!targetNode) {
    console.error(`Target node "${nodeName}" not found in workflow ${workflowId}`)
    return
  }

  console.log(`Found node "${targetNode.name}" (type: ${targetNode.type}). Updating jsCode…`)
  targetNode.parameters = targetNode.parameters || {}
  targetNode.parameters.jsCode = newJsCode

  const payload = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings,
    active: workflow.active
  }

  const putRes = await fetch(`${baseUrl}/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'n8n-api-key': n8nApiKey,
      'X-N8N-API-KEY': n8nApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (putRes.ok) {
    console.log(`✅ SUCCESS: Updated workflow ${workflowId} ("${workflow.name}") successfully!`)
  } else {
    console.error(`❌ FAILED to update workflow ${workflowId}:`, putRes.status, await putRes.text())
  }
}

async function run() {
  await updateWorkflow('W5Jp7CJIQbNy0qlY', 'Classify LLM Provider Error', updatedPerDocJsCode)
  await updateWorkflow('IoSad3rTYJMk4Mon', 'Classify Synthesis Provider Error', updatedSynthJsCode)
}

run()
