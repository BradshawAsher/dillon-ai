import { useEffect, useRef, useState, useCallback } from 'react'
import {
    Search,
    Moon,
    FileDown,
    FileJson,
    Keyboard,
    Bot,
    LayoutDashboard,
    FlaskConical,
    TrendingUp,
    DollarSign,
    Handshake,
    FileText,
    FileSearch,
    Clock3,
    AlertTriangle,
    Sparkles,
    Upload,
    FileSpreadsheet,
    Calculator,
    ShieldAlert,
    Layers,
    Scale,
    Percent,
    CheckSquare,
    ListTodo,
    HelpCircle,
    Activity,
    FileCheck,
    CreditCard,
    BarChart3,
    PieChart,
    Building2,
    Users,
    Target,
    History,
    Edit3,
    Radio,
    Printer,
} from 'lucide-react'

type CommandPaletteProps = {
    open: boolean
    onClose: () => void
    onSelectTab: (tab: string, anchor?: string) => void
    onToggleTheme: () => void
    onExportMarkdown: () => void
    onExportJson: () => void
    onExportExcel?: () => void
    onExportIcMemo?: () => void
    onExportLoi?: () => void
    onShowShortcuts: () => void
    onOpenChat: () => void
    onCopySummary?: () => void
    onScrollToUpload?: () => void
    onStartTour?: (tourId: 'core-fast' | 'deep-dive' | 'interactive-quest') => void
    onOpenWalkthrough?: () => void
    onOpenReportIssue?: () => void
    onOpenVersionSwitcher?: () => void
}

type Command = {
    id: string
    label: string
    icon: React.ReactNode
    action: () => void
    group: string
    keywords?: string[]
    badge?: string
}

export default function CommandPalette({
    open,
    onClose,
    onSelectTab,
    onToggleTheme,
    onExportMarkdown,
    onExportJson,
    onExportExcel,
    onExportIcMemo,
    onExportLoi,
    onShowShortcuts,
    onOpenChat,
    onCopySummary,
    onScrollToUpload,
    onStartTour,
    onOpenWalkthrough,
    onOpenReportIssue,
    onOpenVersionSwitcher,
}: CommandPaletteProps) {
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const commands: Command[] = [
        // --- Core Actions & Quick Exports ---
        {
            id: 'export-loi',
            label: 'Export Letter of Intent (LOI) (.pdf / Print / Markdown) — Capital Stack & NWC Peg',
            icon: <Scale className="h-4 w-4 text-violet-600 dark:text-violet-400" />,
            action: () => {
                if (onExportLoi) {
                    onExportLoi()
                } else {
                    window.dispatchEvent(new CustomEvent('mergeworks:walkthrough-action', { detail: { type: 'open_loi_modal' } }))
                }
            },
            group: 'Actions & Exports',
            keywords: ['loi', 'letter of intent', 'offer', 'acquisition proposal', 'capital stack', 'nwc peg', 'working capital', 'escrow', 'covenants', 'exclusivity', 'no-shop', 'export'],
            badge: 'LOI'
        },
        {
            id: 'export-ic-memo',
            label: 'Export Investment Committee Memo (.pdf / Print) — QoE Bridge & APA Covenants',
            icon: <Printer className="h-4 w-4 text-primary" />,
            action: () => {
                if (onExportIcMemo) {
                    onExportIcMemo()
                } else {
                    window.dispatchEvent(new CustomEvent('mergeworks:walkthrough-action', { detail: { type: 'open_export_modal' } }))
                }
            },
            group: 'Actions & Exports',
            keywords: ['ic memo', 'investment committee', 'pdf', 'print', 'diligence memo', 'memo', 'qoe bridge', 'apa', 'covenants', 'export'],
            badge: 'IC Memo'
        },
        {
            id: 'retry-failed-docs',
            label: 'Retry Failed Documents — Re-run failed uploads & extractions in batch',
            icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
            action: () => {
                const retryBtn = (document.getElementById('batch-retry-failed-btn') || document.getElementById('project-retry-failed-btn')) as HTMLButtonElement | null
                if (retryBtn) {
                    retryBtn.click()
                } else {
                    onSelectTab('diligence', 'batch-progress-card')
                }
            },
            group: 'Actions & Exports',
            keywords: ['retry', 'retry failed', 'rerun failed', 're-run', 'reprocess', 'failed documents', 'upload error', 'mp4'],
            badge: 'Retry'
        },
        ...(onExportExcel ? [{
            id: 'export-excel-live',
            label: 'Export Live Excel Model (.xlsx) — 3-Statement & Formulas',
            icon: <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
            action: onExportExcel,
            group: 'Actions & Exports',
            keywords: ['excel', 'xlsx', 'spreadsheet', 'google sheets', 'download', 'export', '3-statement', 'irr', 'dscr', 'lbo model', 'financial model'],
            badge: 'Export'
        }] : []),
        {
            id: 'scroll-to-intake',
            label: 'Project Intake / Upload Diligence Documents',
            icon: <Upload className="h-4 w-4 text-primary" />,
            action: () => {
                if (onScrollToUpload) {
                    onScrollToUpload()
                } else {
                    const el = document.querySelector('[data-project-intake]') || document.getElementById('upload-section')
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
            },
            group: 'Navigation',
            keywords: ['intake', 'upload', 'files', 'pdf', 'xlsx', 'documents', 'data room', 'vdr'],
            badge: 'Top'
        },
        {
            id: 'quick-questionnaire-prefill',
            label: 'Quick Deal Questionnaire: Prefill from Word or Pasted Stats',
            icon: <FileText className="h-4 w-4 text-primary" />,
            action: () => {
                const intake = document.querySelector('[data-project-intake]') || document.getElementById('project-intake')
                intake?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                window.dispatchEvent(new CustomEvent('mergeworks:open-questionnaire-prefill'))
            },
            group: 'Actions & Exports',
            keywords: ['questionnaire', 'word', 'docx', 'broker teaser', 'paste', 'stats', 'prefill', 'zero token'],
            badge: '0 tokens'
        },
        {
            id: 'open-chat',
            label: 'Open Dillon AI Diligence Chat Assistant',
            icon: <Bot className="h-4 w-4 text-primary" />,
            action: onOpenChat,
            group: 'Actions & Exports',
            keywords: ['chat', 'ai', 'dillon', 'assistant', 'ask', 'prompt', 'help'],
            badge: 'AI'
        },
        {
            id: 'export-markdown',
            label: 'Export Deal Summary (.md Markdown)',
            icon: <FileDown className="h-4 w-4" />,
            action: onExportMarkdown,
            group: 'Actions & Exports',
            keywords: ['markdown', 'export', 'summary', 'memo', 'download'],
            badge: 'Export'
        },
        {
            id: 'export-json',
            label: 'Export Raw Deal Data (.json)',
            icon: <FileJson className="h-4 w-4" />,
            action: onExportJson,
            group: 'Actions & Exports',
            keywords: ['json', 'raw data', 'facts', 'export', 'download', 'api'],
            badge: 'Export'
        },
        {
            id: 'action-analyst-overrides',
            label: 'Calibrate & Override Financial Metrics (Bi-Temporal Audit)',
            icon: <Edit3 className="h-4 w-4 text-purple-500" />,
            action: () => onSelectTab('analysis', 'analysis-deal-on-a-page'),
            group: 'Actions & Exports',
            keywords: ['override', 'analyst override', 'calibrate', 'ebitda adjustment', 'revenue override', 'disallow addback', 'audit ledger', 'bi-temporal'],
            badge: 'Audit'
        },

        // --- Deep-Link Financial Modeling & Structure Cards ---
        {
            id: 'card-nwc-peg',
            label: 'Target Working Capital (NWC) Peg & APA Section 2.4 Clause',
            icon: <Calculator className="h-4 w-4 text-emerald-500" />,
            action: () => onSelectTab('structure', 'structure-working-capital-peg'),
            group: 'Financial Modeling & Structure',
            keywords: ['nwc', 'working capital', 'peg', 'collar', 'apa', 'clause', 'closing adjustment', 'inventory', 'ar', 'ap', 'section 2.4', 'seasonality'],
            badge: 'Structure'
        },
        {
            id: 'card-rate-shock',
            label: 'SBA 7(a) & Senior Debt Service 2D Rate Shock Matrix',
            icon: <Percent className="h-4 w-4 text-amber-500" />,
            action: () => onSelectTab('structure', 'structure-dscr'),
            group: 'Financial Modeling & Structure',
            keywords: ['sba', '7a', 'rate shock', 'dscr', 'covenant', 'interest rate', 'stress test', 'breach', 'leverage', 'debt service'],
            badge: 'Structure'
        },
        {
            id: 'card-sources-uses',
            label: 'Sources & Uses / Capital Structure Stack',
            icon: <Layers className="h-4 w-4 text-blue-500" />,
            action: () => onSelectTab('structure', 'structure-sources-uses'),
            group: 'Financial Modeling & Structure',
            keywords: ['sources', 'uses', 'capital structure', 'equity', 'senior debt', 'seller note', 'financing', 'stack'],
            badge: 'Structure'
        },
        {
            id: 'card-debt-schedule',
            label: 'Debt Schedule & Loan Amortization',
            icon: <CreditCard className="h-4 w-4 text-indigo-500" />,
            action: () => onSelectTab('structure', 'structure-debt-schedule'),
            group: 'Financial Modeling & Structure',
            keywords: ['debt schedule', 'amortization', 'principal', 'interest', 'payments', 'balloon', 'term', 'loan'],
            badge: 'Structure'
        },
        {
            id: 'card-covenants',
            label: 'Lender Covenants & Compliance Testing',
            icon: <ShieldAlert className="h-4 w-4 text-rose-500" />,
            action: () => onSelectTab('structure', 'structure-covenants'),
            group: 'Financial Modeling & Structure',
            keywords: ['covenants', 'leverage ratio', 'fixed charge', 'fccr', 'bank covenants', 'compliance'],
            badge: 'Structure'
        },
        {
            id: 'card-financing-comparison',
            label: 'Financing Scenarios & Term Sheet Comparison',
            icon: <Scale className="h-4 w-4 text-cyan-500" />,
            action: () => onSelectTab('structure', 'structure-financing'),
            group: 'Financial Modeling & Structure',
            keywords: ['financing', 'comparison', 'sba vs conventional', 'mezzanine', 'lender term sheet'],
            badge: 'Structure'
        },

        // --- Deep-Link Valuation & Returns Cards ---
        {
            id: 'card-dcf-valuation',
            label: 'DCF Intrinsic Valuation Model',
            icon: <BarChart3 className="h-4 w-4 text-emerald-500" />,
            action: () => onSelectTab('valuation', 'valuation-dcf'),
            group: 'Valuation & Returns',
            keywords: ['dcf', 'discounted cash flow', 'wacc', 'terminal value', 'intrinsic value', 'unlevered cash flow'],
            badge: 'Valuation'
        },
        {
            id: 'card-trading-comps',
            label: 'Trading Multiples & Precedent Transaction Comps',
            icon: <Building2 className="h-4 w-4 text-blue-500" />,
            action: () => onSelectTab('valuation', 'valuation-comps'),
            group: 'Valuation & Returns',
            keywords: ['comps', 'multiples', 'ev/ebitda', 'precedent transactions', 'market benchmark', 'peer valuation'],
            badge: 'Valuation'
        },
        {
            id: 'card-valuation-multiples',
            label: 'Valuation Summary & Implied Multiples',
            icon: <DollarSign className="h-4 w-4 text-emerald-600" />,
            action: () => onSelectTab('valuation', 'valuation-multiples'),
            group: 'Valuation & Returns',
            keywords: ['valuation', 'multiples', 'ev', 'enterprise value', 'asking price', 'implied multiple'],
            badge: 'Valuation'
        },
        {
            id: 'card-lbo-returns',
            label: 'LBO Returns Waterfall & Cash Flow Schedule',
            icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
            action: () => onSelectTab('returns', 'returns-waterfall'),
            group: 'Valuation & Returns',
            keywords: ['returns', 'lbo', 'waterfall', 'irr', 'moic', 'cash on cash', 'equity payout', 'hold period'],
            badge: 'Returns'
        },
        {
            id: 'card-irr-sensitivity',
            label: 'IRR & MoIC Exit Multiple Sensitivity Matrix',
            icon: <Activity className="h-4 w-4 text-teal-500" />,
            action: () => onSelectTab('returns', 'returns-sensitivity'),
            group: 'Valuation & Returns',
            keywords: ['irr', 'moic', 'sensitivity', 'exit multiple', 'hold period', 'returns heatmap'],
            badge: 'Returns'
        },

        // --- Deep-Link Diligence & Forensic Accounting Cards ---
        {
            id: 'card-cohort-retention',
            label: 'Customer Cohort Retention & Churn Engine (NRR vs Logo)',
            icon: <Users className="h-4 w-4 text-purple-500" />,
            action: () => onSelectTab('analysis', 'analysis-cohort-retention'),
            group: 'Diligence & Forensic Accounting',
            keywords: ['cohort', 'retention', 'churn', 'nrr', 'net revenue retention', 'logo retention', 'attrition', 'customer lifetime'],
            badge: 'Analysis'
        },
        {
            id: 'card-add-back-rules',
            label: 'Institutional Add-Back Banking Rules & SBA Disallowances',
            icon: <FileCheck className="h-4 w-4 text-emerald-500" />,
            action: () => onSelectTab('diligence', 'add-back-quality-card'),
            group: 'Diligence & Forensic Accounting',
            keywords: ['add-backs', 'addbacks', 'sba disallowance', 'owner perks', 'normalized ebitda', 'haircut', 'personal expenses'],
            badge: 'Diligence'
        },
        {
            id: 'card-ebitda-quality',
            label: 'EBITDA Quality & SDE Normalization Bridge',
            icon: <FlaskConical className="h-4 w-4 text-blue-500" />,
            action: () => onSelectTab('analysis', 'analysis-ebitda-quality'),
            group: 'Diligence & Forensic Accounting',
            keywords: ['ebitda quality', 'reconstruction', 'bridge', 'sde', 'operating cash flow', 'adjustments'],
            badge: 'Analysis'
        },
        {
            id: 'card-customer-concentration',
            label: 'Customer Concentration & Top Account Risk',
            icon: <PieChart className="h-4 w-4 text-amber-500" />,
            action: () => onSelectTab('diligence', 'customer-concentration-card'),
            group: 'Diligence & Forensic Accounting',
            keywords: ['concentration', 'top customer', '80/20', 'pareto', 'customer dependency', 'revenue concentration'],
            badge: 'Diligence'
        },
        {
            id: 'card-revenue-bridge',
            label: 'Revenue Bridge & Value Creation Growth Levers',
            icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
            action: () => onSelectTab('growth', 'growth-revenue-bridge'),
            group: 'Diligence & Forensic Accounting',
            keywords: ['growth', 'revenue bridge', 'organic growth', 'pricing levers', 'cross-sell', 'cagr', 'volume'],
            badge: 'Growth'
        },
        {
            id: 'card-breakeven',
            label: 'Breakeven & Operating Margin Sensitivity',
            icon: <Activity className="h-4 w-4 text-indigo-500" />,
            action: () => onSelectTab('analysis', 'analysis-breakeven'),
            group: 'Diligence & Forensic Accounting',
            keywords: ['breakeven', 'fixed cost', 'variable cost', 'operating leverage', 'margin safety'],
            badge: 'Analysis'
        },

        // --- Deep-Link Deal Strategy & Execution Cards ---
        {
            id: 'card-valuation-bridge',
            label: 'Purchase Price Valuation Bridge & APA Clause Drafter',
            icon: <Scale className="h-4 w-4 text-emerald-500" />,
            action: () => onSelectTab('negotiation', 'negotiation-valuation-bridge'),
            group: 'Deal Strategy & Negotiation',
            keywords: ['valuation bridge', 'purchase price', 'apa', 'clause', 'escrow', 'earnout', 'deduction', 'haircut', 'counter offer', 'ev reduction'],
            badge: 'Negotiation'
        },
        {
            id: 'card-negotiation-levers',
            label: 'Negotiation Levers & Value Repricing Gap',
            icon: <Handshake className="h-4 w-4 text-amber-500" />,
            action: () => onSelectTab('negotiation', 'negotiation-levers'),
            group: 'Deal Strategy & Negotiation',
            keywords: ['negotiation', 'levers', 'repricing gap', 'seller concession', 'earnouts', 'holdback', 'discount'],
            badge: 'Negotiation'
        },
        {
            id: 'card-mgmt-questions',
            label: 'Seller Q&A Strategy & Management Interview Questions',
            icon: <ListTodo className="h-4 w-4 text-blue-500" />,
            action: () => onSelectTab('analysis', 'analysis-mgmt-questions'),
            group: 'Deal Strategy & Negotiation',
            keywords: ['seller qa', 'management questions', 'interview', 'diligence questions', 'script'],
            badge: 'Analysis'
        },
        {
            id: 'card-closing-checklist',
            label: 'Closing Checklist & Legal Conditions Precedent',
            icon: <CheckSquare className="h-4 w-4 text-emerald-500" />,
            action: () => onSelectTab('analysis', 'analysis-closing-checklist'),
            group: 'Deal Strategy & Negotiation',
            keywords: ['closing checklist', 'legal conditions', 'escrow', 'rep and warranty', 'closing terms', 'covenants'],
            badge: 'Analysis'
        },
        {
            id: 'card-dd-requests',
            label: 'Diligence Request List & Missing VDR Items',
            icon: <FileSearch className="h-4 w-4 text-purple-500" />,
            action: () => onSelectTab('analysis', 'analysis-dd-requests'),
            group: 'Deal Strategy & Negotiation',
            keywords: ['dd requests', 'request list', 'vdr', 'data room', 'missing documents', 'checklist'],
            badge: 'Analysis'
        },
        {
            id: 'card-synthesis-judgment',
            label: 'Acquisition Judgment Callout & Deal Verdict',
            icon: <Target className="h-4 w-4 text-primary" />,
            action: () => onSelectTab('synthesis', 'synthesis-judgment'),
            group: 'Deal Strategy & Negotiation',
            keywords: ['verdict', 'recommendation', 'pursue', 'pass', 'reprice', 'thesis', 'judgment'],
            badge: 'Synthesis'
        },
        {
            id: 'card-red-flags',
            label: 'Red Flags & Deal Breaker Matrix',
            icon: <AlertTriangle className="h-4 w-4 text-rose-500" />,
            action: () => onSelectTab('synthesis', 'synthesis-red-flags'),
            group: 'Deal Strategy & Negotiation',
            keywords: ['red flags', 'deal breakers', 'fatal flaws', 'risks', 'critical findings', 'yellow flags'],
            badge: 'Synthesis'
        },
        {
            id: 'card-key-person',
            label: 'Key Person & Founder Owner Dependency',
            icon: <Users className="h-4 w-4 text-amber-500" />,
            action: () => onSelectTab('analysis', 'analysis-key-person'),
            group: 'Deal Strategy & Negotiation',
            keywords: ['key person', 'owner dependency', 'management gap', 'transition risk', 'founder dependence'],
            badge: 'Analysis'
        },
        {
            id: 'card-email-drafts',
            label: 'Investment Committee Memo & Broker Email Drafts',
            icon: <FileText className="h-4 w-4 text-indigo-500" />,
            action: () => onSelectTab('email', 'email-drafts-panel'),
            group: 'Deal Strategy & Negotiation',
            keywords: ['email drafts', 'investment memo', 'broker email', 'seller outreach', 'loi follow up', 'ic memo'],
            badge: 'Email'
        },
        {
            id: 'card-war-room',
            label: 'Deal War Room Bot (Slack & Microsoft Teams)',
            icon: <Radio className="h-4 w-4 text-emerald-500" />,
            action: () => onSelectTab('overview', 'overview-war-room'),
            group: 'Deal Strategy & Negotiation',
            keywords: ['war room', 'slack', 'teams', 'bot', 'webhook', 'broadcast', 'alerts', 'notifications', 'chat'],
            badge: 'Overview'
        },

        // --- Workspace Tabs ---
        {
            id: 'tab-overview',
            label: 'Overview Workspace Tab',
            icon: <LayoutDashboard className="h-4 w-4" />,
            action: () => onSelectTab('overview'),
            group: 'Workspace Tabs',
            keywords: ['overview', 'dashboard', 'summary', 'health'],
            badge: 'Tab'
        },
        {
            id: 'tab-analysis',
            label: 'Analysis Workspace Tab',
            icon: <FlaskConical className="h-4 w-4" />,
            action: () => onSelectTab('analysis'),
            group: 'Workspace Tabs',
            keywords: ['analysis', 'financials', 'ebitda', 'breakeven'],
            badge: 'Tab'
        },
        {
            id: 'tab-diagnostics',
            label: 'Diagnostics & Risk Workspace Tab',
            icon: <ShieldAlert className="h-4 w-4" />,
            action: () => onSelectTab('diagnostics'),
            group: 'Workspace Tabs',
            keywords: ['diagnostics', 'risk', 'playbook', 'strengths', 'decision'],
            badge: 'Tab'
        },
        {
            id: 'tab-diligence',
            label: 'Diligence Workspace Tab',
            icon: <FileSearch className="h-4 w-4" />,
            action: () => onSelectTab('diligence'),
            group: 'Workspace Tabs',
            keywords: ['diligence', 'documents', 'add-backs', 'concentration', 'audit'],
            badge: 'Tab'
        },
        {
            id: 'tab-synthesis',
            label: 'Synthesis Workspace Tab',
            icon: <Sparkles className="h-4 w-4" />,
            action: () => onSelectTab('synthesis'),
            group: 'Workspace Tabs',
            keywords: ['synthesis', 'judgment', 'verdict', 'red flags'],
            badge: 'Tab'
        },
        {
            id: 'tab-structure',
            label: 'Deal Structure Workspace Tab',
            icon: <Handshake className="h-4 w-4" />,
            action: () => onSelectTab('structure'),
            group: 'Workspace Tabs',
            keywords: ['structure', 'debt', 'sources', 'uses', 'dscr', 'nwc'],
            badge: 'Tab'
        },
        {
            id: 'tab-valuation',
            label: 'Valuation Workspace Tab',
            icon: <DollarSign className="h-4 w-4" />,
            action: () => onSelectTab('valuation'),
            group: 'Workspace Tabs',
            keywords: ['valuation', 'multiples', 'dcf', 'comps'],
            badge: 'Tab'
        },
        {
            id: 'tab-returns',
            label: 'Returns Workspace Tab',
            icon: <TrendingUp className="h-4 w-4" />,
            action: () => onSelectTab('returns'),
            group: 'Workspace Tabs',
            keywords: ['returns', 'irr', 'moic', 'lbo', 'waterfall'],
            badge: 'Tab'
        },
        {
            id: 'tab-growth',
            label: 'Growth Workspace Tab',
            icon: <TrendingUp className="h-4 w-4" />,
            action: () => onSelectTab('growth'),
            group: 'Workspace Tabs',
            keywords: ['growth', 'revenue', 'projections', 'levers'],
            badge: 'Tab'
        },
        {
            id: 'tab-negotiation',
            label: 'Negotiation Workspace Tab',
            icon: <Handshake className="h-4 w-4" />,
            action: () => onSelectTab('negotiation'),
            group: 'Workspace Tabs',
            keywords: ['negotiation', 'levers', 'terms', 'seller'],
            badge: 'Tab'
        },
        {
            id: 'tab-spending',
            label: 'API Spending & LLM Cost Analytics Tab',
            icon: <DollarSign className="h-4 w-4" />,
            action: () => onSelectTab('spending'),
            group: 'Workspace Tabs',
            keywords: ['spending', 'token costs', 'llm billing', 'api cost', 'gpt spending'],
            badge: 'Tab'
        },
        {
            id: 'tab-compare',
            label: 'Deal Portfolio Comparison Matrix Tab',
            icon: <Layers className="h-4 w-4" />,
            action: () => onSelectTab('compare'),
            group: 'Workspace Tabs',
            keywords: ['compare', 'portfolio', 'cross-deal', 'matrix', 'benchmarks'],
            badge: 'Tab'
        },
        {
            id: 'tab-evals',
            label: 'AI Model Benchmark & Accuracy Evals Tab',
            icon: <Activity className="h-4 w-4" />,
            action: () => onSelectTab('evals'),
            group: 'Workspace Tabs',
            keywords: ['evals', 'benchmarks', 'accuracy', 'ground truth', 'test harness', 'model comparison'],
            badge: 'Tab'
        },
        {
            id: 'tab-history',
            label: 'Audit History & Event Trail Tab',
            icon: <Clock3 className="h-4 w-4" />,
            action: () => onSelectTab('history'),
            group: 'Workspace Tabs',
            keywords: ['history', 'audit', 'events', 'submissions', 'timeline'],
            badge: 'Tab'
        },
        {
            id: 'tab-faqs',
            label: 'Technical FAQs & Architecture Knowledge Tab',
            icon: <HelpCircle className="h-4 w-4" />,
            action: () => onSelectTab('faqs'),
            group: 'Workspace Tabs',
            keywords: ['faqs', 'knowledge', 'help', 'docs', 'questions'],
            badge: 'Tab'
        },
        {
            id: 'tab-errors',
            label: 'Error Log & Diagnostic Traces Tab',
            icon: <AlertTriangle className="h-4 w-4" />,
            action: () => onSelectTab('errors'),
            group: 'Workspace Tabs',
            keywords: ['errors', 'logs', 'workflow', 'failed', 'diagnostics'],
            badge: 'Tab'
        },

        // --- Preferences & Tours ---
        {
            id: 'toggle-dark-mode',
            label: 'Toggle Dark / Light Mode',
            icon: <Moon className="h-4 w-4" />,
            action: onToggleTheme,
            group: 'Preferences',
            keywords: ['theme', 'dark mode', 'light mode', 'appearance'],
            badge: 'Theme'
        },
        {
            id: 'show-shortcuts',
            label: 'Show Keyboard Shortcuts Dialog',
            icon: <Keyboard className="h-4 w-4" />,
            action: onShowShortcuts,
            group: 'Preferences',
            keywords: ['shortcuts', 'hotkeys', 'keyboard', 'help'],
            badge: 'Keys'
        },
        ...(onOpenVersionSwitcher ? [{
            id: 'version-control-rollback',
            label: 'Version Control: Switch Release / Rollback to Previous Stable',
            icon: <History className="h-4 w-4 text-primary" />,
            action: onOpenVersionSwitcher,
            group: 'Preferences',
            keywords: ['version', 'rollback', 'release', 'deploy', 'history', 'previous', 'stable', 'fallback', 'safe mode', 'immutable', 'build'],
            badge: 'Versions'
        }] : []),
        ...(onStartTour ? [
            {
                id: 'tour-core',
                label: 'Launch Guided Walkthrough #1: End-to-End Deal Flow (~75 sec)',
                icon: <Sparkles className="h-4 w-4 text-primary" />,
                action: () => onStartTour('core-fast'),
                group: 'Guided Tours',
                keywords: ['tour', 'walkthrough', 'demo', 'tutorial', 'quickstart'],
                badge: 'Tour'
            },
            {
                id: 'tour-deep',
                label: 'Launch Guided Walkthrough #2: Deep Financial Tour (~3.5 min)',
                icon: <FlaskConical className="h-4 w-4 text-emerald-500" />,
                action: () => onStartTour('deep-dive'),
                group: 'Guided Tours',
                keywords: ['tour', 'deep dive', 'financial walkthrough', 'tutorial'],
                badge: 'Tour'
            },
            {
                id: 'tour-quest',
                label: 'Launch Interactive Hands-On Quest (Gamified Tutorial)',
                icon: <TrendingUp className="h-4 w-4 text-amber-500" />,
                action: () => onStartTour('interactive-quest'),
                group: 'Guided Tours',
                keywords: ['quest', 'gamified', 'hands on', 'interactive tour'],
                badge: 'Quest'
            },
        ] : []),
        ...(onOpenWalkthrough ? [
            {
                id: 'tour-launcher',
                label: 'Open Walkthroughs & Video Demos Launcher',
                icon: <Sparkles className="h-4 w-4 text-primary" />,
                action: onOpenWalkthrough,
                group: 'Guided Tours',
                keywords: ['video demo', 'walkthrough launcher', 'tours'],
                badge: 'Videos'
            },
        ] : []),
        ...(onCopySummary ? [{
            id: 'copy-summary',
            label: 'Copy Deal Summary to Clipboard',
            icon: <FileDown className="h-4 w-4" />,
            action: onCopySummary,
            group: 'Actions & Exports',
            keywords: ['copy', 'clipboard', 'share', 'summary'],
            badge: 'Copy'
        }] : []),
        ...(onOpenReportIssue ? [{
            id: 'report-issue',
            label: 'Report an Issue / Bug / UI Feedback (Alerts #pod-1-agent-alerts)',
            icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
            action: onOpenReportIssue,
            group: 'Support & Feedback',
            keywords: ['bug', 'report', 'issue', 'feedback', 'support', 'slack'],
            badge: 'Support'
        }] : []),
    ]

    const filtered = commands.filter((cmd) => {
        const q = query.toLowerCase().trim()
        if (!q) return true
        const searchable = [cmd.label, cmd.group, ...(cmd.keywords ?? [])].join(' ').toLowerCase()
        return q.split(/\s+/).every((token) => searchable.includes(token))
    })

    const groupedCommands = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
        if (!acc[cmd.group]) acc[cmd.group] = []
        acc[cmd.group].push(cmd)
        return acc
    }, {})

    const executeCommand = useCallback(
        (cmd: Command) => {
            cmd.action()
            onClose()
        },
        [onClose]
    )

    // Reset state when palette opens/closes
    useEffect(() => {
        if (open) {
            setQuery('')
            setSelectedIndex(0)
            setTimeout(() => inputRef.current?.focus(), 0)
        }
    }, [open])

    // Global Ctrl+K / Cmd+K listener
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                if (open) {
                    onClose()
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open, onClose])

    // Keyboard navigation within the palette
    useEffect(() => {
        if (!open) return

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
                return
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex((prev) => (prev + 1) % filtered.length)
                return
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
                return
            }
            if (e.key === 'Enter') {
                e.preventDefault()
                if (filtered[selectedIndex]) {
                    executeCommand(filtered[selectedIndex])
                }
                return
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open, filtered, selectedIndex, onClose, executeCommand])

    // Reset selected index when query changes
    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

    // Scroll selected item into view
    useEffect(() => {
        if (!listRef.current) return
        const selected = listRef.current.querySelector('[data-selected="true"]')
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' })
        }
    }, [selectedIndex])

    if (!open) return null

    let flatIndex = -1

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Palette */}
            <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-border bg-background shadow-2xl">
                {/* Search input */}
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a command..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        Esc
                    </kbd>
                </div>

                {/* Command list */}
                <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
                    {filtered.length === 0 && (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                            No commands found.
                        </p>
                    )}

                    {Object.entries(groupedCommands).map(([group, cmds]) => (
                        <div key={group} className="mb-1">
                            <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {group}
                            </p>
                            {cmds.map((cmd) => {
                                flatIndex++
                                const isSelected = flatIndex === selectedIndex
                                const currentIndex = flatIndex

                                return (
                                    <button
                                        key={cmd.id}
                                        data-selected={isSelected}
                                        onClick={() => executeCommand(cmd)}
                                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                            isSelected
                                                ? 'bg-accent text-accent-foreground'
                                                : 'text-foreground hover:bg-accent/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <span className="shrink-0 text-muted-foreground">
                                                {cmd.icon}
                                            </span>
                                            <span className="truncate">{cmd.label}</span>
                                        </div>
                                        {cmd.badge && (
                                            <span className="shrink-0 rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                {cmd.badge}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                </div>

                {/* Footer hint */}
                <div className="flex items-center justify-between border-t border-border px-4 py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono">
                                &uarr;&darr;
                            </kbd>
                            navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono">
                                &crarr;
                            </kbd>
                            select
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono">
                            Ctrl
                        </kbd>
                        <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono">
                            K
                        </kbd>
                        <span>to toggle</span>
                    </div>
                </div>
            </div>
        </>
    )
}
