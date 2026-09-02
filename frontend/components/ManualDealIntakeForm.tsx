import { useEffect, useState, useMemo } from 'react'
import {
    Building2,
    DollarSign,
    Layers,
    Landmark,
    Calculator,
    Zap,
    ShieldAlert,
    Play,
    RotateCcw,
    Plus,
    Trash2,
} from 'lucide-react'

import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../lib/shadcn/select'
import { Textarea } from '../lib/shadcn/textarea'
import QuestionnaireQuickImport from './QuestionnaireQuickImport'
import CardInfoPopover from './common/CardInfoPopover'
import {
    MANUAL_DEAL_PRESETS,
    ManualDealFormData,
    createBlankManualDealForm,
    parseFlexibleFinancialValue,
    calculateNormalizedEbitda,
    calculateBalanceSheetTotals,
    buildManualDealModel,
    buildManualProjectSynthesis,
} from '../utils/manualDealIntake'
import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'

const INDUSTRY_OPTIONS = [
    'Aerospace & Precision Manufacturing',
    'Commercial HVAC & Mechanical',
    'B2B SaaS & Enterprise Software',
    'Industrial Equipment & Distribution',
    'Healthcare, Dental & Medical Practices',
    'Commercial Construction & Contracting',
    'Logistics, Trucking & Freight Brokerage',
    'E-Commerce & DTC Brands',
    'Professional Services & Consulting',
    'Automotive Repair & Fleet Services',
    'Food Processing & Wholesale Beverage',
    'IT Services & Managed Service Provider (MSP)',
    'Facility Maintenance & Cleaning Services',
    'Specialty Retail & Multi-Unit Franchises',
    'Other / General SMB',
]

type ManualDealIntakeFormProps = {
    onComplete: (dealModel: DealModel, synthesis: ProjectSynthesisItem, formData: ManualDealFormData) => void
    onStartTutorial?: () => void
    tutorialSection?: ManualDealSection
    prefillRequest?: number
    disabled?: boolean
}

export type ManualDealSection = 'basics' | 'financials' | 'assets' | 'financing' | 'risk'
type IntakeDepth = 'quick' | 'detailed'
type QuickFinancialField = 'askingPrice' | 'annualRevenue' | 'reportedEbitda'

function quickFinancialDraft(data: ManualDealFormData): Record<QuickFinancialField, string> {
    return {
        askingPrice: data.askingPrice > 0 ? String(data.askingPrice) : '',
        annualRevenue: data.annualRevenue > 0 ? String(data.annualRevenue) : '',
        reportedEbitda: data.reportedEbitda > 0 ? String(data.reportedEbitda) : '',
    }
}

export default function ManualDealIntakeForm({ onComplete, onStartTutorial, tutorialSection, prefillRequest = 0, disabled = false }: ManualDealIntakeFormProps) {
    const [formData, setFormData] = useState<ManualDealFormData>(() => createBlankManualDealForm())
    const [quickFinancialInputs, setQuickFinancialInputs] = useState<Record<QuickFinancialField, string>>(() => quickFinancialDraft(createBlankManualDealForm()))
    const [intakeDepth, setIntakeDepth] = useState<IntakeDepth>('quick')
    const [activeSection, setActiveSection] = useState<ManualDealSection>('basics')

    useEffect(() => {
        if (tutorialSection) {
            setIntakeDepth('detailed')
            setActiveSection(tutorialSection)
        }
    }, [tutorialSection])

    const updateField = <K extends keyof ManualDealFormData>(field: K, value: ManualDealFormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const { reportedEbitda, disallowedAddBacks, adjustedEbitda, ebitdaMargin, askingMultiple } = useMemo(
        () => calculateNormalizedEbitda(formData),
        [formData]
    )

    const { totalAssets, totalLiabilities, netAssetValue } = useMemo(
        () => calculateBalanceSheetTotals(formData),
        [formData]
    )

    const equityAmount = useMemo(() => {
        return Math.round(((formData.askingPrice || 0) * (formData.equityContributionPercent || 20)) / 100)
    }, [formData.askingPrice, formData.equityContributionPercent])

    const seniorDebtAmount = useMemo(() => {
        return Math.max(0, (formData.askingPrice || 0) - equityAmount - (formData.sellerNoteAmount || 0))
    }, [formData.askingPrice, equityAmount, formData.sellerNoteAmount])

    const handleLoadPreset = (key: keyof typeof MANUAL_DEAL_PRESETS) => {
        const preset = MANUAL_DEAL_PRESETS[key]
        if (preset) {
            setFormData({ ...preset.data })
            setQuickFinancialInputs(quickFinancialDraft(preset.data))
        }
    }

    const handleClear = () => {
        const blank = createBlankManualDealForm()
        setFormData(blank)
        setQuickFinancialInputs(quickFinancialDraft(blank))
        setIntakeDepth('quick')
        setActiveSection('basics')
    }

    const handleQuickFinancialChange = (field: QuickFinancialField, rawValue: string) => {
        setQuickFinancialInputs((current) => ({ ...current, [field]: rawValue }))
        if (!rawValue.trim()) {
            updateField(field, 0)
            return
        }
        const parsed = parseFlexibleFinancialValue(rawValue)
        if (parsed !== null && parsed >= 0) updateField(field, parsed)
    }

    const handleApplyImportedValues = (values: Partial<ManualDealFormData>) => {
        const next = { ...formData, ...values }
        if (values.dealName && !values.companyName) next.companyName = values.dealName
        setFormData(next)
        setQuickFinancialInputs(quickFinancialDraft(next))
    }

    const completedCoreFields = [
        Boolean(formData.dealName.trim()),
        formData.askingPrice > 0,
        formData.annualRevenue > 0,
        formData.reportedEbitda > 0,
    ].filter(Boolean).length
    const hasMinimumInputs = completedCoreFields === 4

    const handleSubmit = () => {
        const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
        const randomHash = Math.random().toString(36).substring(2, 8)
        const projectId = `project-${timestamp}-${randomHash}`

        const dealModel = buildManualDealModel(formData, projectId)
        const synthesis = buildManualProjectSynthesis(formData, dealModel, projectId)

        onComplete(dealModel, synthesis, formData)
    }

    return (
        <div id="quick-deal-questionnaire" data-quick-deal-questionnaire className="space-y-6">
            {/* Header & Quick Presets Bar */}
            <div id="quick-deal-questionnaire-intro" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs shrink-0">
                        <Calculator className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            Quick Deal Questionnaire
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm">
                                Instant Math Engine
                            </span>
                            <CardInfoPopover
                                cardId="quick-deal-3-tiers"
                                title="The 3 Tiers of Diligence: Which to Use?"
                                description="• Tier 1: Quick Screen (4 fields · 0 tokens): Instant sanity check for teasers (asking multiple, debt capacity, equity check).
• Tier 2: Detailed Questionnaire (Assets, Debt, Add-backs): Full institutional LBO model, SBA 7(a) debt schedule, tangible net worth, and returns from a CIM or Word prefill.
• Tier 3: Multi-Document AI Pipeline: Post-LOI multi-file extraction (Tax Returns Form 1120, P&Ls, bank recs) with cross-document reconciliation and IC synthesis pass."
                                calculation="Tier 1 = EV/EBITDA & 3.5x Senior Debt Peg | Tier 2 = Full LBO & Normalized EBITDA | Tier 3 = Forensic Tax vs P&L Proof of Cash"
                                diligenceImpact="Choose Quick Screen to triage 50 broker teasers in 10 minutes. Choose Detailed Questionnaire when reviewing an active CIM. Choose Document Upload post-LOI for audit-grade verification."
                            />
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Enter numbers and parameters to generate complete valuation, returns, and diligence dashboards in 0.05s without PDFs.
                        </p>
                    </div>
                </div>

                <div id="quick-deal-questionnaire-presets" className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    {onStartTutorial ? (
                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="h-7 gap-1.5 px-2.5 text-xs font-semibold cursor-pointer"
                            onClick={onStartTutorial}
                        >
                            <Play className="h-3 w-3 fill-current" />
                            Start Tutorial
                        </Button>
                    ) : null}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2.5 font-semibold border-primary/40 bg-background hover:bg-primary/10 text-primary cursor-pointer gap-1 shadow-2xs"
                        onClick={handleClear}
                        title="Start a fresh blank deal questionnaire"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        New Blank Deal
                    </Button>
                    <span className="text-[11px] font-medium text-muted-foreground mr-1">Try example:</span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2.5 font-medium border-border/80 bg-background hover:bg-accent cursor-pointer"
                        onClick={() => handleLoadPreset('manufacturing')}
                    >
                        🏭 Manufacturing
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2.5 font-medium border-border/80 bg-background hover:bg-accent cursor-pointer"
                        onClick={() => handleLoadPreset('hvac')}
                    >
                        ❄️ HVAC
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2.5 font-medium border-border/80 bg-background hover:bg-accent cursor-pointer"
                        onClick={() => handleLoadPreset('saas')}
                    >
                        💻 SaaS
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                        onClick={handleClear}
                        title="Clear all fields and reset"
                    >
                        <Trash2 className="h-3 w-3" />
                        Clear All
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
                    <Button
                        type="button"
                        size="sm"
                        variant={intakeDepth === 'quick' ? 'default' : 'ghost'}
                        onClick={() => {
                            setQuickFinancialInputs(quickFinancialDraft(formData))
                            setIntakeDepth('quick')
                        }}
                        className="h-7 text-xs"
                    >
                        Quick screen · 4 fields
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={intakeDepth === 'detailed' ? 'default' : 'ghost'}
                        onClick={() => setIntakeDepth('detailed')}
                        className="h-7 text-xs"
                    >
                        Add more detail
                    </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">Essentials {completedCoreFields}/4</span>
                    <QuestionnaireQuickImport
                        disabled={disabled}
                        openRequest={prefillRequest}
                        currentValues={formData}
                        onApply={handleApplyImportedValues}
                    />
                </div>
            </div>

            {intakeDepth === 'quick' ? (
                <div id="quick-deal-essential-fields" className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <h5 className="text-sm font-bold text-foreground">Screen a deal with the four numbers you usually have first</h5>
                            <p className="text-xs text-muted-foreground">Generate now, then refine assets, financing, and risks later.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-background px-2.5 py-1 text-[10px] font-bold text-primary shadow-2xs">$0 · zero tokens</span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleClear}
                                className="h-6 px-2 text-[11px] font-medium gap-1 text-muted-foreground hover:text-destructive hover:border-destructive/40 bg-background/80 cursor-pointer shadow-2xs"
                                title="Clear all 4 essential fields"
                            >
                                <Trash2 className="h-3 w-3" />
                                Clear Fields
                            </Button>
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="quick-deal-name" className="text-xs font-semibold">Company / Deal Name *</Label>
                            <Input
                                id="quick-deal-name"
                                value={formData.dealName}
                                onChange={(event) => {
                                    updateField('dealName', event.target.value)
                                    updateField('companyName', event.target.value)
                                }}
                                placeholder="Apex Precision Dynamics"
                                className="h-10 bg-background text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="quick-deal-asking-price" className="text-xs font-semibold">Asking Price *</Label>
                            <Input
                                id="quick-deal-asking-price"
                                inputMode="decimal"
                                value={quickFinancialInputs.askingPrice}
                                onChange={(event) => handleQuickFinancialChange('askingPrice', event.target.value)}
                                placeholder="$4.8M"
                                className="h-10 bg-background font-mono text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="quick-deal-revenue" className="text-xs font-semibold">Annual / TTM Revenue *</Label>
                            <Input
                                id="quick-deal-revenue"
                                inputMode="decimal"
                                value={quickFinancialInputs.annualRevenue}
                                onChange={(event) => handleQuickFinancialChange('annualRevenue', event.target.value)}
                                placeholder="$5.2 million"
                                className="h-10 bg-background font-mono text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <Label htmlFor="quick-deal-earnings" className="text-xs font-semibold">Reported {formData.ebitdaOrSdeType} *</Label>
                                <div className="flex rounded-md border border-border bg-background p-0.5 text-[10px]">
                                    {(['EBITDA', 'SDE'] as const).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => updateField('ebitdaOrSdeType', type)}
                                            aria-pressed={formData.ebitdaOrSdeType === type}
                                            className={`rounded px-2 py-0.5 font-bold ${formData.ebitdaOrSdeType === type ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <Input
                                id="quick-deal-earnings"
                                inputMode="decimal"
                                value={quickFinancialInputs.reportedEbitda}
                                onChange={(event) => handleQuickFinancialChange('reportedEbitda', event.target.value)}
                                placeholder="$1.1M"
                                className="h-10 bg-background font-mono text-sm"
                            />
                        </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Accepted formats include $5.2M, 5,200,000, and 5.2 million.</p>
                </div>
            ) : null}

            {/* Live Metrics Summary Pill */}
            <div id="quick-deal-questionnaire-metrics" className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-lg border border-border bg-card/60">
                <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Asking Price</span>
                    <p className="text-sm font-bold text-foreground">
                        ${(formData.askingPrice || 0).toLocaleString()}
                    </p>
                </div>
                <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Normalized EBITDA</span>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        ${adjustedEbitda.toLocaleString()}{' '}
                        <span className="text-[10px] font-normal text-muted-foreground">({ebitdaMargin}%)</span>
                    </p>
                </div>
                <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Implied Multiple</span>
                    <p className="text-sm font-bold text-foreground">
                        <span className={askingMultiple > 5.5 ? 'text-amber-500' : 'text-primary'}>
                            {askingMultiple > 0 ? `${askingMultiple}x` : '—'}
                        </span>
                    </p>
                </div>
                <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Buyer Equity ({formData.equityContributionPercent}%)</span>
                    <p className="text-sm font-bold text-foreground">
                        ${equityAmount.toLocaleString()}
                    </p>
                </div>
                <div className="space-y-0.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Net Asset Value</span>
                    <p className="text-sm font-bold text-foreground">
                        ${netAssetValue.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Section Navigation Tabs */}
            <div id="quick-deal-questionnaire-sections" className={`${intakeDepth === 'detailed' ? 'flex' : 'hidden'} flex-wrap items-center gap-1.5 border-b border-border pb-2`}>
                <button
                    id="quick-deal-section-tab-basics"
                    data-questionnaire-section="basics"
                    type="button"
                    onClick={() => setActiveSection('basics')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        activeSection === 'basics'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                    <Building2 className="h-3.5 w-3.5" />
                    1. Business Basics
                </button>
                <button
                    id="quick-deal-section-tab-financials"
                    data-questionnaire-section="financials"
                    type="button"
                    onClick={() => setActiveSection('financials')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        activeSection === 'financials'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                    <DollarSign className="h-3.5 w-3.5" />
                    2. Financials & Margins
                </button>
                <button
                    id="quick-deal-section-tab-assets"
                    data-questionnaire-section="assets"
                    type="button"
                    onClick={() => setActiveSection('assets')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        activeSection === 'assets'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                    <Layers className="h-3.5 w-3.5" />
                    3. Balance Sheet / Assets
                </button>
                <button
                    id="quick-deal-section-tab-financing"
                    data-questionnaire-section="financing"
                    type="button"
                    onClick={() => setActiveSection('financing')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        activeSection === 'financing'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                    <Landmark className="h-3.5 w-3.5" />
                    4. Financing & SBA Debt
                </button>
                <button
                    id="quick-deal-section-tab-risk"
                    data-questionnaire-section="risk"
                    type="button"
                    onClick={() => setActiveSection('risk')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        activeSection === 'risk'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    5. Risk & Diligence Flags
                </button>
            </div>

            {/* Section 1: Business Basics */}
            {intakeDepth === 'detailed' && activeSection === 'basics' && (
                <div id="quick-deal-section-basics" className="space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">
                                Company / Deal Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                value={formData.dealName}
                                onChange={(e) => {
                                    updateField('dealName', e.target.value)
                                    updateField('companyName', e.target.value)
                                }}
                                placeholder="e.g. Apex Precision Dynamics"
                                className="h-9 text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">
                                Industry Sector <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={formData.industry}
                                onValueChange={(val) => updateField('industry', val)}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Select industry..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {INDUSTRY_OPTIONS.map((ind) => (
                                        <SelectItem key={ind} value={ind} className="text-xs">
                                            {ind}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-foreground">City</Label>
                                <Input
                                    value={formData.city}
                                    onChange={(e) => updateField('city', e.target.value)}
                                    placeholder="Wichita"
                                    className="h-9 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-foreground">State</Label>
                                <Input
                                    value={formData.state}
                                    onChange={(e) => updateField('state', e.target.value)}
                                    placeholder="KS"
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">Number of Employees</Label>
                            <Input
                                type="number"
                                min={1}
                                value={formData.employeeCount || ''}
                                onChange={(e) => updateField('employeeCount', parseInt(e.target.value, 10) || 0)}
                                placeholder="25"
                                className="h-9 text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Business Overview & Value Proposition</Label>
                        <Textarea
                            rows={3}
                            value={formData.businessDescription}
                            onChange={(e) => updateField('businessDescription', e.target.value)}
                            placeholder="Describe operations, core products/services, customer base, and reason for sale..."
                            className="text-xs resize-none"
                        />
                    </div>
                </div>
            )}

            {/* Section 2: Financials & Margins */}
            {intakeDepth === 'detailed' && activeSection === 'financials' && (
                <div id="quick-deal-section-financials" className="space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">
                                Asking / Target Price ($) <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                step={10000}
                                value={formData.askingPrice || ''}
                                onChange={(e) => updateField('askingPrice', parseFloat(e.target.value) || 0)}
                                placeholder="4800000"
                                className="h-9 text-xs font-mono font-medium"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">
                                Annual Revenue ($) <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                step={10000}
                                value={formData.annualRevenue || ''}
                                onChange={(e) => updateField('annualRevenue', parseFloat(e.target.value) || 0)}
                                placeholder="5200000"
                                className="h-9 text-xs font-mono font-medium"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-foreground">
                                    Reported {formData.ebitdaOrSdeType} ($) <span className="text-destructive">*</span>
                                </Label>
                                <div className="flex items-center gap-1 text-[10px]">
                                    <button
                                        type="button"
                                        onClick={() => updateField('ebitdaOrSdeType', 'EBITDA')}
                                        className={`px-1.5 py-0.5 rounded cursor-pointer font-bold ${
                                            formData.ebitdaOrSdeType === 'EBITDA'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:bg-muted'
                                        }`}
                                    >
                                        EBITDA
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateField('ebitdaOrSdeType', 'SDE')}
                                        className={`px-1.5 py-0.5 rounded cursor-pointer font-bold ${
                                            formData.ebitdaOrSdeType === 'SDE'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:bg-muted'
                                        }`}
                                    >
                                        SDE
                                    </button>
                                </div>
                            </div>
                            <Input
                                type="number"
                                min={0}
                                step={5000}
                                value={formData.reportedEbitda || ''}
                                onChange={(e) => updateField('reportedEbitda', parseFloat(e.target.value) || 0)}
                                placeholder="1250000"
                                className="h-9 text-xs font-mono font-medium"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">
                                Disallowed / Non-Qualifying Add-Backs ($)
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                step={5000}
                                value={formData.disallowedAddBacks || ''}
                                onChange={(e) => updateField('disallowedAddBacks', parseFloat(e.target.value) || 0)}
                                placeholder="140000"
                                className="h-9 text-xs font-mono font-medium"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Personal perks, boat leases, unsupported owner one-offs deducted from reported cash flow.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">Gross Margin (%)</Label>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={formData.grossMarginPercent || ''}
                                onChange={(e) => updateField('grossMarginPercent', parseFloat(e.target.value) || 0)}
                                placeholder="42"
                                className="h-9 text-xs font-mono"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">Current Owner Compensation ($)</Label>
                            <Input
                                type="number"
                                min={0}
                                step={5000}
                                value={formData.ownerCompensation || ''}
                                onChange={(e) => updateField('ownerCompensation', parseFloat(e.target.value) || 0)}
                                placeholder="250000"
                                className="h-9 text-xs font-mono"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Section 3: Balance Sheet & Assets */}
            {intakeDepth === 'detailed' && activeSection === 'assets' && (
                <div id="quick-deal-section-assets" className="space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Assets Column */}
                        <div className="space-y-3 p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                            <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                                <span>Assets Included in Sale</span>
                                <span>${totalAssets.toLocaleString()}</span>
                            </h5>

                            <div className="space-y-2">
                                <div className="space-y-1">
                                    <Label className="text-[11px] text-foreground">Cash & Equivalents ($)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.cashIncluded || ''}
                                        onChange={(e) => updateField('cashIncluded', parseFloat(e.target.value) || 0)}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px] text-foreground">Accounts Receivable (A/R) ($)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.accountsReceivable || ''}
                                        onChange={(e) => updateField('accountsReceivable', parseFloat(e.target.value) || 0)}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px] text-foreground">Inventory ($)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.inventory || ''}
                                        onChange={(e) => updateField('inventory', parseFloat(e.target.value) || 0)}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px] text-foreground">Equipment, Machinery & Vehicles ($)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.equipmentAndVehicles || ''}
                                        onChange={(e) => updateField('equipmentAndVehicles', parseFloat(e.target.value) || 0)}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px] text-foreground">Intellectual Property & Software ($)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.intellectualProperty || ''}
                                        onChange={(e) => updateField('intellectualProperty', parseFloat(e.target.value) || 0)}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Liabilities Column */}
                        <div className="space-y-3 p-3.5 rounded-lg border border-destructive/20 bg-destructive/5">
                            <h5 className="text-xs font-bold text-destructive flex items-center justify-between">
                                <span>Liabilities & Debt Assumed</span>
                                <span>${totalLiabilities.toLocaleString()}</span>
                            </h5>

                            <div className="space-y-2">
                                <div className="space-y-1">
                                    <Label className="text-[11px] text-foreground">Accounts Payable (A/P) ($)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.accountsPayable || ''}
                                        onChange={(e) => updateField('accountsPayable', parseFloat(e.target.value) || 0)}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px] text-foreground">Short-Term Debt ($)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.shortTermDebt || ''}
                                        onChange={(e) => updateField('shortTermDebt', parseFloat(e.target.value) || 0)}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px] text-foreground">Long-Term Debt Assumed ($)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.longTermDebt || ''}
                                        onChange={(e) => updateField('longTermDebt', parseFloat(e.target.value) || 0)}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px] text-foreground">Other Accrued Liabilities ($)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.otherLiabilities || ''}
                                        onChange={(e) => updateField('otherLiabilities', parseFloat(e.target.value) || 0)}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Section 4: Financing & SBA Debt */}
            {intakeDepth === 'detailed' && activeSection === 'financing' && (
                <div id="quick-deal-section-financing" className="space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">
                                Buyer Equity Down Payment (%)
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={5}
                                    max={100}
                                    step={1}
                                    value={formData.equityContributionPercent || ''}
                                    onChange={(e) => updateField('equityContributionPercent', parseFloat(e.target.value) || 0)}
                                    className="h-9 text-xs font-mono font-medium"
                                />
                                <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                                    = ${equityAmount.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">
                                Seller Financing / Note Amount ($)
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                step={10000}
                                value={formData.sellerNoteAmount || ''}
                                onChange={(e) => updateField('sellerNoteAmount', parseFloat(e.target.value) || 0)}
                                placeholder="500000"
                                className="h-9 text-xs font-mono font-medium"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">
                                Senior / SBA 7(a) Interest Rate (%)
                            </Label>
                            <Input
                                type="number"
                                min={2}
                                max={20}
                                step={0.25}
                                value={formData.interestRate || ''}
                                onChange={(e) => updateField('interestRate', parseFloat(e.target.value) || 0)}
                                placeholder="9.5"
                                className="h-9 text-xs font-mono"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">
                                Loan Amortization Term (Years)
                            </Label>
                            <Input
                                type="number"
                                min={1}
                                max={30}
                                step={1}
                                value={formData.amortizationYears || ''}
                                onChange={(e) => updateField('amortizationYears', parseInt(e.target.value, 10) || 0)}
                                placeholder="10"
                                className="h-9 text-xs font-mono"
                            />
                        </div>
                    </div>

                    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
                        💡 <strong>Implied Senior Debt:</strong> ${seniorDebtAmount.toLocaleString()} will be funded via SBA 7(a) / senior bank credit based on ${(formData.askingPrice || 0).toLocaleString()} purchase price minus ${equityAmount.toLocaleString()} equity check and ${(formData.sellerNoteAmount || 0).toLocaleString()} seller note.
                    </div>
                </div>
            )}

            {/* Section 5: Risk & Diligence Flags */}
            {intakeDepth === 'detailed' && activeSection === 'risk' && (
                <div id="quick-deal-section-risk" className="space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">
                                Top Customer Concentration (%)
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={formData.topCustomerConcentrationPercent || ''}
                                onChange={(e) => updateField('topCustomerConcentrationPercent', parseFloat(e.target.value) || 0)}
                                placeholder="38"
                                className="h-9 text-xs font-mono font-medium"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                &gt; 30% concentration automatically triggers customer contract review flag.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-foreground">
                                Key Person Dependency Risk
                            </Label>
                            <Select
                                value={formData.keyPersonRisk}
                                onValueChange={(val: 'low' | 'moderate' | 'high') => updateField('keyPersonRisk', val)}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Select risk level..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low" className="text-xs">
                                        🟢 Low (Experienced 2nd-tier management in place)
                                    </SelectItem>
                                    <SelectItem value="moderate" className="text-xs">
                                        🟡 Moderate (Owner handles key vendor/customer relationships)
                                    </SelectItem>
                                    <SelectItem value="high" className="text-xs">
                                        🔴 High (Owner is sole salesperson/technician)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Customer Concentration & Contract Details</Label>
                        <Textarea
                            rows={2}
                            value={formData.customerConcentrationNotes || ''}
                            onChange={(e) => updateField('customerConcentrationNotes', e.target.value)}
                            placeholder="e.g. Largest customer under 3-year recurring contract renewal scheduled for Q4..."
                            className="text-xs resize-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Additional Diligence Notes & Seller Background</Label>
                        <Textarea
                            rows={2}
                            value={formData.generalNotes || ''}
                            onChange={(e) => updateField('generalNotes', e.target.value)}
                            placeholder="e.g. Owner willing to carry 15% seller note and provide 12-month transition support..."
                            className="text-xs resize-none"
                        />
                    </div>
                </div>
            )}

            {/* Navigation & Submit Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive cursor-pointer"
                        onClick={handleClear}
                        title="Clear all fields and reset form"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear All
                    </Button>
                    {intakeDepth === 'detailed' && activeSection !== 'basics' && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs cursor-pointer"
                            onClick={() => {
                                if (activeSection === 'financials') setActiveSection('basics')
                                else if (activeSection === 'assets') setActiveSection('financials')
                                else if (activeSection === 'financing') setActiveSection('assets')
                                else if (activeSection === 'risk') setActiveSection('financing')
                            }}
                        >
                            &larr; Back
                        </Button>
                    )}
                    {intakeDepth === 'detailed' && activeSection !== 'risk' && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs cursor-pointer"
                            onClick={() => {
                                if (activeSection === 'basics') setActiveSection('financials')
                                else if (activeSection === 'financials') setActiveSection('assets')
                                else if (activeSection === 'assets') setActiveSection('financing')
                                else if (activeSection === 'financing') setActiveSection('risk')
                            }}
                        >
                            Next Section &rarr;
                        </Button>
                    )}
                </div>

                <Button
                    id="quick-deal-generate-btn"
                    data-quick-deal-generate
                    type="button"
                    size="sm"
                    disabled={disabled || !hasMinimumInputs}
                    onClick={handleSubmit}
                    className="h-9 px-5 text-xs font-bold gap-2 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer w-full sm:w-auto"
                >
                    <Zap className="h-4 w-4 text-amber-300" />
                    <span>{intakeDepth === 'quick' ? '⚡ Generate Preliminary Deal Screen' : '⚡ Generate Detailed Deal Model & Dashboard'}</span>
                </Button>
            </div>
            {!hasMinimumInputs ? (
                <p className="text-right text-[11px] text-muted-foreground">
                    Add the deal name, asking price, revenue, and EBITDA/SDE to generate the screen.
                </p>
            ) : null}
        </div>
    )
}
