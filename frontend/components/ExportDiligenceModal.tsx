import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../lib/shadcn/card'
import { Button } from '../lib/shadcn/button'
import { Badge } from '../lib/shadcn/badge'
import { Check, Copy, Download, FileText, Printer, Sparkles, X, ShieldAlert, AlertTriangle, ArrowUpRight } from 'lucide-react'
import type { ProjectSynthesisItem, DealModel } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { parseDocumentedFacts } from '../utils/evidence'

interface ExportDiligenceModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    dealName: string
    projectId: string
    synthesis?: ProjectSynthesisItem | null
    dealModel: DealModel
    documents?: SubmissionHistoryItem[]
}

function formatCurrency(val: number | null | undefined): string {
    if (val == null || isNaN(val)) return '—'
    return `$${Math.round(val).toLocaleString()}`
}

function generateMarkdownMemo(
    dealName: string,
    projectId: string,
    synthesis: ProjectSynthesisItem | null | undefined,
    dealModel: DealModel,
    documents?: SubmissionHistoryItem[]
): string {
    const facts = parseDocumentedFacts(dealModel.documentedFactsJson)
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const asking = dealModel.askingPrice || 0
    const valuationBase = synthesis?.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0'
        ? parseFloat(synthesis.valuationBaseEstimate)
        : null

    const lines: string[] = [
        `# INVESTMENT COMMITTEE DILIGENCE MEMORANDUM`,
        `**Product**: Dillon AI by MergeWorks (mergeworks.io)`,
        `**Target Company / Deal**: ${dealName}`,
        `**Project ID**: ${projectId}`,
        `**Date Generated**: ${dateStr}`,
        `**Acquisition Posture**: ${synthesis?.finalTrafficLight?.toUpperCase() || 'EVALUATION IN PROGRESS'} | **Recommendation**: ${synthesis?.finalRecommendation || 'Pending'}`,
        `**Overall Risk Posture**: ${synthesis?.finalRiskLevel || 'Pending'}`,
        '',
        '---',
        '',
        '## 1. Executive Investment Judgment',
        synthesis?.finalJudgmentSummary || 'Diligence synthesis underway for uploaded files.',
        '',
    ]

    if (synthesis?.keyTakeaways && synthesis.keyTakeaways.length > 0) {
        lines.push('### Key Investment Takeaways')
        synthesis.keyTakeaways.forEach(t => lines.push(`- ${t}`))
        lines.push('')
    }

    lines.push('## 2. Core Financial Profile & Valuation')
    lines.push(`- **Asking Price**: ${formatCurrency(asking)}`)
    if (valuationBase) {
        lines.push(`- **AI Valuation Estimate (Base)**: ${formatCurrency(valuationBase)} (Range: ${formatCurrency(parseFloat(synthesis?.valuationLowerBound || '0'))} – ${formatCurrency(parseFloat(synthesis?.valuationUpperBound || '0'))})`)
        const premiumDiscount = asking > 0 ? ((asking - valuationBase) / valuationBase) * 100 : 0
        lines.push(`- **Asking Price Variance**: ${premiumDiscount > 0 ? `+${premiumDiscount.toFixed(1)}% premium over fair value` : `${premiumDiscount.toFixed(1)}% discount`}`)
    }
    if (dealModel.baseEbitdaMargin) {
        lines.push(`- **Base EBITDA Margin**: ${(dealModel.baseEbitdaMargin * 100).toFixed(1)}%`)
    }
    if (dealModel.baseRevenueGrowth) {
        lines.push(`- **Projected Revenue Growth**: ${(dealModel.baseRevenueGrowth * 100).toFixed(1)}%`)
    }
    lines.push('')

    lines.push('### Documented Financial Facts')
    lines.push('| Metric | Value | Verification Status | Source Reference |')
    lines.push('| :--- | :--- | :--- | :--- |')
    for (const [key, fact] of Object.entries(facts)) {
        if (fact && fact.value != null) {
            const valStr = typeof fact.value === 'number' ? formatCurrency(fact.value) : String(fact.value)
            lines.push(`| ${key} | ${valStr} | ${fact.status} | ${fact.provenance || 'Uploaded records'} |`)
        }
    }
    lines.push('')

    if (synthesis?.redFlags && synthesis.redFlags.length > 0) {
        lines.push('## 3. High-Priority Red Flags & Deal Risks')
        synthesis.redFlags.forEach((f, idx) => lines.push(`${idx + 1}. ⚠️ **${f}**`))
        lines.push('')
    }

    if (synthesis?.yellowFlags && synthesis.yellowFlags.length > 0) {
        lines.push('### Yellow Caution Items')
        synthesis.yellowFlags.forEach(f => lines.push(`- ⚡ ${f}`))
        lines.push('')
    }

    if (synthesis?.crossDocumentConflicts && synthesis.crossDocumentConflicts.length > 0) {
        lines.push('### Cross-Document Variances & Conflicts')
        synthesis.crossDocumentConflicts.forEach(c => lines.push(`- ⚖️ ${c}`))
        lines.push('')
    }

    if (synthesis?.negotiationLevers && synthesis.negotiationLevers.length > 0) {
        lines.push('## 4. Key Negotiation Levers & Purchase Price Offsets')
        synthesis.negotiationLevers.forEach((l, idx) => lines.push(`${idx + 1}. **${l}**`))
        lines.push('')
    }

    if (synthesis?.openQuestions && synthesis.openQuestions.length > 0) {
        lines.push('## 5. Outstanding Management & Seller Questions')
        synthesis.openQuestions.forEach(q => lines.push(`- [ ] ${q}`))
        lines.push('')
    }

    if (documents && documents.length > 0) {
        lines.push('## 6. Audit Trail & Document Ingestion Log')
        documents.forEach(d => {
            lines.push(`- **${d.fileName}** — Type: ${d.documentType || 'General'} | Status: ${d.status || 'Processed'}`)
        })
        lines.push('')
    }

    lines.push('---')
    lines.push(`*Generated autonomously by Dillon AI Diligence Engine (MergeWorks.io) — Confidential for Investment Review.*`)

    return lines.join('\n')
}

export function ExportDiligenceModal({
    open,
    onOpenChange,
    dealName,
    projectId,
    synthesis,
    dealModel,
    documents
}: ExportDiligenceModalProps) {
    const [copied, setCopied] = useState(false)

    if (!open) return null

    const markdownContent = generateMarkdownMemo(dealName, projectId, synthesis, dealModel, documents)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(markdownContent)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback
        }
    }

    const handleDownloadMarkdown = () => {
        const safeName = (dealName || 'Diligence').replace(/[^a-zA-Z0-9_-]/g, '_')
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `${safeName}_Diligence_Memorandum.md`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=900,height=800')
        if (!printWindow) return

        const asking = dealModel.askingPrice ? formatCurrency(dealModel.askingPrice) : 'Not specified'
        const baseVal = synthesis?.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0'
            ? formatCurrency(parseFloat(synthesis.valuationBaseEstimate))
            : 'Pending'
        const facts = parseDocumentedFacts(dealModel.documentedFactsJson)
        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

        const factRowsHtml = Object.entries(facts)
            .filter(([_, fact]) => fact && fact.value != null)
            .map(([k, fact]) => `
                <tr>
                    <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${k}</td>
                    <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${typeof fact.value === 'number' ? formatCurrency(fact.value) : fact.value}</td>
                    <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; color: #475569;">${fact.status}</td>
                    <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 11px;">${fact.provenance || 'Uploaded doc'}</td>
                </tr>
            `).join('')

        const redFlagsHtml = (synthesis?.redFlags || [])
            .map(f => `<li style="margin-bottom: 6px; color: #991b1b;"><strong>⚠️ ${f}</strong></li>`)
            .join('')

        const leversHtml = (synthesis?.negotiationLevers || [])
            .map(l => `<li style="margin-bottom: 6px; color: #0f172a;">${l}</li>`)
            .join('')

        const takeawaysHtml = (synthesis?.keyTakeaways || [])
            .map(t => `<li style="margin-bottom: 6px; color: #1e293b;">${t}</li>`)
            .join('')

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${dealName} - Diligence Memorandum</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        color: #0f172a;
                        background: #ffffff;
                        line-height: 1.5;
                        padding: 32px 40px;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    .header {
                        border-bottom: 2px solid #0f172a;
                        padding-bottom: 16px;
                        margin-bottom: 24px;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                    }
                    .title { font-size: 22px; font-weight: 800; margin: 0 0 4px 0; color: #0f172a; }
                    .subtitle { font-size: 13px; color: #64748b; margin: 0; }
                    .badge {
                        display: inline-block;
                        padding: 4px 10px;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: 700;
                        text-transform: uppercase;
                        background: #f1f5f9;
                        border: 1px solid #cbd5e1;
                    }
                    .badge-green { background: #dcfce7; color: #166534; border-color: #86efac; }
                    .badge-yellow { background: #fef9c3; color: #854d0e; border-color: #fde047; }
                    .badge-red { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
                    h2 { font-size: 15px; font-weight: 700; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 24px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                    .metrics-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 12px;
                        margin-bottom: 16px;
                    }
                    .metric-box {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        padding: 10px 14px;
                    }
                    .metric-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
                    .metric-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 2px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
                    th { background: #f8fafc; text-align: left; padding: 6px 10px; border-bottom: 2px solid #cbd5e1; font-weight: 700; }
                    ul, ol { margin-top: 4px; padding-left: 20px; font-size: 12.5px; }
                    .footer {
                        margin-top: 36px;
                        border-top: 1px solid #e2e8f0;
                        padding-top: 12px;
                        font-size: 11px;
                        color: #94a3b8;
                        display: flex;
                        justify-content: space-between;
                    }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 class="title">${dealName}</h1>
                        <p class="subtitle">Investment Committee Diligence Memorandum &middot; Dillon AI by MergeWorks</p>
                        <p class="subtitle" style="margin-top: 4px; font-size: 11.5px;">Project ID: ${projectId} &middot; Date: ${dateStr}</p>
                    </div>
                    <div>
                        <span class="badge ${synthesis?.finalTrafficLight?.toLowerCase() === 'green' ? 'badge-green' : synthesis?.finalTrafficLight?.toLowerCase() === 'red' ? 'badge-red' : 'badge-yellow'}">
                            ${synthesis?.finalTrafficLight || 'Pending'} &middot; ${synthesis?.finalRecommendation || 'Review'}
                        </span>
                    </div>
                </div>

                <div class="metrics-grid">
                    <div class="metric-box">
                        <div class="metric-label">Asking Price</div>
                        <div class="metric-val">${asking}</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-label">AI Valuation (Base)</div>
                        <div class="metric-val">${baseVal}</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-label">Risk Rating</div>
                        <div class="metric-val">${synthesis?.finalRiskLevel || 'Pending'}</div>
                    </div>
                </div>

                <h2>1. Executive Synthesis & Judgment</h2>
                <p style="font-size: 13px; line-height: 1.6; color: #1e293b;">
                    ${synthesis?.finalJudgmentSummary || 'Diligence synthesis pending.'}
                </p>
                ${takeawaysHtml ? `<ul style="margin-top: 8px;">${takeawaysHtml}</ul>` : ''}

                <h2>2. Key Financial Facts & Evidence</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                            <th>Status</th>
                            <th>Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${factRowsHtml || '<tr><td colspan="4" style="text-align: center; padding: 12px;">No documented facts parsed.</td></tr>'}
                    </tbody>
                </table>

                ${redFlagsHtml ? `
                    <h2>3. High-Priority Red Flags & Deal Risks</h2>
                    <ul>${redFlagsHtml}</ul>
                ` : ''}

                ${leversHtml ? `
                    <h2>4. Strategic Negotiation Levers</h2>
                    <ol>${leversHtml}</ol>
                ` : ''}

                <div class="footer">
                    <span>MergeWorks Dillon AI Diligence Platform (mergeworks.io)</span>
                    <span>Confidential &middot; Page 1 of 1</span>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `)
        printWindow.document.close()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200">
            <Card className="relative w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border-primary/20 bg-card text-card-foreground">
                <CardHeader className="border-b border-border/60 pb-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <CardTitle className="text-lg font-bold">Export Diligence Memorandum</CardTitle>
                                <Badge variant="outline" className="text-[11px] font-semibold text-primary border-primary/40 bg-primary/10">
                                    Dillon AI
                                </Badge>
                            </div>
                            <CardDescription className="text-xs text-muted-foreground mt-1">
                                Generate an Investment Committee memo for <strong className="text-foreground">{dealName || 'Active Target'}</strong>
                            </CardDescription>
                        </div>
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none p-1"
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button
                            type="button"
                            variant="default"
                            onClick={handlePrint}
                            className="h-auto flex flex-col items-center justify-center gap-1.5 p-3.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-center"
                        >
                            <Printer className="h-5 w-5 mb-0.5" />
                            <span className="font-semibold text-xs">Print / Save as PDF</span>
                            <span className="text-[10px] text-primary-foreground/80 font-normal">Formatted 1-page executive memo</span>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDownloadMarkdown}
                            className="h-auto flex flex-col items-center justify-center gap-1.5 p-3.5 border-primary/30 hover:bg-primary/5 text-center"
                        >
                            <Download className="h-5 w-5 text-primary mb-0.5" />
                            <span className="font-semibold text-xs">Download Markdown</span>
                            <span className="text-[10px] text-muted-foreground font-normal">Raw .md dossier with data tables</span>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCopy}
                            className="h-auto flex flex-col items-center justify-center gap-1.5 p-3.5 border-border hover:bg-muted text-center"
                        >
                            {copied ? <Check className="h-5 w-5 text-emerald-500 mb-0.5" /> : <Copy className="h-5 w-5 text-muted-foreground mb-0.5" />}
                            <span className="font-semibold text-xs">{copied ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">Quick paste into email or doc</span>
                        </Button>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-foreground border-b border-border/50 pb-1.5">
                            <span className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-primary" />
                                Memorandum Preview
                            </span>
                            <span className="text-[11px] text-muted-foreground font-normal">
                                {synthesis?.finalRecommendation || 'Ready for export'}
                            </span>
                        </div>
                        <div className="max-h-60 overflow-y-auto rounded bg-background/80 p-3 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap select-all border border-border/50">
                            {markdownContent}
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex justify-end border-t border-border/60 pt-3 pb-3">
                    <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
export default ExportDiligenceModal
