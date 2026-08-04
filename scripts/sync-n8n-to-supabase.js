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

async function run() {
  console.log('=== SYNCING EXTRACTED DATA FROM N8N DATA TABLE TO SUPABASE ===')
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Fetch n8n data table rows via n8n MCP or REST API
  const body = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'search_data_tables',
      arguments: {
        dataTableId: 'rBFHVB1W7ldSiObM',
        limit: 20
      }
    }
  }

  const mcpRes = await fetch(n8nConfig.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      ...n8nConfig.headers
    },
    body: JSON.stringify(body)
  })

  const text = await mcpRes.text()
  let n8nRows = []
  try {
    const json = JSON.parse(text)
    n8nRows = json.result?.data?.data || []
  } catch {
    console.error('Could not parse MCP search_data_tables output')
  }

  console.log(`Fetched ${n8nRows.length} rows from n8n Data Table. Syncing to Supabase...`)

  // Get recent Supabase documents
  const { data: supaDocs, error } = await supabase
    .from('documents')
    .select('*')
    .or('project_id.eq.project-20260804-3b63e52f,deal_name.ilike.%PROJECT 34%,deal_name.ilike.%ConversionXL%')

  if (error) {
    console.error('Supabase error:', error)
    return
  }

  console.log(`Found ${supaDocs.length} target rows in Supabase.`)

  for (const supaDoc of supaDocs) {
    const supaFileName = supaDoc.file_name.trim().toLowerCase()
    const matchingN8nRow = n8nRows.find(r => r.fileName && r.fileName.trim().toLowerCase() === supaFileName)

    if (matchingN8nRow) {
      console.log(`✅ Found n8n match for "${supaDoc.file_name}" (n8n status: ${matchingN8nRow.status})`)
      const updatePayload = {
        status: 'completed',
        detected_document_type: matchingN8nRow.detectedDocumentType || matchingN8nRow.documentType || 'Other',
        financial_facts_json: matchingN8nRow.financialFactsJson || supaDoc.financial_facts_json,
        extracted_json: matchingN8nRow.ai_extractedJson || supaDoc.extracted_json,
        risk_level: matchingN8nRow.ai_riskLevel || matchingN8nRow.ai_risk_flag || 'MEDIUM',
        traffic_light: matchingN8nRow.ai_trafficLight || 'YELLOW',
        processed_at: matchingN8nRow.ai_processedAt || new Date().toISOString(),
        error_message: null
      }

      const { error: updateErr } = await supabase
        .from('documents')
        .update(updatePayload)
        .eq('id', supaDoc.id)

      if (updateErr) console.error(`Error updating Supabase ID ${supaDoc.id}:`, updateErr)
      else console.log(`Successfully synced Supabase ID ${supaDoc.id} (${supaDoc.file_name})!`)
    } else {
      console.log(`⚠️ No direct n8n match found for "${supaDoc.file_name}" in recent rows`)
    }
  }

  console.log('=== SYNC COMPLETE ===')
}

run()
