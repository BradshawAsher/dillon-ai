export type AddBackTaxonomyCategory = 'defensible' | 'aggressive' | 'disallowed' | 'management_deficit'

export type ClassifiedAddBackItem = {
    id: string
    label: string
    amount: number
    category: AddBackTaxonomyCategory
    quality: 'supported' | 'partial' | 'unsupported'
    isDisallowedByDefault: boolean
    detail: string
    sourceFile?: string
    sourceLocation?: string
    excerpt?: string
}

export type AddBackRepricingResult = {
    reportedEbitda: number
    totalAddBacksCount: number
    totalAddBacksAmount: number
    disallowedCount: number
    disallowedAmount: number
    approvedAddBacksAmount: number
    adjustedEbitda: number
    exitMultiple: number
    baseValuation: number
    adjustedValuation: number
    purchasePriceReduction: number
}

/**
 * Classifies an add-back description into a standardized SBA/commercial lender taxonomy.
 */
export function classifyAddBackCategory(text: string): AddBackTaxonomyCategory {
    const lower = text.toLowerCase()

    // 1. Personal / discretionary perks (SBA / Lender Disallowed)
    if (
        lower.includes('vehicle') ||
        lower.includes('car') ||
        lower.includes('auto') ||
        lower.includes('club') ||
        lower.includes('golf') ||
        lower.includes('travel') ||
        lower.includes('personal') ||
        lower.includes('perk') ||
        lower.includes('vacation') ||
        lower.includes('cell phone') ||
        lower.includes('meal') ||
        lower.includes('entertainment')
    ) {
        return 'disallowed'
    }

    // 2. Management wage deficit / replacement GM deficit
    if (
        lower.includes('market wage') ||
        lower.includes('replacement wage') ||
        lower.includes('gm salary') ||
        lower.includes('management deficit') ||
        lower.includes('underpaid')
    ) {
        return 'management_deficit'
    }

    // 3. Aggressive / disputed adjustments
    if (
        lower.includes('family') ||
        lower.includes('spouse') ||
        lower.includes('advisory') ||
        lower.includes('consulting') ||
        lower.includes('bonus') ||
        lower.includes('discretionary') ||
        lower.includes('unsupported')
    ) {
        return 'aggressive'
    }

    // 4. Defensible one-time non-recurring
    return 'defensible'
}

/**
 * Returns human-readable label and UI color badge for a taxonomy category.
 */
export function getTaxonomyBadge(category: AddBackTaxonomyCategory): {
    label: string
    icon: string
    bgClass: string
    textClass: string
    borderClass: string
    tooltip: string
} {
    switch (category) {
        case 'disallowed':
            return {
                label: 'SBA / Lender Disallowed',
                icon: '❌',
                bgClass: 'bg-rose-500/15 dark:bg-rose-500/25',
                textClass: 'text-rose-900 dark:text-rose-200 font-bold',
                borderClass: 'border-rose-500/35',
                tooltip: 'Personal/discretionary perks strictly excluded by SBA and commercial bank cash-flow underwriting.',
            }
        case 'management_deficit':
            return {
                label: 'Market Wage Deficit',
                icon: '💼',
                bgClass: 'bg-amber-500/15 dark:bg-amber-500/25',
                textClass: 'text-amber-900 dark:text-amber-200 font-bold',
                borderClass: 'border-amber-500/35',
                tooltip: 'Mandatory downward adjustment to hire a full-time replacement GM/executive.',
            }
        case 'aggressive':
            return {
                label: 'Aggressive / Disputed',
                icon: '⚠️',
                bgClass: 'bg-amber-500/12 dark:bg-amber-500/20',
                textClass: 'text-amber-800 dark:text-amber-300 font-semibold',
                borderClass: 'border-amber-500/25',
                tooltip: 'Non-standard owner adjustments requiring rigorous proof of non-recurrence.',
            }
        case 'defensible':
        default:
            return {
                label: 'Defensible One-Time',
                icon: '🏛️',
                bgClass: 'bg-emerald-500/15 dark:bg-emerald-500/20',
                textClass: 'text-emerald-900 dark:text-emerald-200 font-semibold',
                borderClass: 'border-emerald-500/30',
                tooltip: 'Legitimate non-recurring expense (e.g. facility relocation, litigation, lease termination).',
            }
    }
}

/**
 * Recalculates normalized EBITDA, purchase price, and net valuation impact based on selected disallowances.
 */
export function recalculateAdjustedEbitdaWithDisallowances(
    reportedEbitda: number,
    items: Array<{ amount: number; isDisallowed: boolean }>,
    exitMultiple = 4.5
): AddBackRepricingResult {
    const baseEbitda = Math.max(0, reportedEbitda || 0)
    const multiple = Math.max(1, exitMultiple || 4.5)

    let totalAmount = 0
    let disallowedAmount = 0
    let disallowedCount = 0

    for (const item of items) {
        const amt = Math.max(0, item.amount || 0)
        totalAmount += amt
        if (item.isDisallowed) {
            disallowedAmount += amt
            disallowedCount++
        }
    }

    const approvedAddBacksAmount = Math.max(0, totalAmount - disallowedAmount)
    const adjustedEbitda = Math.max(0, baseEbitda + approvedAddBacksAmount)
    const baseValuation = Math.round((baseEbitda + totalAmount) * multiple)
    const adjustedValuation = Math.round(adjustedEbitda * multiple)
    const purchasePriceReduction = Math.max(0, baseValuation - adjustedValuation)

    return {
        reportedEbitda: baseEbitda,
        totalAddBacksCount: items.length,
        totalAddBacksAmount: totalAmount,
        disallowedCount,
        disallowedAmount,
        approvedAddBacksAmount,
        adjustedEbitda,
        exitMultiple: multiple,
        baseValuation,
        adjustedValuation,
        purchasePriceReduction,
    }
}

export const DEFAULT_CLASSIFIED_ADD_BACKS: ClassifiedAddBackItem[] = [
    {
        id: 'ab-1',
        label: 'Owner Personal Vehicle & Fuel Expense',
        amount: 36000,
        category: 'disallowed',
        quality: 'unsupported',
        isDisallowedByDefault: true,
        detail: 'Luxury automobile lease and non-business travel fuel billed directly through operating account.',
        sourceFile: 'P&L_2024.xlsx',
        sourceLocation: 'Line 42',
        excerpt: 'Auto lease: $36,000 / yr'
    },
    {
        id: 'ab-2',
        label: 'Non-Working Family Member Salary & Health Plan',
        amount: 68000,
        category: 'disallowed',
        quality: 'unsupported',
        isDisallowedByDefault: true,
        detail: 'Spouse W2 compensation and full medical coverage with zero operational job responsibilities.',
        sourceFile: 'Tax_Return_1120S.pdf',
        sourceLocation: 'Schedule K-1 Line 14',
        excerpt: 'Officer comp non-exec: $68,000'
    },
    {
        id: 'ab-3',
        label: 'Discretionary Executive Travel & Resort Lodging',
        amount: 36000,
        category: 'disallowed',
        quality: 'partial',
        isDisallowedByDefault: true,
        detail: 'Annual ski retreat and overseas conference passes categorized under business development.',
        sourceFile: 'General_Ledger.csv',
        sourceLocation: 'Account 6020',
        excerpt: 'Travel & entertainment: $36,000'
    },
    {
        id: 'ab-4',
        label: 'One-Time Facility Relocation & Severance',
        amount: 85000,
        category: 'defensible',
        quality: 'supported',
        isDisallowedByDefault: false,
        detail: 'Non-recurring physical warehouse consolidation and one-time severance packages.',
        sourceFile: 'Relocation_Invoices.pdf',
        sourceLocation: 'Page 3',
        excerpt: 'Mover contracts & terminal severance: $85,000'
    },
    {
        id: 'ab-5',
        label: 'Market Wage Deficit for Replacement GM',
        amount: 45000,
        category: 'management_deficit',
        quality: 'supported',
        isDisallowedByDefault: false,
        detail: 'Owner currently taking below-market $80,000 salary; market replacement GM requires $125,000.',
        sourceFile: 'Compensation_Benchmarking.pdf',
        sourceLocation: 'Section 4',
        excerpt: 'GM benchmark deficit: $45,000'
    }
]

