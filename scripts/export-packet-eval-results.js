import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PACKETS = {
  packet4: {
    business: 'Atlantic Beverage & Bottling Corp (Beverage Packaging & Logistics)',
    expectedCount: 7,
    outputFile: 'packet4_atlantic_beverage_actual_run.json',
  },
  packet5: {
    business: 'Vanguard Precision Aerospace Machining (Defense Tooling & CNC)',
    expectedCount: 6,
    outputFile: 'packet5_vanguard_aerospace_actual_run.json',
  },
  packet6: {
    business: 'TerraClean Industrial Waste Solutions (Hazardous Waste Treatment)',
    expectedCount: 7,
    outputFile: 'packet6_terraclean_waste_actual_run.json',
  },
}

function loadLocalEnv() {
  const envPath = path.join(__dirname, '..', 'frontend', '.env')
  if (!fs.existsSync(envPath)) return

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match || process.env[match[1]]) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[match[1]] = value
  }
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function firstNonEmptyArray(...values) {
  return values.map((value) => asArray(parseJson(value, value))).find((value) => value.length > 0) || []
}

function finiteNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function flagText(item) {
  if (typeof item === 'string') return item.trim()
  const record = asRecord(item)
  return String(record.description || record.summary || record.text || record.flag || '').trim()
}

function normalizeFacts(items) {
  return asArray(items)
    .map((item) => {
      const fact = asRecord(item)
      const metric = fact.metric || fact.fact_name || fact.factName || fact.fact_type
      const normalizedValue = finiteNumber(
        fact.normalized_value,
        fact.normalizedValue,
        fact.numeric_value,
        fact.numericValue,
        fact.value,
      )
      if (!metric || normalizedValue === null) return null
      return {
        metric: String(metric),
        normalizedValue,
        ...(fact.period ? { period: String(fact.period) } : {}),
        ...(finiteNumber(fact.confidence, fact.confidence_score) !== null
          ? { confidence: finiteNumber(fact.confidence, fact.confidence_score) }
          : {}),
      }
    })
    .filter(Boolean)
}

function normalizeDocument(row) {
  const parsed = asRecord(parseJson(row.extracted_json, {}))
  const analysis = asRecord(parsed.output && typeof parsed.output === 'object' ? parsed.output : parsed)
  const response = asRecord(analysis.response)
  const flags = asRecord(response.flags)

  const facts = firstNonEmptyArray(
    row.financial_facts_json,
    analysis.financial_facts,
    analysis.financialFacts,
    response.financial_facts,
  )
  const redFlags = firstNonEmptyArray(row.ai_red_flags, flags.red_flags, analysis.red_flags)
    .map(flagText)
    .filter(Boolean)
  const yellowFlags = firstNonEmptyArray(row.ai_yellow_flags, flags.yellow_flags, analysis.yellow_flags)
    .map(flagText)
    .filter(Boolean)

  const valuation = asRecord(analysis.valuation)
  const employeeEvidence = asRecord(analysis.employee_evidence || analysis.employeeEvidence)
  const reconciliation = asRecord(analysis.reconciliation)
  const detectedDocumentType = String(
    row.detected_document_type || analysis.document_type || analysis.documentType || 'Other',
  )
  const detectedDocumentTypes = firstNonEmptyArray(analysis.document_types, analysis.documentTypes)

  return {
    fileName: String(row.file_name || ''),
    fileType: String(row.file_type || path.extname(String(row.file_name || '')).slice(1) || 'unknown'),
    status: String(row.status || ''),
    modelUsed: String(row.model_used || analysis.model_used || ''),
    detectedDocumentType,
    detectedDocumentTypes: detectedDocumentTypes.length > 0
      ? detectedDocumentTypes.map(String)
      : [detectedDocumentType],
    trafficLight: String(row.traffic_light || analysis.traffic_light || analysis.trafficLight || 'YELLOW'),
    riskLevel: String(row.risk_level || analysis.risk_flag || analysis.risk_level || analysis.riskLevel || 'MEDIUM'),
    financialFacts: normalizeFacts(facts),
    redFlags,
    yellowFlags,
    valuation: {
      base_estimate: finiteNumber(
        row.valuation_base_estimate,
        valuation.base_estimate,
        valuation.valuation_base_estimate,
      ) ?? 0,
    },
    employeeEvidence: {
      count: finiteNumber(row.employee_count, employeeEvidence.count, employeeEvidence.employee_count),
    },
    mathCheckStatus: String(row.math_check_status || reconciliation.status || analysis.math_check_status || 'passed'),
    ...(row.input_tokens !== null && row.input_tokens !== undefined ? { inputTokens: Number(row.input_tokens) } : {}),
    ...(row.output_tokens !== null && row.output_tokens !== undefined ? { outputTokens: Number(row.output_tokens) } : {}),
    ...(row.total_tokens !== null && row.total_tokens !== undefined ? { totalTokens: Number(row.total_tokens) } : {}),
    ...(row.cost_usd !== null && row.cost_usd !== undefined ? { costUsd: Number(row.cost_usd) } : {}),
    ...(row.request_id ? { requestId: String(row.request_id) } : {}),
    ...(row.processed_at || row.updated_at ? { processedAt: String(row.processed_at || row.updated_at) } : {}),
  }
}

function parseMappings(args) {
  const mappings = new Map()
  for (const arg of args) {
    const separator = arg.indexOf('=')
    if (separator < 1) throw new Error(`Expected packet=project-id, received: ${arg}`)
    const packet = arg.slice(0, separator)
    const projectId = arg.slice(separator + 1)
    if (!PACKETS[packet]) throw new Error(`Unknown packet key: ${packet}`)
    if (!projectId) throw new Error(`Missing project ID for ${packet}`)
    mappings.set(packet, projectId)
  }
  if (mappings.size === 0) {
    throw new Error('Pass at least one mapping, for example packet4=project-20260831-...')
  }
  return mappings
}

async function exportPacket(supabase, packetKey, projectId) {
  const definition = PACKETS[packetKey]
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .order('id', { ascending: false })

  if (error) throw new Error(`${packetKey}: Supabase query failed: ${error.message}`)

  const latestByFile = new Map()
  for (const row of data || []) {
    const key = String(row.file_name || '').trim().toLowerCase()
    if (key && !latestByFile.has(key)) latestByFile.set(key, row)
  }

  if (latestByFile.size !== definition.expectedCount) {
    throw new Error(
      `${packetKey}: expected ${definition.expectedCount} unique documents for ${projectId}, found ${latestByFile.size}`,
    )
  }

  const incomplete = [...latestByFile.values()].filter((row) => String(row.status).toLowerCase() !== 'completed')
  if (incomplete.length > 0) {
    throw new Error(`${packetKey}: ${incomplete.length} latest document row(s) are not completed`)
  }

  const documents = [...latestByFile.values()]
    .map(normalizeDocument)
    .sort((a, b) => a.fileName.localeCompare(b.fileName))

  const output = {
    business: definition.business,
    projectId,
    evaluatedAt: new Date().toISOString(),
    documents,
  }
  const target = path.join(__dirname, '..', 'test_sets', 'results', definition.outputFile)
  fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.log(`${packetKey}: exported ${documents.length} completed documents from ${projectId} to ${definition.outputFile}`)
}

async function main() {
  loadLocalEnv()
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }

  const mappings = parseMappings(process.argv.slice(2))
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  for (const [packetKey, projectId] of mappings) {
    await exportPacket(supabase, packetKey, projectId)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
