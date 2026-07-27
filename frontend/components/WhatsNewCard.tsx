import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type ChangelogEntry = {
    date: string
    title: string
    description: string
    category: 'feature' | 'improvement' | 'fix'
}

const CHANGELOG: ChangelogEntry[] = [
    { date: '2026-07-27', title: 'Term Sheet Generator', description: 'Auto-generates a draft term sheet summary from model assumptions and documented facts. Shows financing structure, key terms, conditions, and open issues. Copy to clipboard.', category: 'feature' },
    { date: '2026-07-27', title: 'SMB Benchmark Comparison', description: 'Visual range chart comparing deal metrics (entry multiple, EBITDA margin, growth, payback, DSCR) against typical SMB acquisition benchmarks with dot position and grades.', category: 'feature' },
    { date: '2026-07-27', title: 'Owner Dependency Risk Score', description: 'Scans synthesis flags for 5 owner/founder dependency indicators (client relationships, revenue generation, management depth, licenses, vendor ties). Scores 0-100 with mitigations.', category: 'feature' },
    { date: '2026-07-27', title: 'Payback Timeline Chart', description: '10-year cumulative cash flow bar chart showing when total investment is recovered. Includes annual growth assumption and highlights the payback year.', category: 'feature' },
    { date: '2026-07-27', title: 'Monte Carlo Simulation', description: '1,000-scenario probability simulation varying growth, margin, and exit multiple. Shows MOIC distribution histogram, loss probability, 2x/3x chances, and percentile outcomes.', category: 'feature' },
    { date: '2026-07-27', title: 'Negotiation Impact Calculator', description: 'Shows potential dollar savings from common negotiation levers: price reduction, seller note, reduced equity, earnout, consulting credit. Ranked by impact with difficulty badges.', category: 'feature' },
    { date: '2026-07-27', title: 'Breakeven Analysis', description: 'Visual bars showing current performance vs minimum thresholds for debt service coverage, revenue breakeven, and exit EBITDA for 1x MOIC. Green/red margin indicators.', category: 'feature' },
    { date: '2026-07-27', title: 'Quantitative test fixtures', description: 'Added 5 mock deal model scenarios (healthy, high-growth, distressed, minimal data, zero EBITDA) with comprehensive tests for card calculations.', category: 'improvement' },
    { date: '2026-07-27', title: 'Deal Stack Builder', description: 'Visual stacked bar showing acquisition funding breakdown: buyer equity, senior debt, seller note with percentages. Shows total capital required and leverage ratio.', category: 'feature' },
    { date: '2026-07-27', title: 'Growth Sensitivity Tornado', description: 'Bidirectional tornado chart showing how revenue growth ±5%, margin ±2%, and exit multiple ±1x impact business value. Focus negotiations on the widest bars.', category: 'feature' },
    { date: '2026-07-27', title: 'Base Return Metrics (All Cash)', description: 'Simple ROI, payback period, annual return, and 5-year return in a 2×2 grid. All-cash scenario with color-coded thresholds.', category: 'feature' },
    { date: '2026-07-27', title: '5-Year Revenue Bridge', description: 'Revenue growth decomposition into volume growth (60%), price increases (30%), and new products (10%) with horizontal bars showing current → future revenue.', category: 'feature' },
    { date: '2026-07-27', title: 'Business Value Evolution', description: '5-year investment growth projection showing current → future value with annualized return. Revenue and EBITDA comparison bars.', category: 'feature' },
    { date: '2026-07-27', title: 'Cash-on-Cash Calculator', description: 'Interactive sliders for down payment, interest rate, and loan term. Live-calculates debt service, cash flow, cash-on-cash return, and DSCR.', category: 'feature' },
    { date: '2026-07-27', title: 'Valuation Gap Analysis', description: 'Asking price vs fair value vs total potential value with gap percentage. Shows productivity gains and margin improvement estimates.', category: 'feature' },
    { date: '2026-07-27', title: 'Asset Composition Chart', description: 'Stacked horizontal bar showing asset breakdown: cash, AR, inventory, real estate, equipment, IP, goodwill with percentages and color-coded legend.', category: 'feature' },
    { date: '2026-07-27', title: 'Cross-tab card placement', description: 'Analysis cards now appear on their most relevant tabs: ValuationGap on Valuation, CashOnCash on Returns, Growth cards on Growth, DealStack on Structure.', category: 'improvement' },
    { date: '2026-07-27', title: 'Deal Fit Analysis', description: 'Two-column pros/cons with severity dots evaluating multiples, margins, red flags, negotiation levers, open questions, and missing docs.', category: 'feature' },
    { date: '2026-07-27', title: 'Deal Type Classification', description: 'Auto-classifies deals as Growth Story, Cash Cow, Premium, or Turnaround with risk level, opportunity summary, and recommended actions.', category: 'feature' },
    { date: '2026-07-27', title: 'Industry Percentile Rankings', description: 'Where this deal ranks vs SMB market on entry multiple, revenue multiple, EBITDA margin, and revenue/employee with percentile bars.', category: 'feature' },
    { date: '2026-07-27', title: 'Investment Metrics', description: 'IRR, total cash flow, total ROI, and cash flow multiple computed from deal model assumptions with color thresholds.', category: 'feature' },
    { date: '2026-07-27', title: 'Financing Scenarios Comparison', description: 'All Cash vs 25% Down vs 50% Down side-by-side showing debt service, cash flow, cash-on-cash return, and payback bars.', category: 'feature' },
    { date: '2026-07-27', title: 'Business Snapshot', description: 'Company overview card showing name, location, employees, industry badge, and AI-generated summary from synthesis.', category: 'feature' },
    { date: '2026-07-27', title: 'Risk-Adjusted Valuation', description: 'Bear/Base/Bull scenarios with probability-weighted valuations, colored bars, expected value, and asking-vs-expected analysis.', category: 'feature' },
    { date: '2026-07-27', title: 'Opportunity Score', description: 'Score 0-100 across 5 criteria (EBITDA multiple, revenue multiple, margin, payback, risk) with benchmark comparisons and progress bars.', category: 'feature' },
    { date: '2026-07-27', title: 'Key Stats with Formulas', description: 'Enterprise value, annual ROI, payback, asset coverage, revenue/employee, EBITDA margin, net worth, debt-to-asset. Hover for formula tooltips.', category: 'feature' },
    { date: '2026-07-27', title: 'Deal Analysis Scores', description: 'Circular SVG gauges for Overall, Valuation, Cash Flow, Risk, and Growth scores (0-100) with weighted composite and color coding.', category: 'feature' },
    { date: '2026-07-27', title: 'Chat agent with tools', description: 'n8n Chat Assistant now has a Code Tool for programmatic cross-project data queries. Agent receives full deal context, not just the question.', category: 'improvement' },
    { date: '2026-07-26', title: 'Quick valuation ranges', description: 'Back-of-napkin valuation showing EBITDA multiple, revenue multiple, and DCF-lite ranges with a price marker showing where the asking price falls.', category: 'feature' },
    { date: '2026-07-26', title: 'Analysis confidence meter', description: 'Circular gauge showing overall confidence across 4 dimensions: data volume, financial confirmation, AI synthesis quality, and model inputs.', category: 'feature' },
    { date: '2026-07-26', title: 'Seller questions generator', description: 'Auto-generates the top 5 professional questions to ask the seller based on red flags, open questions, and data gaps. Copy to clipboard.', category: 'feature' },
    { date: '2026-07-26', title: 'Closing checklist', description: 'Auto-filled 12-point closing readiness checklist organized by category (financial, operational, deal, legal). Shows percentage ready with progress bar.', category: 'feature' },
    { date: '2026-07-26', title: 'Key person risk detection', description: 'Automatically identifies owner/founder dependency from synthesis flags. Shows mitigation strategies (non-compete, consulting agreement, earn-out).', category: 'feature' },
    { date: '2026-07-26', title: 'Risk matrix (2×2)', description: 'Maps all red and yellow flags into a likelihood × impact matrix with four quadrants: Critical, Monitor, Investigate, and Accept.', category: 'feature' },
    { date: '2026-07-26', title: 'Decision framework', description: 'Four key go/no-go questions auto-answered from deal data: affordability, business health, growth potential, and risk understanding. Shows overall verdict.', category: 'feature' },
    { date: '2026-07-26', title: 'Investment thesis generator', description: 'Auto-generates a 3-sentence investment thesis covering what the deal is, why it is interesting, and the risk/reward balance. Copy to clipboard.', category: 'feature' },
    { date: '2026-07-26', title: 'What\'s missing diagnostic', description: 'Auto-identifies critical, important, and nice-to-have data gaps with explanations of why each matters.', category: 'feature' },
    { date: '2026-07-26', title: 'Assumption gaps detection', description: 'Highlights where model assumptions diverge significantly from documented facts, with percentage differences.', category: 'feature' },
    { date: '2026-07-26', title: 'Time-to-close estimator', description: 'Shows estimated weeks to close based on current deal stage, plus potential delays from missing data or incomplete analysis.', category: 'feature' },
    { date: '2026-07-26', title: 'Financial health ratios', description: 'Key financial ratios (EBITDA margin, gross margin, leverage, multiples, payback) with color-coded benchmarks.', category: 'feature' },
    { date: '2026-07-26', title: 'Deal profile radar chart', description: 'SVG radar visualization showing 5 deal dimensions (Pricing, Margins, Safety, Data, Upside) at a glance.', category: 'feature' },
    { date: '2026-07-26', title: 'Math checks show calculations', description: 'Deterministic checks now show the formula and actual vs expected values inline, without needing to click.', category: 'improvement' },
    { date: '2026-07-26', title: 'Chat typing timer', description: 'Shows elapsed seconds while waiting for AI response, so you know the request is still processing.', category: 'improvement' },
    { date: '2026-07-26', title: 'Press C to open chat', description: 'Keyboard shortcut: press C anywhere (outside inputs) to open the AI Deal Assistant.', category: 'improvement' },
    { date: '2026-07-26', title: 'Enhanced deal memo export', description: 'Deal memo now includes quick analysis section with entry multiple, margin, payback, and green flags.', category: 'improvement' },
    { date: '2026-07-26', title: 'Overview section dividers', description: 'Overview page now organized into clear sections: Scoring & Progress, Analysis & Insights, Risk Assessment, and Negotiation & Closing.', category: 'improvement' },
    { date: '2026-07-26', title: 'Quick insights auto-analysis', description: 'Auto-generated one-liner insights comparing your deal metrics to market norms — entry multiple, margin, payback, valuation gap, and projected MOIC.', category: 'feature' },
    { date: '2026-07-26', title: 'Next actions checklist', description: 'Dynamic action items showing exactly what to do next — uploads needed, missing data, red flags to investigate, open questions to resolve. Progress bar tracks completion.', category: 'feature' },
    { date: '2026-07-26', title: 'Chat markdown rendering', description: 'AI Deal Assistant responses now render bold text, bullet points, and headers properly instead of raw markdown characters.', category: 'improvement' },
    { date: '2026-07-26', title: 'Chat follow-up suggestions', description: 'After each AI response, contextual follow-up buttons appear so you can dig deeper without typing.', category: 'improvement' },
    { date: '2026-07-26', title: 'Chat message timestamps', description: 'Messages show relative timestamps (just now, 5m ago, 2h ago) for conversation context.', category: 'improvement' },
    { date: '2026-07-26', title: 'Chat persistence & message badge', description: 'Chat history persists across page refreshes. The floating button shows a message count badge when conversations exist.', category: 'improvement' },
    { date: '2026-07-26', title: 'Copy deal summary to clipboard', description: 'One-click copy button in the banner gives you a Slack-ready 5-line deal summary with signal, financials, and top red flags.', category: 'feature' },
    { date: '2026-07-26', title: 'Smart chat suggestions', description: 'Chat starter buttons now adapt to your deal data — showing contextual questions like "Explain the 3 red flags" or "What if I negotiate 15% off?"', category: 'improvement' },
    { date: '2026-07-26', title: 'Deal comparison export', description: 'Export a markdown comparison report when multiple projects exist. Includes all metrics, flags, and recommendations side by side.', category: 'feature' },
    { date: '2026-07-26', title: 'Deal grade (A/B/C/D/F)', description: 'Single letter grade combining pricing, profitability, risk flags, data quality, and payback into one quick-screening score.', category: 'feature' },
    { date: '2026-07-26', title: 'AI chatbot powered by real LLM', description: 'Deal Assistant now uses Anthropic Claude via n8n workflow for intelligent, context-aware answers instead of pattern matching. Conversation memory persists across messages.', category: 'feature' },
    { date: '2026-07-26', title: 'Hold period sensitivity table', description: 'IRR matrix across different hold periods and revenue growth rates, showing how exit timing affects returns.', category: 'feature' },
    { date: '2026-07-26', title: 'Deal stage indicator', description: 'Dropdown in header to track where you are: Discovery → Pre-LOI → LOI → DD → Negotiation → Closing.', category: 'feature' },
    { date: '2026-07-26', title: 'Deterministic math checks everywhere', description: 'Aggregated reconciliation checks now visible on Overview, Synthesis, Valuation, Returns, Growth, and Latest Doc Submission.', category: 'improvement' },
    { date: '2026-07-26', title: 'Shorter expandable items', description: 'Long synthesis items (flags, questions, levers, takeaways) now truncate at ~100 chars with "Show more" buttons.', category: 'improvement' },
    { date: '2026-07-26', title: 'Comma-formatted valuations', description: 'All valuation ranges now display with proper thousand separators (e.g. $1,200,000 instead of 1.2M).', category: 'improvement' },
    { date: '2026-07-26', title: 'Sensitivity analysis table', description: 'Returns and Valuation tabs show a MOIC/IRR matrix across entry and exit multiple combinations with color-coded cells.', category: 'feature' },
    { date: '2026-07-26', title: 'DD request list generator', description: 'Auto-generates a prioritized due diligence request list for the seller with copy-to-clipboard.', category: 'feature' },
    { date: '2026-07-26', title: 'Deal rules of thumb', description: 'Quick-scan heuristics: entry multiple, EBITDA margin, payback period, revenue multiple, and DSCR with pass/warn/fail.', category: 'feature' },
    { date: '2026-07-26', title: 'Strengths & weaknesses', description: 'Two-column summary pulling from synthesis flags and calculated metrics to show deal pros and cons.', category: 'feature' },
    { date: '2026-07-26', title: 'Deal summary banner', description: 'Compact top-of-page banner showing project name, verdict, key metrics, and red flag count.', category: 'feature' },
    { date: '2026-07-26', title: 'Always-on LLM valuation', description: 'The consolidator now always returns a valuation range even with limited data, using a confidence score (High/Medium/Low) to indicate reliability.', category: 'improvement' },
    { date: '2026-07-26', title: 'Valuation confidence badges', description: 'Synthesis valuation and Valuation tab now display a colored confidence badge (e.g. "High confidence 75%") derived from the LLM\'s self-assessed data quality.', category: 'feature' },
    { date: '2026-07-25', title: 'Document coverage matrix', description: '10-category coverage grid showing which standard diligence document types have been uploaded.', category: 'feature' },
    { date: '2026-07-25', title: 'Risk concentration map', description: 'Visual breakdown of findings by business category (Revenue, Customer, Debt, Legal, People, Margins, Growth) with severity coloring.', category: 'feature' },
    { date: '2026-07-25', title: 'Project comparison table', description: 'Side-by-side comparison of multiple deals showing key metrics, risk level, and document progress.', category: 'feature' },
    { date: '2026-07-25', title: 'Always-on valuation', description: 'Synthesis now always shows a valuation range with confidence badges. No more blank $0 values.', category: 'improvement' },
    { date: '2026-07-25', title: 'Command palette (Ctrl+K)', description: 'Quick-switch between tabs, toggle theme, export, and more from a searchable command bar.', category: 'feature' },
    { date: '2026-07-25', title: 'Notification center', description: 'Bell icon in toolbar shows recent document processing and synthesis completion events with timestamps.', category: 'feature' },
    { date: '2026-07-25', title: 'Deal readiness gauge', description: '7-milestone progress indicator tracking documents, revenue, EBITDA, price, synthesis, and valuation completion.', category: 'feature' },
    { date: '2026-07-25', title: 'AI Deal Assistant chatbot', description: 'Floating chat panel (bottom-left) answers questions about risks, valuation, negotiation, and missing docs using your project data.', category: 'feature' },
    { date: '2026-07-25', title: 'Deal export (Markdown + JSON)', description: 'Download your deal summary as a Markdown report or raw JSON from the Export button in the toolbar.', category: 'feature' },
    { date: '2026-07-25', title: 'Optional sign-in', description: 'Sign in with name/email/team from the header. No login required to use the app.', category: 'feature' },
    { date: '2026-07-25', title: 'Industry benchmarks placeholder', description: 'Shows where benchmark comparisons will appear once a data source is connected.', category: 'feature' },
    { date: '2026-07-25', title: 'Cost per run estimates', description: 'Estimated LLM costs per document and synthesis run shown on Overview.', category: 'feature' },
    { date: '2026-07-25', title: 'Keyboard shortcuts', description: 'Press ? to see available shortcuts. Esc closes drawers and panels.', category: 'improvement' },
    { date: '2026-07-25', title: 'n8n workflow sticky notes', description: 'Added explanatory notes to 4 key n8n workflows for easier navigation.', category: 'improvement' },
    { date: '2026-07-24', title: 'Dark mode toggle', description: 'Light/Dark/Auto theme in the header toolbar. Persists across sessions.', category: 'feature' },
    { date: '2026-07-24', title: 'EBITDA waterfall chart', description: 'Visual revenue → expenses → EBITDA → add-backs → adjusted EBITDA flow chart.', category: 'feature' },
    { date: '2026-07-24', title: 'Buyer profile card', description: 'Optional buyer details with transparent acquisition-fit reasoning.', category: 'feature' },
    { date: '2026-07-24', title: 'Recurring vs one-time card', description: 'Quality-of-earnings check classifying findings as recurring or one-time.', category: 'feature' },
    { date: '2026-07-24', title: 'Model assumptions summary', description: 'Shows saved assumptions at the top of every quantitative tab with jump-to-edit.', category: 'improvement' },
    { date: '2026-07-24', title: 'Mobile responsiveness', description: 'KPI grid and cards now display properly on phones and tablets.', category: 'fix' },
    { date: '2026-07-24', title: 'Code-splitting (52% bundle reduction)', description: 'Lazy-loaded 22+ components. Initial load dropped from 1,315KB to 628KB.', category: 'improvement' },
]

const CATEGORY_BADGE: Record<ChangelogEntry['category'], { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    feature: { label: 'New', variant: 'default' },
    improvement: { label: 'Improved', variant: 'secondary' },
    fix: { label: 'Fixed', variant: 'outline' },
}

export default function WhatsNewCard() {
    const [expanded, setExpanded] = useState(false)
    const visible = expanded ? CHANGELOG : CHANGELOG.slice(0, 5)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">What's new</CardTitle>
                    </div>
                    <Badge variant="secondary">{CHANGELOG.length} updates</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-border">
                    {visible.map((entry, i) => {
                        const badge = CATEGORY_BADGE[entry.category]
                        return (
                            <div key={i} className="flex gap-3 px-4 py-3">
                                <div className="mt-0.5 shrink-0">
                                    <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground">{entry.title}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{entry.description}</p>
                                </div>
                                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{entry.date.slice(5)}</span>
                            </div>
                        )
                    })}
                </div>
                {CHANGELOG.length > 5 && (
                    <div className="border-t border-border px-4 py-2">
                        <Button variant="ghost" size="sm" className="w-full gap-1 text-xs" onClick={() => setExpanded(!expanded)}>
                            {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all {CHANGELOG.length} updates</>}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
