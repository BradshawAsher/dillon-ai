import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { formatCurrencyValue } from './aiSubmissionData'

export function downloadTextFile(fileName: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoke on the next tick rather than synchronously. Some browsers (older
  // Firefox/Safari) start the download asynchronously after click(), and
  // revoking the object URL in the same frame can cancel an in-flight save.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Longest slug we emit — well under the common 255-byte filesystem limit,
 *  leaving room for a caller-added suffix and extension. */
export const MAX_FILE_SAFE_NAME_LENGTH = 100

export function fileSafeName(value: string | null | undefined) {
  // Callers derive this from a project/deal name that can be absent; coerce
  // first so a bare `.normalize()` on null/undefined doesn't throw and abort
  // the download. An empty name falls through to the 'report' default below.
  const safeValue = typeof value === 'string' ? value : ''
  // Fold accented letters to their ASCII base first (Café -> Cafe) so a
  // diacritic isn't dropped as a separator, which would truncate "Café" to
  // "caf" instead of "cafe".
  const folded = safeValue.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  const slug = folded.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  // Truncate overly long names, then re-trim any trailing hyphen the cut left
  // behind so we never emit "long-name-".
  const capped = slug.slice(0, MAX_FILE_SAFE_NAME_LENGTH).replace(/-+$/, '')
  return capped || 'report'
}

export function downloadSynthesisReport(synthesis: ProjectSynthesisItem, projectName: string) {
  const section = (title: string, items: string[]) => [
    '## ' + title,
    ...(items.length > 0 ? items.map((item) => '- ' + item) : ['- None recorded.']),
    '',
  ]

  const report = [
    '# ' + projectName + ' — Project Synthesis',
    '',
    'Generated: ' + new Date().toLocaleString(),
    'Recommendation: ' + (synthesis.finalRecommendation || 'Pending'),
    'Risk level: ' + (synthesis.finalRiskLevel || 'Pending'),
    'Documents processed: ' + synthesis.documentsCompletedCount + '/' + synthesis.documentsReceivedCount,
    '',
    '## AI Pipeline Model Architecture',
    '- **Per-Document Extraction Primary Model**: OpenAI 5.6 Terra',
    '- **Per-Document Extraction Backup Model**: OpenAI 5.6 Sol',
    '- **Project Synthesis Pass Primary Model**: OpenAI 5.6 Terra',
    '- **Project Synthesis Pass Backup Model**: OpenAI 5.6 Sol',
    '',
    '## Acquisition judgment',
    synthesis.finalJudgmentSummary || 'No final judgment recorded.',
    '',
    '## Valuation range',
    'Lower: ' + (synthesis.valuationLowerBound && synthesis.valuationLowerBound !== '0' ? formatCurrencyValue(synthesis.valuationLowerBound, synthesis.valuationCurrency || 'USD') : 'Pending'),
    'Base: ' + (synthesis.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0' ? formatCurrencyValue(synthesis.valuationBaseEstimate, synthesis.valuationCurrency || 'USD') : 'Pending'),
    'Upper: ' + (synthesis.valuationUpperBound && synthesis.valuationUpperBound !== '0' ? formatCurrencyValue(synthesis.valuationUpperBound, synthesis.valuationCurrency || 'USD') : 'Pending'),
    '',
    ...section('Cross-document conflicts', synthesis.crossDocumentConflicts),
    ...section('Negotiation levers', synthesis.negotiationLevers),
    ...section('Missing diligence materials', synthesis.missingDocuments),
    ...section('Open questions for management', synthesis.openQuestions),
    ...section('Citations', synthesis.citations ?? []),
    '## Full structured synthesis record',
    synthesis.finalJudgmentJson ? '```json\n' + synthesis.finalJudgmentJson + '\n```' : 'The workflow did not return a separate structured synthesis record for this project.',
    '',
  ].join('\n')

  downloadTextFile(fileSafeName(projectName) + '-project-synthesis.md', report, 'text/markdown;charset=utf-8')
}
