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
const n8nApiKey = envVars.N8N_API_KEY
const n8nBaseUrl = 'https://merge-works.app.n8n.cloud/api/v1'

async function run() {
  console.log('=== STEP 1: ADDING COMPANY NAME DETECTION TO LIVE N8N SUBWORKFLOW W5Jp7CJIQbNy0qlY ===')
  const wfRes = await fetch(`${n8nBaseUrl}/workflows/W5Jp7CJIQbNy0qlY`, {
    headers: { 'X-N8N-API-KEY': n8nApiKey }
  })
  if (!wfRes.ok) {
    console.error('Failed to fetch W5Jp7CJIQbNy0qlY:', await wfRes.text())
    return
  }
  const wf = await wfRes.json()
  console.log(`Fetched workflow "${wf.name}" (${wf.id})`)

  // 1. Update Structured Output Parser schema
  const parserNode = wf.nodes.find(n => n.name === 'Structured Output Parser')
  if (parserNode && parserNode.parameters?.inputSchema) {
    try {
      const schema = JSON.parse(parserNode.parameters.inputSchema)
      schema.properties.company_name = {
        type: 'string',
        description: "The official legal or trading name of the target business or company evaluated in this document (e.g. 'TurnKey Product Management', 'ConversionXL LLC', 'Renew Health Center'). Omit or return null if absent or ambiguous."
      }
      parserNode.parameters.inputSchema = JSON.stringify(schema, null, 2)
      console.log('✅ Added company_name property to Structured Output Parser schema.')
    } catch (e) {
      console.error('Failed to parse inputSchema:', e)
    }
  }

  // 2. Update Supabase: Write Analysis Results node to update company_name if detected
  const supaNode = wf.nodes.find(n => n.name === 'Supabase: Write Analysis Results')
  if (supaNode && supaNode.parameters?.fieldsUi?.fieldValues) {
    const fieldValues = supaNode.parameters.fieldsUi.fieldValues
    // Check if company_name field exists
    let compField = fieldValues.find(f => f.fieldId === 'company_name')
    if (!compField) {
      fieldValues.push({
        fieldId: 'company_name',
        fieldValue: "={{ $('Calculate Financial Reconciliations').item.json.output?.company_name || $json.companyName || '' }}"
      })
    } else {
      compField.fieldValue = "={{ $('Calculate Financial Reconciliations').item.json.output?.company_name || $json.companyName || '' }}"
    }
    console.log('✅ Updated Supabase: Write Analysis Results node with company_name mapping.')
  }

  // 3. Save updated workflow back to n8n
  const validSettings = {}
  if (wf.settings) {
    if (wf.settings.executionOrder) validSettings.executionOrder = wf.settings.executionOrder
    if (wf.settings.timezone) validSettings.timezone = wf.settings.timezone
    if (wf.settings.errorWorkflow) validSettings.errorWorkflow = wf.settings.errorWorkflow
  }

  const updateRes = await fetch(`${n8nBaseUrl}/workflows/W5Jp7CJIQbNy0qlY`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': n8nApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: validSettings
    })
  })

  if (updateRes.ok) {
    console.log('✅ Successfully published updated W5Jp7CJIQbNy0qlY workflow to n8n with company_name AI extraction!')
  } else {
    console.error('Failed to update workflow W5Jp7CJIQbNy0qlY:', await updateRes.text())
  }
}

run()
