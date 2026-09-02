import type { ManualDealFormData } from './manualDealIntake'
import type { Cell } from 'exceljs'
import { parseFlexibleFinancialValue } from './manualDealIntake'

export const MAX_QUESTIONNAIRE_IMPORT_BYTES = 5 * 1024 * 1024

export type QuestionnaireImportField = keyof ManualDealFormData

export interface RecognizedQuestionnaireField {
    field: QuestionnaireImportField
    label: string
    value: ManualDealFormData[QuestionnaireImportField]
    source: string
}

export interface QuestionnaireImportResult {
    values: Partial<ManualDealFormData>
    recognized: RecognizedQuestionnaireField[]
    warnings: string[]
    sourceText: string
}

type FieldSpec = {
    field: QuestionnaireImportField
    label: string
    aliases: string[]
    parse: (value: string) => ManualDealFormData[QuestionnaireImportField] | null
}

type SourceLine = {
    text: string
    source: string
}

const money = (value: string) => bounded(parseFlexibleFinancialValue(value), 0, 10_000_000_000)
const integer = (value: string) => bounded(parseFlexibleFinancialValue(value), 0, 1_000_000, true)
const percent = (value: string) => bounded(parseFlexibleFinancialValue(value.replace(/%/g, '')), 0, 100)
const years = (value: string) => bounded(parseFlexibleFinancialValue(value.replace(/years?|yrs?/gi, '')), 0, 50)
const text = (value: string) => {
    const normalized = value.trim().replace(/\s+/g, ' ')
    return normalized ? normalized.slice(0, 500) : null
}

function bounded(value: number | null, min: number, max: number, round = false): number | null {
    if (value === null || value < min || value > max) return null
    return round ? Math.round(value) : value
}

const FIELD_SPECS: FieldSpec[] = [
    { field: 'dealName', label: 'Company / Deal Name', aliases: ['company name', 'deal name', 'business name', 'target company', 'target'], parse: text },
    { field: 'industry', label: 'Industry', aliases: ['industry', 'industry sector', 'sector', 'business type'], parse: text },
    { field: 'employeeCount', label: 'Employees', aliases: ['employees', 'employee count', 'headcount', 'fte', 'full time employees'], parse: integer },
    { field: 'askingPrice', label: 'Asking Price', aliases: ['asking price', 'seller ask', 'asking valuation', 'target price', 'purchase price'], parse: money },
    { field: 'annualRevenue', label: 'Annual Revenue', aliases: ['annual revenue', 'ttm revenue', 'trailing twelve month revenue', 'revenue', 'sales'], parse: money },
    { field: 'reportedEbitda', label: 'Reported EBITDA / SDE', aliases: ['reported ebitda', 'adjusted ebitda', 'normalized ebitda', 'ebitda', 'reported sde', 'seller discretionary earnings', 'sde'], parse: money },
    { field: 'grossMarginPercent', label: 'Gross Margin', aliases: ['gross margin', 'gross margin percent', 'gross profit margin'], parse: percent },
    { field: 'ownerCompensation', label: 'Owner Compensation', aliases: ['owner compensation', 'owner salary', 'owner comp'], parse: money },
    { field: 'disallowedAddBacks', label: 'Disallowed Add-Backs', aliases: ['disallowed add backs', 'disallowed add-backs', 'non qualifying add backs', 'non-qualifying add-backs'], parse: money },
    { field: 'cashIncluded', label: 'Cash Included', aliases: ['cash included', 'cash and equivalents', 'cash & equivalents'], parse: money },
    { field: 'accountsReceivable', label: 'Accounts Receivable', aliases: ['accounts receivable', 'a/r', 'ar'], parse: money },
    { field: 'inventory', label: 'Inventory', aliases: ['inventory'], parse: money },
    { field: 'equipmentAndVehicles', label: 'Equipment & Vehicles', aliases: ['equipment and vehicles', 'equipment & vehicles', 'machinery and equipment', 'equipment'], parse: money },
    { field: 'accountsPayable', label: 'Accounts Payable', aliases: ['accounts payable', 'a/p', 'ap'], parse: money },
    { field: 'longTermDebt', label: 'Long-Term Debt', aliases: ['long term debt', 'long-term debt', 'total debt', 'debt assumed'], parse: money },
    { field: 'equityContributionPercent', label: 'Buyer Equity', aliases: ['buyer equity', 'equity contribution', 'down payment'], parse: percent },
    { field: 'interestRate', label: 'Interest Rate', aliases: ['interest rate', 'senior debt rate', 'sba rate'], parse: percent },
    { field: 'amortizationYears', label: 'Amortization', aliases: ['amortization', 'amortization term', 'loan term'], parse: years },
    { field: 'sellerNoteAmount', label: 'Seller Note', aliases: ['seller note', 'seller financing', 'seller financing amount'], parse: money },
    { field: 'topCustomerConcentrationPercent', label: 'Top Customer Concentration', aliases: ['top customer concentration', 'largest customer concentration', 'customer concentration'], parse: percent },
]

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findRawMatches(lines: SourceLine[], aliases: string[]): Array<{ raw: string; source: string }> {
    const aliasPattern = aliases
        .slice()
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp)
        .join('|')
    const inlinePattern = new RegExp(`^(?:${aliasPattern})(?:\\s*\\([^)]*\\))?\\s*(?::|=|[-–—]|\\t)\\s*(.+)$`, 'i')
    const exactPattern = new RegExp(`^(?:${aliasPattern})(?:\\s*\\([^)]*\\))?\\s*$`, 'i')
    const matches: Array<{ raw: string; source: string }> = []

    lines.forEach((line, index) => {
        const inline = line.text.match(inlinePattern)
        if (inline?.[1]?.trim()) {
            matches.push({ raw: inline[1].trim(), source: line.source })
            return
        }

        if (exactPattern.test(line.text)) {
            const nextValue = lines[index + 1]
            if (nextValue) matches.push({ raw: nextValue.text, source: `${line.source} → ${nextValue.source}` })
        }
    })

    return matches
}

function comparable(value: unknown): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : JSON.stringify(value)
}

function parseQuestionnaireSourceLines(lines: SourceLine[], sourceText: string): QuestionnaireImportResult {
    const normalizedLines = lines
        .map((line) => ({
            text: line.text.replace(/\u00a0/g, ' ').trim().replace(/\s+/g, ' '),
            source: line.source,
        }))
        .filter((line) => Boolean(line.text))
    const values: Partial<ManualDealFormData> = {}
    const recognized: RecognizedQuestionnaireField[] = []
    const warnings: string[] = []

    for (const spec of FIELD_SPECS) {
        const parsedMatches = findRawMatches(normalizedLines, spec.aliases)
            .map((match) => ({ ...match, value: spec.parse(match.raw) }))
            .filter((match) => match.value !== null)
        const unique = new Map(parsedMatches.map((match) => [comparable(match.value), match]))

        if (unique.size > 1) {
            warnings.push(`Multiple values were found for ${spec.label}; review and enter it manually.`)
            continue
        }

        const match = unique.values().next().value as (typeof parsedMatches)[number] | undefined
        if (!match) continue
        ;(values as Record<string, unknown>)[spec.field] = match.value
        recognized.push({
            field: spec.field,
            label: spec.label,
            value: match.value as string | number,
            source: match.source,
        })
    }

    const name = values.dealName
    if (typeof name === 'string') values.companyName = name

    const ebitdaSource = recognized.find((field) => field.field === 'reportedEbitda')?.source.toLowerCase() ?? ''
    if (/\bsde\b|seller discretionary earnings/.test(ebitdaSource)) {
        values.ebitdaOrSdeType = 'SDE'
        recognized.push({ field: 'ebitdaOrSdeType', label: 'Earnings Type', value: 'SDE', source: ebitdaSource })
    } else if (values.reportedEbitda !== undefined) {
        values.ebitdaOrSdeType = 'EBITDA'
        recognized.push({ field: 'ebitdaOrSdeType', label: 'Earnings Type', value: 'EBITDA', source: ebitdaSource })
    }

    const locationMatches = findRawMatches(normalizedLines, ['location', 'headquarters', 'hq'])
    if (locationMatches.length === 1) {
        const location = locationMatches[0].raw.match(/^(.+?),\s*([A-Za-z]{2})$/)
        if (location) {
            values.city = location[1].trim()
            values.state = location[2].toUpperCase()
            recognized.push({ field: 'city', label: 'City', value: values.city, source: locationMatches[0].source })
            recognized.push({ field: 'state', label: 'State', value: values.state, source: locationMatches[0].source })
        }
    }

    const keyPersonMatches = findRawMatches(normalizedLines, ['key person risk', 'owner dependency', 'key person dependency'])
    if (keyPersonMatches.length === 1) {
        const normalizedRisk = keyPersonMatches[0].raw.toLowerCase()
        const risk = normalizedRisk.match(/\b(low|moderate|medium|high)\b/)?.[1]
        if (risk) {
            values.keyPersonRisk = risk === 'medium' ? 'moderate' : risk as 'low' | 'moderate' | 'high'
            recognized.push({ field: 'keyPersonRisk', label: 'Key Person Risk', value: values.keyPersonRisk, source: keyPersonMatches[0].source })
        }
    }

    if (recognized.length === 0) {
        warnings.push('No supported labeled deal statistics were found. Paste label/value lines or enter the four screening fields manually.')
    }

    return { values, recognized, warnings, sourceText }
}

export function parseQuestionnaireText(sourceText: string): QuestionnaireImportResult {
    const lines = sourceText
        .replace(/\u00a0/g, ' ')
        .split(/\r?\n/)
        .map((line, index) => ({ text: line, source: `Line ${index + 1}: ${line.trim()}` }))
    return parseQuestionnaireSourceLines(lines, sourceText)
}

function splitDelimitedRow(row: string, delimiter: ',' | '\t'): string[] {
    if (delimiter === '\t') return row.split('\t').map((value) => value.trim())

    const values: string[] = []
    let current = ''
    let quoted = false
    for (let index = 0; index < row.length; index += 1) {
        const character = row[index]
        if (character === '"') {
            if (quoted && row[index + 1] === '"') {
                current += '"'
                index += 1
            } else {
                quoted = !quoted
            }
        } else if (character === delimiter && !quoted) {
            values.push(current.trim())
            current = ''
        } else {
            current += character
        }
    }
    values.push(current.trim())
    return values
}

function parseDelimitedQuestionnaireText(sourceText: string, delimiter: ',' | '\t'): QuestionnaireImportResult {
    const lines: SourceLine[] = []
    sourceText.split(/\r?\n/).forEach((row, rowIndex) => {
        const values = splitDelimitedRow(row, delimiter).filter(Boolean)
        if (values.length < 2) {
            if (values[0]) lines.push({ text: values[0], source: `Row ${rowIndex + 1}` })
            return
        }
        const label = values[0]
        values.slice(1).forEach((value, valueIndex) => {
            lines.push({
                text: `${label}: ${value}`,
                source: `Row ${rowIndex + 1}, columns 1 and ${valueIndex + 2} — ${label}: ${value}`,
            })
        })
    })
    return parseQuestionnaireSourceLines(lines, sourceText)
}

function flattenJsonQuestionnaire(value: unknown, path = '$', depth = 0): SourceLine[] {
    if (!value || typeof value !== 'object' || depth > 2) return []
    const lines: SourceLine[] = []
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        const childPath = `${path}.${key}`
        if (typeof child === 'string' || typeof child === 'number') {
            lines.push({ text: `${key.replace(/[_-]+/g, ' ')}: ${child}`, source: `JSON ${childPath}` })
        } else if (child && typeof child === 'object' && !Array.isArray(child)) {
            lines.push(...flattenJsonQuestionnaire(child, childPath, depth + 1))
        }
    }
    return lines
}

async function parseJsonQuestionnaireFile(file: File): Promise<QuestionnaireImportResult> {
    let data: unknown
    try {
        data = JSON.parse(await file.text())
    } catch {
        throw new Error('The JSON file could not be read. Confirm it contains one valid JSON object.')
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('The JSON questionnaire must contain one object with labeled deal fields.')
    }
    return parseQuestionnaireSourceLines(flattenJsonQuestionnaire(data), JSON.stringify(data))
}

async function parseSpreadsheetQuestionnaireFile(file: File): Promise<QuestionnaireImportResult> {
    try {
        const ExcelJS = (await import('exceljs')).default
        const workbook = new ExcelJS.Workbook()
        const bytes = new Uint8Array(await file.arrayBuffer())
        type WorkbookLoadInput = Parameters<typeof workbook.xlsx.load>[0]
        await workbook.xlsx.load(bytes as unknown as WorkbookLoadInput)
        const lines: SourceLine[] = []

        workbook.eachSheet((worksheet) => {
            worksheet.eachRow((row) => {
                const populated: Cell[] = []
                row.eachCell({ includeEmpty: false }, (cell) => {
                    if (cell.text.trim()) populated.push(cell)
                })
                if (populated.length < 2) return
                const labelCell = populated[0]
                const label = labelCell.text.trim()
                populated.slice(1).forEach((valueCell) => {
                    const value = valueCell.text.trim()
                    lines.push({
                        text: `${label}: ${value}`,
                        source: `${worksheet.name}!${labelCell.address}:${valueCell.address} — ${label}: ${value}`,
                    })
                })
            })
        })

        const sourceText = lines.map((line) => line.source).join('\n')
        const parsed = parseQuestionnaireSourceLines(lines, sourceText)
        if (workbook.worksheets.length > 1) {
            parsed.warnings.push(`Reviewed ${workbook.worksheets.length} worksheets; conflicting values were left unapplied.`)
        }
        return parsed
    } catch (error) {
        if (error instanceof Error && /Multiple values|No supported/.test(error.message)) throw error
        throw new Error('The spreadsheet could not be read. Confirm it is a valid .xlsx/.xlsm file or export the summary sheet as CSV.')
    }
}

export async function extractQuestionnaireTextFromFile(file: File): Promise<{ text: string; warnings: string[] }> {
    if (file.size > MAX_QUESTIONNAIRE_IMPORT_BYTES) {
        throw new Error('The file is larger than 5 MB. Use a one-page teaser or paste the relevant statistics instead.')
    }

    const extension = file.name.toLowerCase().split('.').pop() ?? ''
    if (extension === 'doc' || extension === 'docm') {
        throw new Error('Legacy or macro-enabled Word files are not supported. Save a copy as .docx or paste the statistics.')
    }
    if (extension === 'txt' || extension === 'csv' || extension === 'tsv') {
        return { text: await file.text(), warnings: [] }
    }
    if (extension !== 'docx') {
        throw new Error('Use a .docx, .xlsx, .xlsm, .txt, .csv, .tsv, or .json file, or paste the statistics directly.')
    }

    try {
        const mammoth = await import('mammoth')
        const arrayBuffer = await file.arrayBuffer()
        // Mammoth's browser bundle consumes ArrayBuffer; its Node/Vitest build consumes Buffer.
        const input = typeof Buffer === 'undefined'
            ? { arrayBuffer }
            : { buffer: Buffer.from(arrayBuffer) }
        const result = await mammoth.extractRawText(input)
        const warnings = result.messages.map((message) => message.message).filter(Boolean)
        return { text: result.value, warnings }
    } catch {
        throw new Error('The Word file could not be read. Confirm it is a valid .docx file or paste the statistics instead.')
    }
}

export async function parseQuestionnaireFile(file: File): Promise<QuestionnaireImportResult> {
    if (file.size > MAX_QUESTIONNAIRE_IMPORT_BYTES) {
        throw new Error('The file is larger than 5 MB. Use a one-page teaser or send the source through Project Intake instead.')
    }
    const extension = file.name.toLowerCase().split('.').pop() ?? ''
    if (extension === 'xlsx' || extension === 'xlsm') return parseSpreadsheetQuestionnaireFile(file)
    if (extension === 'json') return parseJsonQuestionnaireFile(file)
    const extracted = await extractQuestionnaireTextFromFile(file)
    const parsed = extension === 'csv'
        ? parseDelimitedQuestionnaireText(extracted.text, ',')
        : extension === 'tsv'
            ? parseDelimitedQuestionnaireText(extracted.text, '\t')
            : parseQuestionnaireText(extracted.text)
    return { ...parsed, warnings: [...extracted.warnings, ...parsed.warnings] }
}

export function formatQuestionnaireImportValue(value: unknown): string {
    if (typeof value === 'number') return value.toLocaleString('en-US')
    return String(value)
}
