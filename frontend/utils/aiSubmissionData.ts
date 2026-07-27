import type { SubmissionHistoryItem } from './submissionHistory'

type ParsedJson = Record<string, unknown>

type ParsedCitation = {
  sourceFile: string
  rowOrCell: string
}

function parseJsonValue(raw: string) {
  // Rows can arrive partially populated (missing/optional fields), so coerce
  // anything non-string to an empty string rather than throwing on .trim().
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return null
  }

  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function parseStringArray(raw: string) {
  const parsed = parseJsonValue(raw)

  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed.filter((value): value is string => typeof value === 'string')
}

function parseTextList(raw: string) {
  const array = parseStringArray(raw)
  if (array.length > 0) {
    return array
  }

  const numberedItems = raw.match(/\(\d+\)\s*[\s\S]*?(?=\s*\(\d+\)|$)/g)
  if (numberedItems && numberedItems.length > 1) {
    return numberedItems.map((item) => item.trim())
  }

  return raw
    .split(/\r?\n|;|•|\|/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

/**
 * Keeps LLM text intact while making long, unstructured responses easier to
 * scan. Existing lists and paragraphs are preserved; a single long paragraph
 * is only wrapped at sentence boundaries.
 */
export function splitReadableText(raw: string, maxCharacters = 360) {
  const items = parseTextList(raw)

  if (items.length > 1) {
    return items
  }

  const text = items[0]?.trim() ?? ''
  if (text.length <= maxCharacters) {
    return text.length > 0 ? [text] : []
  }

  const paragraphs = text.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
  if (paragraphs.length > 1) {
    return paragraphs
  }

  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
  if (sentences.length === 1) {
    return [text]
  }

  const sections: string[] = []
  let currentSection = ''

  for (const sentence of sentences) {
    const nextSection = currentSection ? `${currentSection} ${sentence}` : sentence

    if (currentSection && nextSection.length > maxCharacters) {
      sections.push(currentSection)
      currentSection = sentence
    } else {
      currentSection = nextSection
    }
  }

  if (currentSection) {
    sections.push(currentSection)
  }

  return sections
}

function parseExtractedObject(raw: string): ParsedJson | null {
  const parsed = parseJsonValue(raw)

  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    return null
  }

  return parsed as ParsedJson
}

function getObjectValue(object: ParsedJson | null, key: string) {
  if (!object) {
    return null
  }

  return object[key]
}

function getNestedObject(object: ParsedJson | null, key: string): ParsedJson | null {
  const value = getObjectValue(object, key)

  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return null
  }

  return value as ParsedJson
}

function getStringValue(value: unknown) {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return ''
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function formatLabel(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatMetricValue(value: unknown) {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'string') {
    return value
  }

  const serialized = JSON.stringify(value)
  return typeof serialized === 'string' ? serialized : ''
}

function getBooleanValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true
    }

    if (value === 0) {
      return false
    }
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true
    }

    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false
    }
  }

  return null
}

export function formatCurrencyValue(value: string, currency: string) {
  const trimmedValue = value.trim()

  if (trimmedValue.length === 0) {
    return ''
  }

  let numericValue = Number(trimmedValue)

  if (!Number.isFinite(numericValue)) {
    const cleaned = trimmedValue.replace(/[$,\s]/g, '')
    const abbrevMatch = cleaned.match(/^([0-9.]+)\s*(M|K|B|m|k|b)$/i)
    if (abbrevMatch) {
      const base = parseFloat(abbrevMatch[1])
      const suffix = abbrevMatch[2].toUpperCase()
      const multiplier = suffix === 'B' ? 1_000_000_000 : suffix === 'M' ? 1_000_000 : 1_000
      numericValue = base * multiplier
    } else {
      const strippedNum = Number(cleaned)
      if (Number.isFinite(strippedNum)) {
        numericValue = strippedNum
      } else {
        return trimmedValue
      }
    }
  }

  const trimmedCurrency = currency.trim()

  if (trimmedCurrency.length === 3) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: trimmedCurrency,
        maximumFractionDigits: 0,
      }).format(numericValue)
    } catch {
      return `${trimmedCurrency} ${numericValue.toLocaleString()}`
    }
  }

  return numericValue.toLocaleString()
}

function getConfidencePercent(row: SubmissionHistoryItem, extractedObject: ParsedJson | null) {
  const rawConfidence = row.aiConfidence || getStringValue(getObjectValue(extractedObject, 'confidence'))

  if (rawConfidence.trim().length === 0) {
    return null
  }

  const numericValue = Number(rawConfidence)

  if (!Number.isFinite(numericValue)) {
    return null
  }

  if (numericValue <= 1) {
    return Math.round(numericValue * 100)
  }

  return Math.round(numericValue)
}

function parseCitations(row: SubmissionHistoryItem, extractedObject: ParsedJson | null): ParsedCitation[] {
  const parsedRawCitations = parseJsonValue(row.aiCitations)

  if (Array.isArray(parsedRawCitations)) {
    return parsedRawCitations
      .map((entry) => {
        if (!entry || Array.isArray(entry) || typeof entry !== 'object') {
          return null
        }

        const record = entry as Record<string, unknown>
        const sourceFile = getStringValue(record['source_file'])
        const rowOrCell = getStringValue(record['row_or_cell'])

        if (sourceFile.length === 0 && rowOrCell.length === 0) {
          return null
        }

        return {
          sourceFile,
          rowOrCell,
        }
      })
      .filter((entry): entry is ParsedCitation => entry !== null)
  }

  const responseObject = getNestedObject(extractedObject, 'response')
  const responseCitations = getObjectValue(responseObject, 'citations')

  if (!Array.isArray(responseCitations)) {
    return []
  }

  return responseCitations
    .map((entry) => {
      if (!entry || Array.isArray(entry) || typeof entry !== 'object') {
        return null
      }

      const record = entry as Record<string, unknown>
      const sourceFile = getStringValue(record['source_file'])
      const rowOrCell = getStringValue(record['row_or_cell'])

      if (sourceFile.length === 0 && rowOrCell.length === 0) {
        return null
      }

      return {
        sourceFile,
        rowOrCell,
      }
    })
    .filter((entry): entry is ParsedCitation => entry !== null)
}

export function getSubmissionInsightTone(trafficLight: string) {
  const normalized = trafficLight.trim().toLowerCase()

  if (normalized === 'red') {
    return 'destructive' as const
  }

  if (normalized === 'yellow' || normalized === 'amber') {
    return 'warning' as const
  }

  if (normalized === 'green') {
    return 'success' as const
  }

  return 'secondary' as const
}

export function getAiSubmissionViewModel(row: SubmissionHistoryItem) {
  const extractedObject = parseExtractedObject(row.extractedJson)
  const responseObject = getNestedObject(extractedObject, 'response')
  const calculatedMetrics = getNestedObject(responseObject, 'calculated_metrics')
  const flagsObject = getNestedObject(responseObject, 'flags')
  const escalationObject = getNestedObject(extractedObject, 'escalation')

  const summary = row.aiSummary || getStringValue(getObjectValue(responseObject, 'summary'))
  const intent = row.aiIntent || getStringValue(getObjectValue(extractedObject, 'intent'))
  const confidencePercent = getConfidencePercent(row, extractedObject)
  const citations = parseCitations(row, extractedObject)
  const targetValue = row.aiTargetValue || getStringValue(getObjectValue(calculatedMetrics, 'target_value'))
  const variancePercentage = row.aiVariance || getStringValue(getObjectValue(calculatedMetrics, 'variance_percentage'))
  const redFlags = parseStringArray(row.aiRedFlags)
  const yellowFlags = parseStringArray(row.aiYellowFlags)
  const greenFlags = parseStringArray(row.aiGreenFlags)
  const valuationObject = getNestedObject(extractedObject, 'valuation')
  const investmentThesisObject = getNestedObject(extractedObject, 'investment_thesis')

  const fallbackRedFlags = getStringArray(getObjectValue(flagsObject, 'red_flags'))
  const fallbackYellowFlags = getStringArray(getObjectValue(flagsObject, 'yellow_flags'))
  const fallbackGreenFlags = getStringArray(getObjectValue(flagsObject, 'green_flags'))

  const finalRedFlags = redFlags.length > 0 ? redFlags : fallbackRedFlags
  const finalYellowFlags = yellowFlags.length > 0 ? yellowFlags : fallbackYellowFlags
  const finalGreenFlags = greenFlags.length > 0 ? greenFlags : fallbackGreenFlags

  const reasonCode = row.aiEscalationReason || getStringValue(getObjectValue(escalationObject, 'reason_code'))
  const escalationReasons = parseTextList(reasonCode)
  const valuationCurrency = row.valuationCurrency || getStringValue(getObjectValue(valuationObject, 'currency'))
  const valuationLowerBound = row.valuationLowerBound || getStringValue(getObjectValue(valuationObject, 'lower_bound'))
  const valuationBaseEstimate = row.valuationBaseEstimate || getStringValue(getObjectValue(valuationObject, 'base_estimate'))
  const valuationUpperBound = row.valuationUpperBound || getStringValue(getObjectValue(valuationObject, 'upper_bound'))
  const investmentIsFavorable = typeof row.investmentIsFavorable === 'boolean'
    ? row.investmentIsFavorable
    : getBooleanValue(getObjectValue(investmentThesisObject, 'is_favorable_indicator'))
  const investmentBuyReasoning = row.investmentBuyReasoning || getStringValue(getObjectValue(investmentThesisObject, 'buy_reasoning'))
  const rawMetricsEntries = calculatedMetrics ? Object.entries(calculatedMetrics) : []
  const displayMetrics = rawMetricsEntries
    .filter(([key]) => key !== 'target_value' && key !== 'variance_percentage')
    .map(([key, value]) => ({
      label: formatLabel(key),
      value: formatMetricValue(value),
    }))

  return {
    summary,
    intent,
    confidencePercent,
    citations,
    targetValue,
    variancePercentage,
    redFlags: finalRedFlags,
    yellowFlags: finalYellowFlags,
    greenFlags: finalGreenFlags,
    reasonCode,
    escalationReasons,
    displayMetrics,
    valuationCurrency,
    valuationLowerBound,
    valuationBaseEstimate,
    valuationUpperBound,
    formattedValuationLowerBound: formatCurrencyValue(valuationLowerBound, valuationCurrency),
    formattedValuationBaseEstimate: formatCurrencyValue(valuationBaseEstimate, valuationCurrency),
    formattedValuationUpperBound: formatCurrencyValue(valuationUpperBound, valuationCurrency),
    investmentIsFavorable,
    investmentBuyReasoning,
    extractedObject,
  }
}
