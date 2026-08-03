import fs from 'fs'
import path from 'path'

const perDocPath = 'C:\\Users\\s-bas\\.gemini\\antigravity\\brain\\68ad25d3-5c33-431e-88a9-ff66b4a71d82\\.system_generated\\steps\\1951\\output.txt'
const consolidatorPath = 'C:\\Users\\s-bas\\.gemini\\antigravity\\brain\\68ad25d3-5c33-431e-88a9-ff66b4a71d82\\.system_generated\\steps\\1953\\output.txt'

function verifyWorkflowSchema(filePath: string, name: string) {
  console.log(`\n=== VERIFYING ${name} ===`)
  const raw = fs.readFileSync(filePath, 'utf8')
  const data = JSON.parse(raw)
  const workflow = data.workflow || data

  const parserNode = workflow.nodes?.find((n: any) =>
    n.type === '@n8n/n8n-nodes-langchain.outputParserStructured' ||
    n.name === 'Structured Output Parser'
  )

  if (!parserNode) {
    console.error(`❌ Could not find Structured Output Parser node in ${name}`)
    return
  }

  const inputSchemaStr = parserNode.parameters?.inputSchema
  if (!inputSchemaStr) {
    console.error(`❌ inputSchema parameter missing in ${name}`)
    return
  }

  const lineCount = inputSchemaStr.split('\n').length
  console.log(`Node Name: ${parserNode.name}`)
  console.log(`Schema Line Count: ${lineCount} lines (${lineCount > 10 ? '✅ Multi-line Formatted' : '⚠️ Single-line'})`)

  try {
    const parsed = JSON.parse(inputSchemaStr)
    console.log(`✅ Valid JSON Schema! Top-level keys count: ${Object.keys(parsed.properties || {}).length}`)
    console.log(`Extracted Properties:`, Object.keys(parsed.properties || {}).join(', '))
  } catch (err: any) {
    console.error(`❌ JSON Syntax Error in schema:`, err.message)
  }
}

verifyWorkflowSchema(perDocPath, 'PER-DOCUMENT WORKFLOW (W5Jp7CJIQbNy0qlY)')
verifyWorkflowSchema(consolidatorPath, 'CONSOLIDATOR WORKFLOW (IoSad3rTYJMk4Mon)')
