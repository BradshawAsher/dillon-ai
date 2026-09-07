import type { BenchmarkBand } from './benchmarkGrade'

export interface SectorBenchmarkMetrics {
    entryMultiple: BenchmarkBand
    grossMargin: BenchmarkBand
    ebitdaMargin: BenchmarkBand
    revenueGrowth: BenchmarkBand
    paybackYears: BenchmarkBand
    dscr: BenchmarkBand
}

export interface SectorBenchmarkProfile {
    key: string
    displayName: string
    shortCategory: string
    description: string
    metrics: SectorBenchmarkMetrics
    aliases: string[]
}

export const BENCHMARK_PROVENANCE = {
    label: 'Illustrative internal benchmark profile',
    marketAsOf: null,
    sourceNote: 'Internal illustrative screening ranges. No source dataset or market as-of date is recorded. Validate against current, citable comparables before investment use.',
} as const

/**
 * Illustrative Middle-Market & SMB Vertical Industry Benchmark Taxonomy.
 * Low/median/high values are internal screening ranges, not claimed percentiles from a
 * licensed or live dataset. See BENCHMARK_PROVENANCE and validate before investment use.
 */
export const SECTOR_BENCHMARKS: Record<string, SectorBenchmarkProfile> = {
    hvac_mep: {
        key: 'hvac_mep',
        displayName: 'HVAC, Plumbing & Mechanical (MEP)',
        shortCategory: 'HVAC & MEP',
        description: 'Commercial & residential heating, ventilation, air conditioning, plumbing and electrical contractors.',
        metrics: {
            entryMultiple: { low: 3.2, median: 4.2, high: 5.8 },
            grossMargin: { low: 0.38, median: 0.48, high: 0.58 },
            ebitdaMargin: { low: 0.12, median: 0.18, high: 0.24 },
            revenueGrowth: { low: 0.04, median: 0.09, high: 0.16 },
            paybackYears: { low: 3.5, median: 5.0, high: 7.5 },
            dscr: { low: 1.2, median: 1.6, high: 2.5 },
        },
        aliases: ['hvac', 'plumbing', 'mep', 'mechanical', 'heating', 'cooling', 'air conditioning', 'electrical contractor', 'trades'],
    },
    b2b_saas: {
        key: 'b2b_saas',
        displayName: 'B2B SaaS & Cloud Software',
        shortCategory: 'B2B SaaS',
        description: 'Subscription recurring revenue (ARR) B2B software, supply chain, and vertical applications.',
        metrics: {
            entryMultiple: { low: 4.5, median: 6.5, high: 9.5 },
            grossMargin: { low: 0.70, median: 0.78, high: 0.88 },
            ebitdaMargin: { low: 0.15, median: 0.24, high: 0.35 },
            revenueGrowth: { low: 0.12, median: 0.22, high: 0.40 },
            paybackYears: { low: 4.0, median: 6.5, high: 9.0 },
            dscr: { low: 1.3, median: 1.8, high: 3.0 },
        },
        aliases: ['saas', 'software', 'cloud', 'subscription', 'arr', 'b2b software', 'tech', 'platform'],
    },
    precision_mfg: {
        key: 'precision_mfg',
        displayName: 'Precision Machining, CNC & Job Shops',
        shortCategory: 'Precision Mfg',
        description: 'Contract precision manufacturing, CNC machining, aerospace/defense tooling, and metal fabrication.',
        metrics: {
            entryMultiple: { low: 3.0, median: 3.8, high: 4.8 },
            grossMargin: { low: 0.26, median: 0.34, high: 0.44 },
            ebitdaMargin: { low: 0.09, median: 0.14, high: 0.20 },
            revenueGrowth: { low: 0.02, median: 0.06, high: 0.12 },
            paybackYears: { low: 3.0, median: 4.8, high: 7.0 },
            dscr: { low: 1.15, median: 1.5, high: 2.2 },
        },
        aliases: ['precision', 'machining', 'cnc', 'manufacturing', 'metal', 'fabrication', 'job shop', 'tooling', 'industrial parts'],
    },
    healthcare_dental: {
        key: 'healthcare_dental',
        displayName: 'Dental Practices & Healthcare Clinics',
        shortCategory: 'Healthcare / Dental',
        description: 'Private dental practices, physical therapy clinics, optometry, and outpatient specialty healthcare.',
        metrics: {
            entryMultiple: { low: 3.8, median: 5.0, high: 7.0 },
            grossMargin: { low: 0.52, median: 0.64, high: 0.74 },
            ebitdaMargin: { low: 0.15, median: 0.22, high: 0.30 },
            revenueGrowth: { low: 0.03, median: 0.07, high: 0.14 },
            paybackYears: { low: 3.5, median: 5.2, high: 8.0 },
            dscr: { low: 1.25, median: 1.7, high: 2.6 },
        },
        aliases: ['dental', 'clinic', 'healthcare', 'medical', 'dentist', 'orthodontics', 'physical therapy', 'optometry', 'health'],
    },
    logistics_freight: {
        key: 'logistics_freight',
        displayName: 'Freight Brokerage, Trucking & Logistics',
        shortCategory: 'Logistics & Freight',
        description: 'Non-asset freight brokerage, specialized 3PL warehousing, intermodal freight, and regional fleet hauling.',
        metrics: {
            entryMultiple: { low: 2.8, median: 3.6, high: 4.8 },
            grossMargin: { low: 0.15, median: 0.22, high: 0.32 },
            ebitdaMargin: { low: 0.07, median: 0.11, high: 0.17 },
            revenueGrowth: { low: 0.03, median: 0.08, high: 0.18 },
            paybackYears: { low: 2.8, median: 4.5, high: 6.8 },
            dscr: { low: 1.15, median: 1.45, high: 2.1 },
        },
        aliases: ['logistics', 'freight', 'trucking', '3pl', 'warehousing', 'brokerage', 'hauling', 'transport', 'transportation'],
    },
    commercial_landscaping: {
        key: 'commercial_landscaping',
        displayName: 'Commercial Landscaping & Facility Services',
        shortCategory: 'Commercial Landscaping',
        description: 'Recurring commercial landscape maintenance, snow removal, tree care, and exterior property preservation.',
        metrics: {
            entryMultiple: { low: 3.0, median: 3.9, high: 5.2 },
            grossMargin: { low: 0.36, median: 0.46, high: 0.56 },
            ebitdaMargin: { low: 0.11, median: 0.16, high: 0.22 },
            revenueGrowth: { low: 0.03, median: 0.07, high: 0.14 },
            paybackYears: { low: 3.2, median: 4.8, high: 7.2 },
            dscr: { low: 1.2, median: 1.55, high: 2.4 },
        },
        aliases: ['landscaping', 'lawn', 'grounds', 'tree care', 'exterior', 'snow removal', 'facility maintenance', 'landscape'],
    },
    it_msp: {
        key: 'it_msp',
        displayName: 'Managed IT Services (MSP) & Cyber',
        shortCategory: 'Managed IT / MSP',
        description: 'Recurring monthly contract IT support, cybersecurity, managed cloud backup, and enterprise networking.',
        metrics: {
            entryMultiple: { low: 4.0, median: 5.2, high: 6.8 },
            grossMargin: { low: 0.42, median: 0.52, high: 0.64 },
            ebitdaMargin: { low: 0.13, median: 0.19, high: 0.27 },
            revenueGrowth: { low: 0.06, median: 0.12, high: 0.22 },
            paybackYears: { low: 3.8, median: 5.5, high: 7.8 },
            dscr: { low: 1.25, median: 1.65, high: 2.6 },
        },
        aliases: ['msp', 'it services', 'managed service', 'cybersecurity', 'tech support', 'networking', 'it consulting', 'cloud services'],
    },
    ecommerce_dtc: {
        key: 'ecommerce_dtc',
        displayName: 'E-Commerce & DTC Consumer Brands',
        shortCategory: 'E-Commerce',
        description: 'Omnichannel consumer brands, Amazon FBA, Shopify direct-to-consumer, and branded proprietary goods.',
        metrics: {
            entryMultiple: { low: 2.5, median: 3.2, high: 4.5 },
            grossMargin: { low: 0.32, median: 0.42, high: 0.54 },
            ebitdaMargin: { low: 0.08, median: 0.12, high: 0.18 },
            revenueGrowth: { low: 0.05, median: 0.14, high: 0.30 },
            paybackYears: { low: 2.6, median: 4.2, high: 6.5 },
            dscr: { low: 1.15, median: 1.45, high: 2.1 },
        },
        aliases: ['ecommerce', 'e-commerce', 'dtc', 'fba', 'amazon', 'shopify', 'online store', 'consumer goods', 'retail'],
    },
    food_bev_dist: {
        key: 'food_bev_dist',
        displayName: 'Food & Beverage Processing / Distribution',
        shortCategory: 'Food & Beverage Dist',
        description: 'Wholesale food distribution, specialty beverage manufacturing, commercial bakery, and packaging.',
        metrics: {
            entryMultiple: { low: 2.8, median: 3.5, high: 4.6 },
            grossMargin: { low: 0.18, median: 0.26, high: 0.36 },
            ebitdaMargin: { low: 0.06, median: 0.09, high: 0.15 },
            revenueGrowth: { low: 0.02, median: 0.05, high: 0.10 },
            paybackYears: { low: 3.0, median: 4.6, high: 7.0 },
            dscr: { low: 1.15, median: 1.45, high: 2.2 },
        },
        aliases: ['food', 'beverage', 'distributor', 'distribution', 'bakery', 'wholesale food', 'specialty food', 'ingredients'],
    },
    construction_general: {
        key: 'construction_general',
        displayName: 'Specialty Trade Contractors & Construction',
        shortCategory: 'Specialty Trades',
        description: 'Commercial roofing, concrete, glass/glazing, earthwork, structural steel, and specialty subcontracting.',
        metrics: {
            entryMultiple: { low: 2.6, median: 3.4, high: 4.4 },
            grossMargin: { low: 0.20, median: 0.28, high: 0.38 },
            ebitdaMargin: { low: 0.07, median: 0.10, high: 0.16 },
            revenueGrowth: { low: 0.02, median: 0.06, high: 0.12 },
            paybackYears: { low: 2.8, median: 4.4, high: 6.8 },
            dscr: { low: 1.15, median: 1.45, high: 2.2 },
        },
        aliases: ['construction', 'contractor', 'roofing', 'concrete', 'subcontractor', 'general contractor', 'steel', 'paving', 'earthwork'],
    },
    generic_smb: {
        key: 'generic_smb',
        displayName: 'General SMB / All Lower-Middle-Market',
        shortCategory: 'General SMB',
        description: 'Cross-industry baseline for US small and medium business acquisitions ($1M–$50M EV).',
        metrics: {
            entryMultiple: { low: 2.5, median: 3.5, high: 5.0 },
            grossMargin: { low: 0.30, median: 0.42, high: 0.55 },
            ebitdaMargin: { low: 0.10, median: 0.20, high: 0.30 },
            revenueGrowth: { low: 0.02, median: 0.08, high: 0.15 },
            paybackYears: { low: 3.0, median: 5.0, high: 8.0 },
            dscr: { low: 1.1, median: 1.5, high: 2.5 },
        },
        aliases: ['general', 'smb', 'other', 'default', 'diversified'],
    },
}

export const SECTOR_LIST = Object.values(SECTOR_BENCHMARKS)

/**
 * Auto-detects the sector profile key from industry text, CIM notes, or deal descriptions.
 */
export function detectSector(input?: string | null): string {
    if (!input || !input.trim()) return 'generic_smb'
    const lower = input.toLowerCase()

    for (const sector of SECTOR_LIST) {
        if (sector.key === 'generic_smb') continue
        for (const alias of sector.aliases) {
            if (lower.includes(alias)) {
                return sector.key
            }
        }
    }

    return 'generic_smb'
}

/**
 * Retrieves the sector benchmark profile by key with safe fallback to generic SMB.
 */
export function getSectorProfile(sectorKey?: string | null): SectorBenchmarkProfile {
    if (sectorKey && SECTOR_BENCHMARKS[sectorKey]) {
        return SECTOR_BENCHMARKS[sectorKey]
    }
    return SECTOR_BENCHMARKS.generic_smb
}
