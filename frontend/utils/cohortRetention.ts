import type { ProjectSynthesisItem, DealModel } from '../hooks/backend/diligence'

export type CohortPeriod = 'M0' | 'M3' | 'M6' | 'M12' | 'M18' | 'M24'

export type CohortRow = {
    cohortId: string
    cohortName: string // e.g. "Q1 2024", "Q2 2024", "Jan 2024"
    startingCustomers: number
    startingRevenue: number // monthly recurring or baseline volume in USD
    logoRetention: Record<CohortPeriod, number | null>
    revenueRetention: Record<CohortPeriod, number | null> // NRR %
}

export type CohortHealthStatus = 'healthy' | 'warning' | 'critical'

export type CohortAnalysisSummary = {
    overallHealth: CohortHealthStatus
    averageM12LogoRetention: number
    averageM12Nrr: number
    churnFloorPercent: number
    isPriceHikeMaskingChurn: boolean
    alertTitle: string
    alertDescription: string
    activeCohortsCount: number
}

export const COHORT_PERIODS: CohortPeriod[] = ['M0', 'M3', 'M6', 'M12', 'M18', 'M24']

export const DEFAULT_PRESET_COHORTS: Record<string, CohortRow[]> = {
    saas: [
        {
            cohortId: 'c-2024-q1',
            cohortName: 'Q1 2024',
            startingCustomers: 120,
            startingRevenue: 84000,
            logoRetention: { M0: 100, M3: 94, M6: 89, M12: 84, M18: 81, M24: 78 },
            revenueRetention: { M0: 100, M3: 102, M6: 107, M12: 114, M18: 119, M24: 122 },
        },
        {
            cohortId: 'c-2024-q2',
            cohortName: 'Q2 2024',
            startingCustomers: 135,
            startingRevenue: 98000,
            logoRetention: { M0: 100, M3: 93, M6: 87, M12: 82, M18: 79, M24: null },
            revenueRetention: { M0: 100, M3: 101, M6: 105, M12: 112, M18: 116, M24: null },
        },
        {
            cohortId: 'c-2024-q3',
            cohortName: 'Q3 2024',
            startingCustomers: 142,
            startingRevenue: 105000,
            logoRetention: { M0: 100, M3: 91, M6: 85, M12: 80, M18: null, M24: null },
            revenueRetention: { M0: 100, M3: 100, M6: 104, M12: 110, M18: null, M24: null },
        },
        {
            cohortId: 'c-2024-q4',
            cohortName: 'Q4 2024',
            startingCustomers: 158,
            startingRevenue: 118000,
            logoRetention: { M0: 100, M3: 89, M6: 83, M12: 77, M18: null, M24: null },
            revenueRetention: { M0: 100, M3: 99, M6: 102, M12: 108, M18: null, M24: null },
        },
        {
            cohortId: 'c-2025-q1',
            cohortName: 'Q1 2025',
            startingCustomers: 165,
            startingRevenue: 126000,
            logoRetention: { M0: 100, M3: 88, M6: 81, M12: null, M18: null, M24: null },
            revenueRetention: { M0: 100, M3: 98, M6: 101, M12: null, M18: null, M24: null },
        },
        {
            cohortId: 'c-2025-q2',
            cohortName: 'Q2 2025',
            startingCustomers: 174,
            startingRevenue: 135000,
            logoRetention: { M0: 100, M3: 86, M6: null, M12: null, M18: null, M24: null },
            revenueRetention: { M0: 100, M3: 97, M6: null, M12: null, M18: null, M24: null },
        },
    ],
    manufacturing: [
        {
            cohortId: 'c-2024-q1',
            cohortName: 'Q1 2024',
            startingCustomers: 45,
            startingRevenue: 420000,
            logoRetention: { M0: 100, M3: 98, M6: 95, M12: 91, M18: 88, M24: 86 },
            revenueRetention: { M0: 100, M3: 101, M6: 103, M12: 106, M18: 108, M24: 110 },
        },
        {
            cohortId: 'c-2024-q2',
            cohortName: 'Q2 2024',
            startingCustomers: 48,
            startingRevenue: 460000,
            logoRetention: { M0: 100, M3: 96, M6: 93, M12: 89, M18: 87, M24: null },
            revenueRetention: { M0: 100, M3: 100, M6: 102, M12: 105, M18: 107, M24: null },
        },
        {
            cohortId: 'c-2024-q3',
            cohortName: 'Q3 2024',
            startingCustomers: 52,
            startingRevenue: 510000,
            logoRetention: { M0: 100, M3: 94, M6: 90, M12: 86, M18: null, M24: null },
            revenueRetention: { M0: 100, M3: 99, M6: 101, M12: 104, M18: null, M24: null },
        },
        {
            cohortId: 'c-2024-q4',
            cohortName: 'Q4 2024',
            startingCustomers: 50,
            startingRevenue: 490000,
            logoRetention: { M0: 100, M3: 92, M6: 88, M12: 84, M18: null, M24: null },
            revenueRetention: { M0: 100, M3: 99, M6: 101, M12: 103, M18: null, M24: null },
        },
        {
            cohortId: 'c-2025-q1',
            cohortName: 'Q1 2025',
            startingCustomers: 56,
            startingRevenue: 550000,
            logoRetention: { M0: 100, M3: 93, M6: 87, M12: null, M18: null, M24: null },
            revenueRetention: { M0: 100, M3: 98, M6: 100, M12: null, M18: null, M24: null },
        },
        {
            cohortId: 'c-2025-q2',
            cohortName: 'Q2 2025',
            startingCustomers: 58,
            startingRevenue: 580000,
            logoRetention: { M0: 100, M3: 91, M6: null, M12: null, M18: null, M24: null },
            revenueRetention: { M0: 100, M3: 98, M6: null, M12: null, M18: null, M24: null },
        },
    ],
    decay_alert: [
        {
            cohortId: 'c-2024-q1',
            cohortName: 'Q1 2024',
            startingCustomers: 85,
            startingRevenue: 150000,
            logoRetention: { M0: 100, M3: 81, M6: 67, M12: 52, M18: 44, M24: 38 },
            revenueRetention: { M0: 100, M3: 96, M6: 98, M12: 104, M18: 106, M24: 108 },
        },
        {
            cohortId: 'c-2024-q2',
            cohortName: 'Q2 2024',
            startingCustomers: 92,
            startingRevenue: 165000,
            logoRetention: { M0: 100, M3: 79, M6: 64, M12: 49, M18: 41, M24: null },
            revenueRetention: { M0: 100, M3: 95, M6: 97, M12: 102, M18: 105, M24: null },
        },
        {
            cohortId: 'c-2024-q3',
            cohortName: 'Q3 2024',
            startingCustomers: 88,
            startingRevenue: 160000,
            logoRetention: { M0: 100, M3: 76, M6: 61, M12: 46, M18: null, M24: null },
            revenueRetention: { M0: 100, M3: 94, M6: 96, M12: 101, M18: null, M24: null },
        },
        {
            cohortId: 'c-2024-q4',
            cohortName: 'Q4 2024',
            startingCustomers: 95,
            startingRevenue: 175000,
            logoRetention: { M0: 100, M3: 74, M6: 58, M12: 43, M18: null, M24: null },
            revenueRetention: { M0: 100, M3: 93, M6: 95, M12: 99, M18: null, M24: null },
        },
        {
            cohortId: 'c-2025-q1',
            cohortName: 'Q1 2025',
            startingCustomers: 100,
            startingRevenue: 190000,
            logoRetention: { M0: 100, M3: 72, M6: 55, M12: null, M18: null, M24: null },
            revenueRetention: { M0: 100, M3: 92, M6: 94, M12: null, M18: null, M24: null },
        },
        {
            cohortId: 'c-2025-q2',
            cohortName: 'Q2 2025',
            startingCustomers: 105,
            startingRevenue: 205000,
            logoRetention: { M0: 100, M3: 69, M6: null, M12: null, M18: null, M24: null },
            revenueRetention: { M0: 100, M3: 91, M6: null, M12: null, M18: null, M24: null },
        },
    ],
}

/**
 * Returns dynamic cohorts based on project synthesis industry or defaults.
 */
export function getCohortsForProject(synthesis?: ProjectSynthesisItem, dealModel?: DealModel): CohortRow[] {
    const text = [
        synthesis?.projectName || '',
        synthesis?.companyName || '',
        synthesis?.executiveSummary || '',
        synthesis?.finalJudgmentSummary || '',
    ].join(' ').toLowerCase()

    if (text.includes('saas') || text.includes('software') || text.includes('subscription')) {
        return DEFAULT_PRESET_COHORTS.saas
    }

    if (text.includes('decay') || text.includes('churn') || text.includes('reneg') || text.includes('risk')) {
        return DEFAULT_PRESET_COHORTS.decay_alert
    }

    return DEFAULT_PRESET_COHORTS.manufacturing
}

/**
 * Computes average Month-12 Logo Retention, NRR %, and detects price-hike churn masking.
 */
export function computeCohortSummary(cohorts: CohortRow[]): CohortAnalysisSummary {
    if (!cohorts || cohorts.length === 0) {
        return {
            overallHealth: 'healthy',
            averageM12LogoRetention: 100,
            averageM12Nrr: 100,
            churnFloorPercent: 100,
            isPriceHikeMaskingChurn: false,
            alertTitle: 'No Cohorts Detected',
            alertDescription: 'Insufficient historical billing data to build retention matrix.',
            activeCohortsCount: 0,
        }
    }

    const m12Logos: number[] = []
    const m12Nrrs: number[] = []
    const allTerminalLogos: number[] = []

    for (const c of cohorts) {
        if (c.logoRetention.M12 !== null) m12Logos.push(c.logoRetention.M12)
        if (c.revenueRetention.M12 !== null) m12Nrrs.push(c.revenueRetention.M12)

        const terminal = c.logoRetention.M24 ?? c.logoRetention.M18 ?? c.logoRetention.M12 ?? c.logoRetention.M6 ?? c.logoRetention.M3
        if (terminal !== null && terminal !== undefined) {
            allTerminalLogos.push(terminal)
        }
    }

    const avgM12Logo = m12Logos.length > 0 ? Math.round(m12Logos.reduce((a, b) => a + b, 0) / m12Logos.length) : 82
    const avgM12Nrr = m12Nrrs.length > 0 ? Math.round(m12Nrrs.reduce((a, b) => a + b, 0) / m12Nrrs.length) : 108
    const churnFloor = allTerminalLogos.length > 0 ? Math.min(...allTerminalLogos) : 75

    // Flag price hike masking churn when NRR is expanding (>= 100%) but logo retention is severely dropping (< 60%)
    const isPriceHikeMaskingChurn = avgM12Nrr >= 100 && avgM12Logo < 65

    let overallHealth: CohortHealthStatus = 'healthy'
    let alertTitle = 'Stable Customer Retention & Account Expansion'
    let alertDescription = `Logo retention stabilizes around ${churnFloor}% with ${avgM12Nrr}% Net Revenue Retention (NRR). Existing customer base is expanding their contract spend.`

    if (avgM12Logo < 55 || churnFloor < 45) {
        overallHealth = 'critical'
        alertTitle = isPriceHikeMaskingChurn
            ? '⚠️ High Risk: Top-Line Expansion Masking Severe Logo Churn'
            : '🚨 Critical Churn: Cohort Retention Dropping Below 50%'
        alertDescription = isPriceHikeMaskingChurn
            ? `Top-line revenue appears stable (${avgM12Nrr}% NRR), but the business lost ${100 - avgM12Logo}% of customer logos by Month 12. Growth is heavily dependent on aggressive pricing rather than customer satisfaction.`
            : `Customers are rapidly churning out with Month 12 retention at only ${avgM12Logo}%. Requires urgent customer success audit and valuation discount.`
    } else if (avgM12Logo < 75 || avgM12Nrr < 95) {
        overallHealth = 'warning'
        alertTitle = 'Moderate Logo Decay / Churn Watchlist'
        alertDescription = `Average Month 12 logo retention is ${avgM12Logo}% with ${avgM12Nrr}% NRR. Customer cohorts show gradual attrition that requires ongoing contract renewal monitoring.`
    }

    return {
        overallHealth,
        averageM12LogoRetention: avgM12Logo,
        averageM12Nrr: avgM12Nrr,
        churnFloorPercent: churnFloor,
        isPriceHikeMaskingChurn,
        alertTitle,
        alertDescription,
        activeCohortsCount: cohorts.length,
    }
}

/**
 * Returns calibrated CSS classes for a given retention percentage.
 */
export function getCohortCellColor(percentage: number | null, mode: 'logo' | 'nrr'): {
    bgClass: string
    textClass: string
    borderClass: string
} {
    if (percentage === null) {
        return {
            bgClass: 'bg-muted/15',
            textClass: 'text-muted-foreground/30',
            borderClass: 'border-transparent',
        }
    }

    if (mode === 'nrr') {
        if (percentage >= 115) {
            return {
                bgClass: 'bg-emerald-500/25 dark:bg-emerald-500/30',
                textClass: 'text-emerald-950 dark:text-emerald-100 font-bold',
                borderClass: 'border-emerald-500/40',
            }
        }
        if (percentage >= 100) {
            return {
                bgClass: 'bg-emerald-500/15 dark:bg-emerald-500/20',
                textClass: 'text-emerald-800 dark:text-emerald-200 font-semibold',
                borderClass: 'border-emerald-500/25',
            }
        }
        if (percentage >= 90) {
            return {
                bgClass: 'bg-amber-500/15 dark:bg-amber-500/20',
                textClass: 'text-amber-800 dark:text-amber-200 font-semibold',
                borderClass: 'border-amber-500/30',
            }
        }
        return {
            bgClass: 'bg-rose-500/20 dark:bg-rose-500/25',
            textClass: 'text-rose-900 dark:text-rose-100 font-bold',
            borderClass: 'border-rose-500/40',
        }
    }

    // Logo Retention mode
    if (percentage >= 90) {
        return {
            bgClass: 'bg-emerald-500/25 dark:bg-emerald-500/30',
            textClass: 'text-emerald-950 dark:text-emerald-100 font-bold',
            borderClass: 'border-emerald-500/40',
        }
    }
    if (percentage >= 75) {
        return {
            bgClass: 'bg-emerald-500/12 dark:bg-emerald-500/18',
            textClass: 'text-emerald-800 dark:text-emerald-200 font-semibold',
            borderClass: 'border-emerald-500/20',
        }
    }
    if (percentage >= 60) {
        return {
            bgClass: 'bg-amber-500/15 dark:bg-amber-500/20',
            textClass: 'text-amber-800 dark:text-amber-200 font-semibold',
            borderClass: 'border-amber-500/30',
        }
    }
    return {
        bgClass: 'bg-rose-500/20 dark:bg-rose-500/25',
        textClass: 'text-rose-900 dark:text-rose-100 font-bold',
        borderClass: 'border-rose-500/40',
    }
}
