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
const n8nBaseUrl = 'https://merge-works.app.n8n.cloud/api/v1'

async function run() {
  console.log('=== UPDATING W5Jp7CJIQbNy0qlY WITH AUTOMATIC FILE EXTENSION NORMALIZATION ===')
  const wfRes = await fetch(`${n8nBaseUrl}/workflows/W5Jp7CJIQbNy0qlY`, {
    headers: { 'X-N8N-API-KEY': n8nApiKey }
  })
  if (!wfRes.ok) {
    console.error('Failed to fetch W5Jp7CJIQbNy0qlY:', await wfRes.text())
    return
  }
  const wf = await wfRes.json()
  console.log(`Fetched workflow "${wf.name}" (${wf.id})`)

  const csvNode = wf.nodes.find(n => n.name === 'Validate CSV Table Structure')
  if (!csvNode) {
    console.error('Could not find Validate CSV Table Structure node!')
    return
  }

  const updatedCode = `// Normalize binary metadata for template files (.xltx -> .xlsx, .dotx -> .docx) before LlamaParse
if ($binary) {
  for (const key of Object.keys($binary)) {
    const entry = $binary[key];
    if (entry && entry.fileName) {
      const ext = String(entry.fileExtension || entry.fileName.split('.').pop() || '').toLowerCase();
      if (ext === 'xltx' || ext === 'xlt' || entry.fileName.toLowerCase().endsWith('.xltx')) {
        entry.fileExtension = 'xlsx';
        entry.fileName = entry.fileName.replace(/\\.xltx$/i, '.xlsx').replace(/\\.xlt$/i, '.xlsx');
        entry.mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (ext === 'dotx' || entry.fileName.toLowerCase().endsWith('.dotx')) {
        entry.fileExtension = 'docx';
        entry.fileName = entry.fileName.replace(/\\.dotx$/i, '.docx');
        entry.mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
    }
  }
}

const original = $('When Executed by Another Workflow').item.json;
const fileName = String(original.fileName ?? '').toLowerCase();
const pass = (extra = {}) => ({ json: { ...$json, tableStructureStatus: 'not_applicable', tableStructureIssues: '', detectedHeaderRow: 0, columnMapConfidence: 1, tableStructureNeedsReview: false, ...extra }, binary: $binary });
if (!fileName.endsWith('.csv')) return pass();

const binaryEntry = $binary?.data ?? Object.values($binary ?? {})[0];
const base64 = binaryEntry?.data;
if (!base64) return pass({ tableStructureStatus: 'unverified', tableStructureIssues: 'CSV_CONTENT_UNAVAILABLE', columnMapConfidence: 0.2 });

const text = Buffer.from(base64, 'base64').toString('utf8').replace(/^\\uFEFF/, '');
const lines = text.split(/\\r?\\n/).filter((line) => line.trim().length > 0);
if (lines.length < 2) return pass({ tableStructureStatus: 'needs_review', tableStructureIssues: 'CSV_HAS_NO_DATA_ROWS', columnMapConfidence: 0, tableStructureNeedsReview: true });

const delimiters = [',', '\\t', ';', '|'];
const delimiter = delimiters
  .map((candidate) => ({ candidate, count: (lines[0].match(new RegExp(candidate === '\\t' ? '\\\\t' : '\\\\' + candidate, 'g')) ?? []).length }))
  .sort((a, b) => b.count - a.count)[0].candidate;
const parseLine = (line) => {
  const cells = []; let cell = ''; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') { if (quoted && line[i + 1] === '"') { cell += '"'; i += 1; } else quoted = !quoted; }
    else if (char === delimiter && !quoted) { cells.push(cell.trim()); cell = ''; }
    else cell += char;
  }
  cells.push(cell.trim());
  while (cells.length && !cells[cells.length - 1]) cells.pop();
  return cells;
};
const rows = lines.map(parseLine);
const multiColumnRows = rows.filter((row) => row.length >= 2);
if (multiColumnRows.length < 2) return pass({ tableStructureStatus: 'needs_review', tableStructureIssues: 'CSV_HAS_NO_USABLE_TABULAR_ROWS', columnMapConfidence: 0, tableStructureNeedsReview: true });

const expectedColumns = multiColumnRows[0].length;
const dataRows = multiColumnRows.slice(1);
const mismatched = dataRows.filter((row) => row.length !== expectedColumns).length;
const invalidTokens = dataRows.flat().filter((cell) => /^(#REF!|#VALUE!|#DIV\\/0!|#N\\/A|TBD|N\\/M)$/i.test(cell)).length;
const dataCellCount = Math.max(1, dataRows.flat().length);
const severeColumnDamage = mismatched >= Math.max(3, Math.ceil(dataRows.length * 0.5));
const severeInvalidData = invalidTokens >= Math.max(5, Math.ceil(dataCellCount * 0.5));
const issues = [];
if (dataRows.length < 2) issues.push('LIMITED_DATA_ROWS');
if (mismatched > 0) issues.push('INCONSISTENT_COLUMN_COUNT:' + mismatched);
if (invalidTokens > 0) issues.push('INVALID_OR_PLACEHOLDER_VALUES:' + invalidTokens);
const needsReview = severeColumnDamage || severeInvalidData;
const confidence = Math.max(0.2, Math.min(1, Number((1 - mismatched / Math.max(dataRows.length, 1)).toFixed(2))));
return pass({
  tableStructureStatus: needsReview ? 'needs_review' : issues.length ? 'validated_with_warnings' : 'validated',
  tableStructureIssues: issues.join('; '),
  detectedHeaderRow: 1,
  columnMapConfidence: confidence,
  validatedColumnMap: JSON.stringify(rows[0]),
  tableStructureNeedsReview: needsReview
});`

  csvNode.parameters.jsCode = updatedCode

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
    console.log('✅ Successfully published automatic extension normalization (.xltx -> .xlsx) to W5Jp7CJIQbNy0qlY!')
  } else {
    console.error('Failed to update workflow W5Jp7CJIQbNy0qlY:', await updateRes.text())
  }
}

run()
