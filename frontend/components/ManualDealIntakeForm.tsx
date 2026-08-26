import { useState, useMemo } from 'react'
import {
    Building2,
    DollarSign,
    Layers,
    Landmark,
    Calculator,
    Zap,
    ShieldAlert,
} from 'lucide-react'

import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../lib/shadcn/select'
import { Textarea } from '../lib/shadcn/textarea'
import {
    MANUAL_DEAL_PRESETS,
    ManualDealFormData,
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
    disabled?: boolean
}

export default function ManualDealIntakeForm({ onComplete, disabled = false }: ManualDealIntakeFormProps) {
    const [formData, setFormData] = useState<ManualDealFormData>(MANUAL_DEAL_PRESETS.manufacturing.data)
    const [activeSection, setActiveSection] = useState<'basics' | 'financials' | 'assets' | 'financing' | 'risk'>('basics')

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
            setFormData(preset.data)
        }
    }

    const handleSubmit = () => {
        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
        const randomHash = Math.random().toString(36).substring(2, 8)
        const projectId = `project-${timestamp}-${randomHash}`

        const dealModel = buildManualDealModel(formData, projectId)
        const synthesis = buildManualProjectSynthesis(formData, dealModel, projectId)

        onComplete(dealModel, synthesis, formData)
    }

    return (
        <div className="space-y-6">
            {/* Header & Quick Presets Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
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
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Enter numbers and parameters to generate complete valuation, returns, and diligence dashboards in 0.05s without PDFs.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    <span className="text-[11px] font-medium text-muted-foreground mr-1">Load Preset:</span>
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
                </div>
            </div>

            {/* Live Metrics Summary Pill */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-lg border border-border bg-card/60">
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
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2">
                <button
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
            {activeSection === 'basics' && (
                <div className="space-y-4 animate-in fade-in duration-200">
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
            {activeSection === 'financials' && (
                <div className="space-y-4 animate-in fade-in duration-200">
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
            {activeSection === 'assets' && (
                <div className="space-y-4 animate-in fade-in duration-200">
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
            {activeSection === 'financing' && (
                <div className="space-y-4 animate-in fade-in duration-200">
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
            {activeSection === 'risk' && (
                <div className="space-y-4 animate-in fade-in duration-200">
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
                    {activeSection !== 'basics' && (
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
                    {activeSection !== 'risk' && (
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
                    type="button"
                    size="sm"
                    disabled={disabled || !formData.dealName || !formData.askingPrice}
                    onClick={handleSubmit}
                    className="h-9 px-5 text-xs font-bold gap-2 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer w-full sm:w-auto"
                >
                    <Zap className="h-4 w-4 text-amber-300" />
                    <span>⚡ Generate Instant Deal Model & Full Dashboard</span>
                </Button>
            </div>
        </div>
    )
}
