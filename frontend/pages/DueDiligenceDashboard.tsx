import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    Activity,
    AlertCircle,
    Clock,
    FileDown,
    Globe,
    HelpCircle,
    Info,
    Key,
    Keyboard,
    Loader2,
    Play,
    RotateCcw,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    X,
} from 'lucide-react'

import { ApiKeyModal, getEffectiveModelPipeline } from '../components/ApiKeyModal'
import { ExportDiligenceModal } from '../components/ExportDiligenceModal'
import { ReportIssueModal } from '../components/ReportIssueModal'
import { ProjectsSidePanel } from '../components/ProjectsSidePanel'
import DealHealthKPIs from '../components/DealHealthKPIs'
import ScrollDownPrompt from '../components/ScrollDownPrompt'
import RightSideQuickActions from '../components/RightSideQuickActions'
import DealEmailDraftCard from '../components/DealEmailDraftCard'
import { lazyWithRetry } from '../utils/lazyWithRetry'
const CommandPalette = lazyWithRetry(() => import('../components/CommandPalette'))
const SystemArchitectureCard = lazyWithRetry(() => import('../components/SystemArchitectureCard'))
import LoginButton, { getStoredAuth, isDataIsolationEnabled, DATA_ISOLATION_EVENT } from '../components/AuthGate'
import { uploadDocumentToSupabaseStorage } from '../services/supabaseStorage'
import { DataIsolationBanner } from '../components/dashboard/DataIsolationBanner'
import { buildMarkdownReport, buildJsonExport, downloadFile } from '../components/ExportDealButton'
import KeyboardShortcutsDialog from '../components/KeyboardShortcutsDialog'
import { type Notification } from '../components/NotificationCenter'
import { BatchProcessingSidePanel } from '../components/BatchProcessingSidePanel'
import EvidenceDrawer from '../components/EvidenceDrawer'
import DashboardFaqSidebar from '../components/DashboardFaqSidebar'
import SupademoModal, { type DemoVariantId } from '../components/SupademoModal'
import { WorkspaceDemoGalleryBar } from '../components/WorkspaceDemoGalleryBar'
import { useNativeWalkthrough } from '../components/walkthrough/useNativeWalkthrough'
import { WalkthroughLauncherModal } from '../components/walkthrough/WalkthroughLauncherModal'
import { NativeWalkthroughOverlay } from '../components/walkthrough/NativeWalkthroughOverlay'
import { WalkthroughNudgeBeacon } from '../components/walkthrough/WalkthroughNudgeBeacon'
import { useUserEngagement } from '../hooks/useUserEngagement'
import WorkspaceTabTutorialBanner from '../components/walkthrough/WorkspaceTabTutorialBanner'
import { OverviewWorkspaceView } from '../components/views/OverviewWorkspaceView'
import { DiligenceWorkspaceView } from '../components/views/DiligenceWorkspaceView'
import { ReturnsWorkspaceView } from '../components/views/ReturnsWorkspaceView'
import { ValuationWorkspaceView } from '../components/views/ValuationWorkspaceView'
import { GrowthWorkspaceView } from '../components/views/GrowthWorkspaceView'
import { StructureWorkspaceView } from '../components/views/StructureWorkspaceView'
import { NegotiationWorkspaceView } from '../components/views/NegotiationWorkspaceView'
import { AnalysisWorkspaceView } from '../components/views/AnalysisWorkspaceView'
import { DiagnosticsWorkspaceView } from '../components/views/DiagnosticsWorkspaceView'
import { DocumentsWorkspaceView } from '../components/views/DocumentsWorkspaceView'
import { WorkspaceHeader } from '../components/views/WorkspaceHeader'
import { AccountWorkspaceView } from '../components/views/AccountWorkspaceView'
import { useDealWorkspaceState, type WorkspaceTab } from '../hooks/useDealWorkspaceState'
import { useSupabaseRealtimeDiligence } from '../hooks/backend/useSupabaseRealtimeDiligence'
import { parseUrlDeepLinkState, matchProjectFromQuery, syncBrowserUrl } from '../utils/deepLinking'
import DealWorkspaceNav from '../components/DealWorkspaceNav'
import TabSidebarTOC, { TabTopNavTOC } from '../components/TabSidebarTOC'
import SectionHeader from '../components/SectionHeader'

const ProjectIntakeCard = lazyWithRetry(() => import('../components/ProjectIntakeCard'))
const ProjectSynthesisCard = lazyWithRetry(() => import('../components/ProjectSynthesisCard'))
import ProjectComparisonCard from '../components/ProjectComparisonCard'
import ManagementQuestionTracker from '../components/ManagementQuestionTracker'
const SubmissionHistoryCard = lazyWithRetry(() => import('../components/SubmissionHistoryCard'))
const DealChatPanel = lazyWithRetry(() => import('../components/DealChatPanel'))
const WorkflowErrorLogCard = lazyWithRetry(() => import('../components/WorkflowErrorLogCard'))
const EvalDashboardTab = lazyWithRetry(() => import('../components/EvalDashboardTab'))
const SpendingAnalyticsTab = lazyWithRetry(() => import('../components/SpendingAnalyticsTab'))
const TechnicalFaqWorkspaceTab = lazyWithRetry(() => import('../components/TechnicalFaqWorkspaceTab'))
const KeyboardShortcutsWorkspaceView = lazyWithRetry(() => import('../components/views/KeyboardShortcutsWorkspaceView'))
const ReportIssueWorkspaceView = lazyWithRetry(() => import('../components/views/ReportIssueWorkspaceView'))
import LatestSubmissionSection from '../components/dashboard/LatestSubmissionSection'
import { BatchProgressCard } from '../components/dashboard/BatchProgressCard'
import LegacyDiligenceBackupCard from '../components/dashboard/LegacyDiligenceBackupCard'

import {
    blankHistoryRow,
    exampleProjectSyntheses,
    exampleSubmissionHistoryRows,
    type DealModel,
    type ProjectSynthesisItem,
    useGetDiligenceData,
    useGetDealModels,
    useGetProjectSynthesis,
    useGetWorkflowErrors,
    useGetWatchdogEvents,
    useGetSubmissionHistory,
    useGetEvalRuns,
    useSubmitDealPacket,
    useSaveDealModel,
    useUpdateSubmissionConsideration,
} from '../hooks/backend/diligence'
import { Button } from '../lib/shadcn/button'
import { getStoredTheme, setStoredTheme } from '../lib/darkMode'
import { getDataSource, setDataSource } from '../lib/dataSource'
import { supabaseAuthClient } from '../services/supabaseAuth'
import {
    buildReturnsDisplayModel,
    createUnusedProjectId,
    formatElapsedDuration,
    hydrateModelFactsFromDocuments,
    isDuplicateProjectDocument,
    PENDING_EXAMPLE_MODE_SUBMISSION_KEY,
    withDerivedCapitalStack,
    type PendingExampleModeSubmission,
    type SubmissionBatch,
    type SubmitEnvironment,
} from '../utils/diligenceDashboardUtils'
import { fallbackDiligenceFindings } from '../utils/diligence'
import {
    createProjectSummaries,
    getProjectKey,
    isRowMatchingProject,
    isSystemTestProbeFile,
} from '../utils/projectWorkspace'
import { sumMeasuredCost } from '../utils/costModel'
import { isActiveSubmissionStatus, type SubmissionHistoryItem } from '../utils/submissionHistory'
import { isOwnedByUser, claimProject, getProjectOwner } from '../utils/projectOwnership'
import {
    playCompletionSound,
    playErrorSound,
    triggerFailureAlert,
} from '../utils/audioAlert'
import { computeImpactMetrics } from '../utils/impactMetrics'
import { getAiSubmissionViewModel } from '../utils/aiSubmissionData'
import { base64ToFile, readFileAsBase64 } from '../utils/fileEncoding'
import type { ManualDealFormData } from '../utils/manualDealIntake'

const SHOW_LEGACY_DILIGENCE_BACKUP = false

const DEMO_FALLBACK_DOCS: SubmissionHistoryItem[] = Object.freeze([
    {
        ...blankHistoryRow(),
        id: 1,
        requestID: 'apex-doc-001',
        dealName: 'Apex Industrial Technologies',
        companyName: 'Apex Industrial Technologies LLC',
        workstream: 'Financial Diligence',
        submissionNotes: '3-Year historical audited income statements and P&L bridge.',
        analystName: 'MergeWorks Diligence Team',
        analystEmail: 'team@mergeworks.com',
        projectId: 'apex-industrial-tech',
        projectStage: 'Post-LOI',
        documentType: 'Financial statements',
        detectedDocumentType: 'P&L / income statement',
        fileName: 'Apex-P&L-3-Year-Historical.pdf',
        fileSize: 420000,
        fileType: 'application/pdf',
        triggerTimestamp: new Date().toISOString(),
        status: 'completed',
        environment: 'production',
        receivedAt: new Date().toISOString(),
        processingStartedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        riskLevel: 'Low',
        category: 'Manufacturing & Industrial',
        trafficLight: 'Green',
        revenueExtracted: '$15,800,000 USD',
        ebitdaExtracted: '$3,200,000 USD',
        extractedJson: JSON.stringify({
            revenue: { value: 15_800_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Document Extracted', citations: [{ source_file: 'Apex-P&L-3-Year-Historical.pdf', row_or_cell: 'Page 3, Line 12' }] },
            ebitda_sde: { value: 3_200_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Document Extracted', citations: [{ source_file: 'Apex-P&L-3-Year-Historical.pdf', row_or_cell: 'Page 3, Line 28' }] },
            gross_margin: { value: 0.468, status: 'confirmed' }
        }),
        aiSummary: '3-year historical P&L for Apex Industrial Technologies. Revenue grew from $12.4M (FY21) to $15.8M (FY23). Verified 20.3% EBITDA margin with 98%+ OCR confidence.',
        aiConfidence: '98',
        aiGreenFlags: JSON.stringify(['Gross margins consistently above 45% across all 3 years', 'Clean revenue growth of 12.8% CAGR from FY21 to FY23']),
        aiYellowFlags: JSON.stringify(['$450,000 owner consulting fee classified as discretionary add-back']),
        valuationLowerBound: '$10.80M',
        valuationBaseEstimate: '$13.50M',
        valuationUpperBound: '$15.20M',
        valuationCurrency: 'USD',
        investmentIsFavorable: true,
    },
    {
        ...blankHistoryRow(),
        id: 2,
        requestID: 'apex-doc-002',
        dealName: 'Apex Industrial Technologies',
        companyName: 'Apex Industrial Technologies LLC',
        workstream: 'Balance Sheet & Debt Diligence',
        submissionNotes: 'Multi-tab financial model and balance sheet debt schedules.',
        analystName: 'MergeWorks Diligence Team',
        analystEmail: 'team@mergeworks.com',
        projectId: 'apex-industrial-tech',
        projectStage: 'Post-LOI',
        documentType: 'Balance sheet & P&L',
        detectedDocumentType: 'Balance sheet & P&L',
        fileName: 'Apex-Financials-FY23.xlsx',
        fileSize: 680000,
        fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        triggerTimestamp: new Date().toISOString(),
        status: 'completed',
        environment: 'production',
        receivedAt: new Date().toISOString(),
        processingStartedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        riskLevel: 'Medium',
        category: 'Manufacturing & Industrial',
        trafficLight: 'Yellow',
        revenueExtracted: '$15,800,000 USD',
        ebitdaExtracted: '$3,200,000 USD',
        extractedJson: JSON.stringify({
            debt: { value: 13_200_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Document Extracted', citations: [{ source_file: 'Apex-Financials-FY23.xlsx', row_or_cell: 'Tab "Balance Sheet", Cell E18' }] },
            total_assets: { value: 24_500_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Document Extracted', citations: [{ source_file: 'Apex-Financials-FY23.xlsx', row_or_cell: 'Tab "Balance Sheet", Cell E32' }] },
            total_liabilities: { value: 15_200_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Document Extracted', citations: [{ source_file: 'Apex-Financials-FY23.xlsx', row_or_cell: 'Tab "Balance Sheet", Cell E34' }] }
        }),
        aiSummary: 'Balance sheet model and debt amortization schedule. $13.2M senior debt verified with strong 2.85x DSCR.',
        aiConfidence: '97',
        aiGreenFlags: JSON.stringify(['Debt service coverage ratio (DSCR) of 2.85x provides comfortable liquidity buffer']),
        aiYellowFlags: JSON.stringify(['Top customer represents 38.4% of total FY23 revenue']),
        valuationLowerBound: '$10.80M',
        valuationBaseEstimate: '$13.50M',
        valuationUpperBound: '$15.20M',
        valuationCurrency: 'USD',
        investmentIsFavorable: true,
    },
    {
        ...blankHistoryRow(),
        id: 3,
        requestID: 'apex-doc-003',
        dealName: 'Apex Industrial Technologies',
        companyName: 'Apex Industrial Technologies LLC',
        workstream: 'Tax & Compliance Diligence',
        submissionNotes: 'IRS Form 1120-S official corporate tax return filing for FY23.',
        analystName: 'MergeWorks Diligence Team',
        analystEmail: 'team@mergeworks.com',
        projectId: 'apex-industrial-tech',
        projectStage: 'Post-LOI',
        documentType: 'Tax return (Form 1120-S)',
        detectedDocumentType: 'Tax return (Form 1120-S)',
        fileName: 'Apex-2023-Tax-Return-Form-1120S.pdf',
        fileSize: 512000,
        fileType: 'application/pdf',
        triggerTimestamp: new Date().toISOString(),
        status: 'completed',
        environment: 'production',
        receivedAt: new Date().toISOString(),
        processingStartedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        riskLevel: 'High',
        category: 'Manufacturing & Industrial',
        trafficLight: 'Red',
        revenueExtracted: '$14,210,000 USD',
        ebitdaExtracted: '$2,850,000 USD',
        extractedJson: JSON.stringify({
            revenue: { value: 14_210_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'IRS Tax Return Form 1120-S', citations: [{ source_file: 'Apex-2023-Tax-Return-Form-1120S.pdf', row_or_cell: 'Page 4, Line 1a' }] },
            ebitda_sde: { value: 2_850_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'IRS Tax Return Form 1120-S', citations: [{ source_file: 'Apex-2023-Tax-Return-Form-1120S.pdf', row_or_cell: 'Page 4, Line 21' }] }
        }),
        aiSummary: 'IRS Form 1120-S tax return. Line 1a gross receipts show $14.21M vs $15.80M CIM figure ($1.59M variance flagged for escrow negotiation).',
        aiConfidence: '99',
        aiRedFlags: JSON.stringify(['$1.59M gross receipts variance between IRS Form 1120-S Line 1a and CIM marketing deck']),
        aiGreenFlags: JSON.stringify(['Zero outstanding federal tax liens, penalties, or audit actions']),
        valuationLowerBound: '$10.80M',
        valuationBaseEstimate: '$13.50M',
        valuationUpperBound: '$15.20M',
        valuationCurrency: 'USD',
        investmentIsFavorable: true,
    },
    {
        ...blankHistoryRow(),
        id: 4,
        requestID: 'apex-doc-004',
        dealName: 'Apex Industrial Technologies',
        companyName: 'Apex Industrial Technologies LLC',
        workstream: 'Legal & LOI Diligence',
        submissionNotes: 'Fully executed Letter of Intent with acquisition terms and covenants.',
        analystName: 'MergeWorks Diligence Team',
        analystEmail: 'team@mergeworks.com',
        projectId: 'apex-industrial-tech',
        projectStage: 'Post-LOI',
        documentType: 'Legal & LOI',
        detectedDocumentType: 'Legal & LOI',
        fileName: 'Executed-LOI-Apex-LLC.docx',
        fileSize: 285000,
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        triggerTimestamp: new Date().toISOString(),
        status: 'completed',
        environment: 'production',
        receivedAt: new Date().toISOString(),
        processingStartedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        riskLevel: 'Low',
        category: 'Manufacturing & Industrial',
        trafficLight: 'Green',
        revenueExtracted: '$15,800,000 USD',
        ebitdaExtracted: '$3,200,000 USD',
        extractedJson: JSON.stringify({
            askingPrice: 12_500_000,
            escrowAmount: 1_500_000,
            exclusivityDays: 60
        }),
        aiSummary: 'Executed LOI specifying $12.5M enterprise purchase price, 60-day exclusivity, and $1.5M escrow requirement.',
        aiConfidence: '96',
        aiGreenFlags: JSON.stringify(['60-day binding exclusivity period confirmed', '$1.5M escrow indemnity mechanism agreed in principle']),
        valuationLowerBound: '$10.80M',
        valuationBaseEstimate: '$13.50M',
        valuationUpperBound: '$15.20M',
        valuationCurrency: 'USD',
        investmentIsFavorable: true,
    },
    {
        ...blankHistoryRow(),
        id: 5,
        requestID: 'cascadia-doc-001',
        dealName: 'Cascadia Climate Services',
        companyName: 'Cascadia Climate Services, Inc.',
        workstream: 'Financial Diligence',
        submissionNotes: 'Historical 3-year financial statements and CIM teaser overview.',
        analystName: 'MergeWorks Diligence Team',
        analystEmail: 'team@mergeworks.com',
        projectId: 'cascadia-climate-services',
        projectStage: 'Pre-LOI',
        documentType: 'Financial statements',
        detectedDocumentType: 'P&L / income statement',
        fileName: 'Cascadia_Climate_Services_CIM_FY23.pdf',
        fileSize: 395000,
        fileType: 'application/pdf',
        triggerTimestamp: new Date().toISOString(),
        status: 'completed',
        environment: 'production',
        receivedAt: new Date().toISOString(),
        processingStartedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        riskLevel: 'Medium',
        category: 'Commercial HVAC & Energy Services',
        trafficLight: 'Yellow',
        revenueExtracted: '$8,450,000 USD',
        ebitdaExtracted: '$1,590,000 USD',
        extractedJson: JSON.stringify({
            revenue: { value: 8_450_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Document Extracted' },
            ebitda_sde: { value: 1_590_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Document Extracted' }
        }),
        aiSummary: '3-year P&L for Cascadia Climate Services. Commercial HVAC service provider with 68% recurring maintenance agreements.',
        aiConfidence: '97',
        aiGreenFlags: JSON.stringify(['High recurring service contract base (68% ARR) with 94% retention']),
        aiYellowFlags: JSON.stringify(['Seller add-back bridge of $330,000 requires verification of non-recurring vehicle leases']),
        valuationLowerBound: '$6.20M',
        valuationBaseEstimate: '$7.80M',
        valuationUpperBound: '$8.50M',
        valuationCurrency: 'USD',
        investmentIsFavorable: true,
    },
    {
        ...blankHistoryRow(),
        id: 6,
        requestID: 'cascadia-doc-002',
        dealName: 'Cascadia Climate Services',
        companyName: 'Cascadia Climate Services, Inc.',
        workstream: 'Tax & Compliance Diligence',
        submissionNotes: 'IRS Form 1120 corporate income tax return simulation.',
        analystName: 'MergeWorks Diligence Team',
        analystEmail: 'team@mergeworks.com',
        projectId: 'cascadia-climate-services',
        projectStage: 'Pre-LOI',
        documentType: 'Tax return (Form 1120-S)',
        detectedDocumentType: 'Tax return (Form 1120-S)',
        fileName: 'Cascadia_Tax_Return_1120S_2023.pdf',
        fileSize: 480000,
        fileType: 'application/pdf',
        triggerTimestamp: new Date().toISOString(),
        status: 'completed',
        environment: 'production',
        receivedAt: new Date().toISOString(),
        processingStartedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        riskLevel: 'Medium',
        category: 'Commercial HVAC & Energy Services',
        trafficLight: 'Yellow',
        revenueExtracted: '$8,210,000 USD',
        ebitdaExtracted: '$1,260,400 USD',
        extractedJson: JSON.stringify({
            revenue: { value: 8_210_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'IRS Tax Return Form 1120-S' },
            ebitda_sde: { value: 1_260_400, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'IRS Tax Return Form 1120-S' }
        }),
        aiSummary: 'IRS Form 1120-S corporate tax return. Adjusted EBITDA of $1.26M vs CIM claimed $1.59M ($330k variance).',
        aiConfidence: '98',
        aiRedFlags: JSON.stringify(['$329,600 EBITDA variance between tax filings and seller marketing deck']),
        aiGreenFlags: JSON.stringify(['Clean tax compliance record with zero open state or federal audit notices']),
        valuationLowerBound: '$6.20M',
        valuationBaseEstimate: '$7.80M',
        valuationUpperBound: '$8.50M',
        valuationCurrency: 'USD',
        investmentIsFavorable: true,
    }
]) as unknown as SubmissionHistoryItem[]

const DEMO_FALLBACK_SYNTHESIS: ProjectSynthesisItem = Object.freeze({
    id: 1,
    projectId: 'apex-industrial-tech',
    projectName: 'Apex Industrial Technologies',
    companyName: 'Apex Industrial Technologies LLC',
    projectStatus: 'synthesized',
    documentsReceivedCount: 4,
    documentsCompletedCount: 4,
    missingDocuments: [],
    crossDocumentConflicts: [
        'CIM reported FY23 Revenue of $15.80M conflicts with IRS Form 1120-S Line 1a Gross Receipts of $14.21M ($1.59M discrepancy).',
        'P&L reports $450k consulting add-back while general ledger schedule classifies it under recurring SG&A expenses.'
    ],
    openQuestions: [
        'Why does IRS Form 1120-S report $14.21M vs CIM $15.80M for FY23?',
        'What is the renewal timeline for the top industrial account (38.4% revenue concentration)?',
        'Will the founding owner sign a 2-year non-compete and consulting transition agreement?'
    ],
    negotiationLevers: [
        'Use $1.59M tax discrepancy to negotiate a $1.2M seller note escrow holdback.',
        'Condition closing on 3-year contract renewal for top customer (38.4% revenue).',
        'Require seller indemnity for pre-closing environmental and facility obligations.'
    ],
    keyTakeaways: [
        'Comprehensive 4-document synthesis for Apex Industrial Technologies LLC ($12.5M asking price).',
        'Verified $15.8M TTM Revenue and $3.2M normalized EBITDA across 3-year P&L, balance sheet, tax returns, and LOI.',
        'Discrepancy identified between CIM reported revenue ($15.8M) and IRS Form 1120-S tax filing ($14.21M).',
        'High-margin precision manufacturing contracts with 91% annual customer retention and 20.3% EBITDA margin.'
    ],
    redFlags: [
        'Gross Revenue Discrepancy: CIM reports $15.8M TTM revenue vs IRS Form 1120-S reporting $14.21M gross receipts ($1.59M difference requires working capital escrow adjustment).',
        'Key Person Dependency: Senior operations director holds all vendor manufacturing relationships with no non-compete agreement on file.'
    ],
    yellowFlags: [
        'Owner Add-Back Scrutiny: $450k management consulting fee paid to related entity; confirmed non-recurring but requires formal release.',
        'Customer Concentration: Top industrial customer represents 38.4% of FY23 revenue; renewal under commercial review.',
        'Environmental Warranty: Pre-2018 manufacturing facility requires Phase I Environmental baseline update prior to closing.'
    ],
    greenFlags: [
        'Verified Financials: 3-year P&L statements mathematically reconciled with 98%+ OCR confidence.',
        'Strong Balance Sheet: $13.2M debt is fully serviceable with 2.85x DSCR under standard SBA 7(a) / senior debt terms.',
        'Proven Pricing Power: Average contract gross margin expanded from 42.1% in FY21 to 46.8% in FY23.'
    ],
    citations: [
        'Apex-P&L-3-Year-Historical.pdf',
        'Apex-Financials-FY23.xlsx',
        'Apex-2023-Tax-Return-Form-1120S.pdf',
        'Executed-LOI-Apex-LLC.docx'
    ],
    citationDetails: [
        { sourceFile: 'Apex-2023-Tax-Return-Form-1120S.pdf', sourceLocation: 'Page 4, Line 1a', excerpt: 'Reported Gross Receipts $14,210,000 vs CIM reported Revenue $15,800,000.', period: 'FY23', currency: 'USD', confidence: 0.99, status: 'critical_conflict' },
        { sourceFile: 'Apex-Financials-FY23.xlsx', sourceLocation: 'Tab "P&L Summary", Cell G42', excerpt: 'Management consulting fee of $450,000 paid to related entity.', period: 'FY23', currency: 'USD', confidence: 0.98, status: 'confirmed' }
    ],
    structuredFindings: {
        keyTakeaways: [
            {
                text: 'Comprehensive 4-document synthesis for Apex Industrial Technologies LLC ($12.5M asking price).',
                confidence: 0.98,
                status: 'confirmed',
                citations: [
                    { sourceFile: 'Apex-P&L-3-Year-Historical.pdf', sourceLocation: 'Page 1, Executive Summary', excerpt: 'Apex Industrial Technologies LLC 3-Year Historical Financial Summary.', period: 'FY21-FY23', currency: 'USD', confidence: 0.98, status: 'confirmed' }
                ]
            },
            {
                text: 'Verified $15.8M TTM Revenue and $3.2M normalized EBITDA across 3-year P&L, balance sheet, tax returns, and LOI.',
                confidence: 0.98,
                status: 'confirmed',
                citations: [
                    { sourceFile: 'Apex-Financials-FY23.xlsx', sourceLocation: 'Tab "P&L Summary", Row 18', excerpt: 'TTM Normalized EBITDA: $3,204,500 on Gross Revenue of $15,800,000.', period: 'FY23', currency: 'USD', confidence: 0.98, status: 'confirmed' }
                ]
            }
        ],
        redFlags: [
            {
                text: 'Gross Revenue Discrepancy: CIM reports $15.8M TTM revenue vs IRS Form 1120-S reporting $14.21M gross receipts ($1.59M difference requires working capital escrow adjustment).',
                confidence: 0.99,
                status: 'critical_conflict',
                citations: [
                    { sourceFile: 'Apex-2023-Tax-Return-Form-1120S.pdf', sourceLocation: 'Page 4, Line 1a', excerpt: 'Reported Gross Receipts $14,210,000 vs CIM reported Revenue $15,800,000 ($1.59M discrepancy).', period: 'FY23', currency: 'USD', confidence: 0.99, status: 'critical_conflict' }
                ]
            },
            {
                text: 'Key Person Dependency: Senior operations director holds all vendor manufacturing relationships with no non-compete agreement on file.',
                confidence: 0.95,
                status: 'investigate',
                citations: [
                    { sourceFile: 'Executed-LOI-Apex-LLC.docx', sourceLocation: 'Section 8.2', excerpt: 'Key personnel transition clauses are subject to definitive employment agreement execution.', period: 'Closing', currency: 'USD', confidence: 0.95, status: 'investigate' }
                ]
            }
        ],
        yellowFlags: [
            {
                text: 'Owner Add-Back Scrutiny: $450k management consulting fee paid to related entity; confirmed non-recurring but requires formal release.',
                confidence: 0.98,
                status: 'investigate',
                citations: [
                    { sourceFile: 'Apex-Financials-FY23.xlsx', sourceLocation: 'Tab "P&L Summary", Cell G42', excerpt: 'Management consulting fee of $450,000 paid to related entity.', period: 'FY23', currency: 'USD', confidence: 0.98, status: 'confirmed' }
                ]
            },
            {
                text: 'Customer Concentration: Top industrial customer represents 38.4% of FY23 revenue; renewal under commercial review.',
                confidence: 0.96,
                status: 'investigate',
                citations: [
                    { sourceFile: 'Apex-P&L-3-Year-Historical.pdf', sourceLocation: 'Page 6, Revenue by Customer', excerpt: 'Account #1042 (Tier 1 Automotive OEM) represents 38.4% ($6.07M) of FY23 gross shipments.', period: 'FY23', currency: 'USD', confidence: 0.96, status: 'investigate' }
                ]
            }
        ],
        greenFlags: [
            {
                text: 'Verified Financials: 3-year P&L statements mathematically reconciled with 98%+ OCR confidence.',
                confidence: 0.99,
                status: 'confirmed',
                citations: [
                    { sourceFile: 'Apex-P&L-3-Year-Historical.pdf', sourceLocation: 'Page 2, Line 14', excerpt: 'Historical Revenue CAGR: 12.8% across FY21 ($12.4M), FY22 ($14.1M), and FY23 ($15.8M).', period: 'FY21-FY23', currency: 'USD', confidence: 0.99, status: 'confirmed' }
                ]
            },
            {
                text: 'Strong Balance Sheet: $13.2M debt is fully serviceable with 2.85x DSCR under standard SBA 7(a) / senior debt terms.',
                confidence: 0.97,
                status: 'confirmed',
                citations: [
                    { sourceFile: 'Apex-Financials-FY23.xlsx', sourceLocation: 'Tab "Balance Sheet", Row 34', excerpt: 'Total Long Term Debt: $13,200,000. Annual Debt Service: $1,120,000. DSCR: 2.85x.', period: 'FY23', currency: 'USD', confidence: 0.97, status: 'confirmed' }
                ]
            }
        ],
        crossDocumentConflicts: [
            {
                text: 'CIM reported FY23 Revenue of $15.80M conflicts with IRS Form 1120-S Line 1a Gross Receipts of $14.21M ($1.59M discrepancy).',
                confidence: 0.99,
                status: 'critical_conflict',
                citations: [
                    { sourceFile: 'Apex-2023-Tax-Return-Form-1120S.pdf', sourceLocation: 'Page 4, Line 1a', excerpt: 'IRS Form 1120-S reported gross receipts: $14,210,000.', period: 'FY23', currency: 'USD', confidence: 0.99, status: 'critical_conflict' }
                ]
            }
        ],
        openQuestions: [],
        negotiationLevers: [
            {
                text: 'Use $1.59M tax discrepancy to negotiate a $1.2M seller note escrow holdback.',
                confidence: 0.95,
                status: 'actionable',
                citations: [
                    { sourceFile: 'Apex-2023-Tax-Return-Form-1120S.pdf', sourceLocation: 'Page 4, Line 1a', excerpt: '$1.59M tax filing discrepancy.', period: 'FY23', currency: 'USD', confidence: 0.95, status: 'actionable' }
                ]
            }
        ],
        missingDocuments: []
    },
    finalRiskLevel: 'Medium',
    finalTrafficLight: 'Yellow',
    finalRecommendation: 'PROCEED WITH CONDITIONS — $1.2M Seller Note Holdback for Tax Discrepancy',
    finalJudgmentSummary: 'Apex Industrial Technologies LLC ($12.5M asking price) exhibits robust $15.8M revenue and $3.2M EBITDA (20.3% margin). However, $1.59M revenue discrepancy on IRS Form 1120-S and 38.4% customer concentration require a $1.2M seller note escrow holdback and customer contract retention covenant.',
    finalJudgmentJson: '',
    aiErrorMessage: '',
    aiConfidence: '0.96',
    valuationConfidence: '0.94',
    valuationLowerBound: '$10.80M',
    valuationBaseEstimate: '$13.50M',
    valuationUpperBound: '$15.20M',
    valuationCurrency: 'USD',
    projectProcessedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    letterOfIntentPresent: true,
}) as unknown as ProjectSynthesisItem

const DEMO_FALLBACK_SYNTHESIS_CASCADIA: ProjectSynthesisItem = Object.freeze({
    id: 2,
    projectId: 'cascadia-climate-services',
    projectName: 'Cascadia Climate Services',
    companyName: 'Cascadia Climate Services, Inc.',
    projectStatus: 'synthesized',
    documentsReceivedCount: 2,
    documentsCompletedCount: 2,
    missingDocuments: [],
    crossDocumentConflicts: [
        'CIM reported FY23 Adjusted EBITDA of $1.59M vs IRS Form 1120-S Line 21 net income of $1.26M ($330k variance).'
    ],
    openQuestions: [
        'Can seller document the non-recurring nature of $330,000 vehicle lease add-backs?',
        'What percentage of commercial maintenance contracts have automatic annual price escalators?'
    ],
    negotiationLevers: [
        'Utilize $330k EBITDA tax bridge variance to adjust purchase price multiple from 5.2x down to 4.7x.',
        'Structure $500k earnout contingent on 90%+ contract renewal rate over 24 months post-closing.'
    ],
    keyTakeaways: [
        'Commercial & residential HVAC services provider with strong 68% recurring service contract revenue.',
        'Verified $8.45M TTM Revenue and $1.59M reported EBITDA (18.8% margin).',
        'Tax filing reconciliation flags $330k discretionary add-back requiring seller bridge validation.'
    ],
    redFlags: [
        'Discretionary Add-Backs: $330k vehicle lease and personal expenses added to EBITDA without audited ledger receipts.'
    ],
    yellowFlags: [
        'Technician Turnover: 22% annual HVAC tech turnover in a tight labor market.'
    ],
    greenFlags: [
        'High Contract Retention: 94% annual customer contract renewal rate.',
        'Clean Tax Compliance: Zero state or federal tax liabilities or open audits.'
    ],
    citations: [
        'Cascadia_Climate_Services_CIM_FY23.pdf',
        'Cascadia_Tax_Return_1120S_2023.pdf'
    ],
    citationDetails: [
        { sourceFile: 'Cascadia_Tax_Return_1120S_2023.pdf', sourceLocation: 'Page 1, Line 21', excerpt: 'Net ordinary business income: $1,260,400.', period: 'FY23', currency: 'USD', confidence: 0.98, status: 'critical_conflict' }
    ],
    structuredFindings: {
        keyTakeaways: [
            {
                text: 'Commercial & residential HVAC services provider with strong 68% recurring service contract revenue.',
                confidence: 0.97,
                status: 'confirmed',
                citations: [
                    { sourceFile: 'Cascadia_Climate_Services_CIM_FY23.pdf', sourceLocation: 'Page 2', excerpt: 'Recurring service contract revenue represents 68% of total revenue.', period: 'FY23', currency: 'USD', confidence: 0.97, status: 'confirmed' }
                ]
            }
        ],
        redFlags: [
            {
                text: 'Discretionary Add-Backs: $330k vehicle lease and personal expenses added to EBITDA without audited ledger receipts.',
                confidence: 0.96,
                status: 'critical_conflict',
                citations: [
                    { sourceFile: 'Cascadia_Tax_Return_1120S_2023.pdf', sourceLocation: 'Page 1', excerpt: '$330k add-back variance against tax filing.', period: 'FY23', currency: 'USD', confidence: 0.96, status: 'critical_conflict' }
                ]
            }
        ],
        yellowFlags: [
            {
                text: 'Technician Turnover: 22% annual HVAC tech turnover in a tight labor market.',
                confidence: 0.94,
                status: 'investigate',
                citations: []
            }
        ],
        greenFlags: [
            {
                text: 'High Contract Retention: 94% annual customer contract renewal rate.',
                confidence: 0.98,
                status: 'confirmed',
                citations: []
            }
        ],
        missingDocuments: []
    },
    finalRiskLevel: 'Medium',
    finalTrafficLight: 'Yellow',
    finalRecommendation: 'PROCEED WITH CONDITIONS — $500k Earnout Structure for Add-Back Variance',
    finalJudgmentSummary: 'Cascadia Climate Services, Inc. ($7.8M valuation estimate) demonstrates strong recurring revenue (68%) and solid gross margins. $330k EBITDA tax bridge variance should be mitigated via a $500k performance earnout tied to verified cash flow.',
    finalJudgmentJson: '',
    aiErrorMessage: '',
    aiConfidence: '0.95',
    valuationConfidence: '0.93',
    valuationLowerBound: '$6.20M',
    valuationBaseEstimate: '$7.80M',
    valuationUpperBound: '$8.50M',
    valuationCurrency: 'USD',
    projectProcessedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    letterOfIntentPresent: false,
}) as unknown as ProjectSynthesisItem

const DEMO_FALLBACK_DEAL_MODEL: DealModel = Object.freeze({
    projectId: 'apex-industrial-tech',
    askingPrice: 12_500_000,
    purchasePrice: 12_500_000,
    debtAssumed: 13_200_000,
    cashAcquired: 1_800_000,
    workingCapitalRequirement: 1_500_000,
    transactionFees: 450_000,
    holdPeriodYears: 5,
    taxRate: 0.25,
    closingCosts: 350_000,
    maintenanceCapex: 400_000,
    exitMultiple: 4.8,
    exitCosts: 500_000,
    equityContributionPercent: 0.30,
    interestRate: 0.095,
    amortizationYears: 10,
    sellerNoteAmount: 1_200_000,
    bearRevenueGrowth: 0.02,
    baseRevenueGrowth: 0.07,
    bullRevenueGrowth: 0.14,
    bearEbitdaMargin: 0.16,
    baseEbitdaMargin: 0.203,
    bullEbitdaMargin: 0.24,
    bearExitMultiple: 3.8,
    baseExitMultiple: 4.8,
    bullExitMultiple: 6.0,
    revenueMultiple: 0.79,
    ebitdaMultiple: 3.91,
    assetHaircutPercent: 0.10,
    modelUpdatedAt: '',
    modelUpdatedBy: 'Apex Industrial Technologies Demo',
    documentedFactsStatus: 'confirmed',
    documentedFactsJson: JSON.stringify({
        revenue: { value: 15_800_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Document Extracted', citations: [{ source_file: 'Apex-P&L-3-Year-Historical.pdf', row_or_cell: 'Page 3, Line 12' }] },
        ebitda_sde: { value: 3_200_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Document Extracted', citations: [{ source_file: 'Apex-P&L-3-Year-Historical.pdf', row_or_cell: 'Page 3, Line 28' }] },
        debt: { value: 13_200_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Document Extracted', citations: [{ source_file: 'Apex-Financials-FY23.xlsx', row_or_cell: 'Tab "Balance Sheet", Cell E18' }] },
        total_assets: { value: 24_500_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Document Extracted', citations: [{ source_file: 'Apex-Financials-FY23.xlsx', row_or_cell: 'Tab "Balance Sheet", Cell E32' }] },
        total_liabilities: { value: 15_200_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Document Extracted', citations: [{ source_file: 'Apex-Financials-FY23.xlsx', row_or_cell: 'Tab "Balance Sheet", Cell E34' }] }
    }),
})

function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (predicate(arr[i])) return i
    }
    return -1
}

function parseDashboardMoneyInput(value: string | null | undefined): number | null {
    if (!value || !value.trim()) return null
    let str = value.trim().replace(/\b(?:usd|cad|eur|gbp|aud)\b/gi, '').trim()
    const normalized = str.replace(/[$,\s]/g, '')
    const multiplier = /b$/i.test(normalized) ? 1_000_000_000 : /m$/i.test(normalized) ? 1_000_000 : /k$/i.test(normalized) ? 1_000 : 1
    const parsed = Number(normalized.replace(/[kmb]$/i, ''))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed * multiplier : null
}

function deriveBatchProgress(rows: SubmissionHistoryItem[]) {
    const finishedCount = rows.filter(r => !isActiveSubmissionStatus(r.status)).length
    const processingCount = rows.filter(r => isActiveSubmissionStatus(r.status)).length
    const failedCount = rows.filter(r => ['failed', 'error', 'rejected'].includes(r.status.trim().toLowerCase())).length
    const completedCount = rows.filter(r => r.status.trim().toLowerCase() === 'completed').length
    return {
        expectedCount: rows.length,
        finishedCount,
        processingCount,
        failedCount,
        completedCount,
        stuckRows: [],
        errors: rows.filter(r => r.errorMessage).map(r => ({ fileName: r.fileName, errorMessage: r.errorMessage, requestID: r.requestID })),
        advisories: [],
    }
}

function deriveSynthesisProgress(status?: string, awaiting?: boolean) {
    if (awaiting) return { value: 65, stage: 'Consolidating project findings...' }
    const norm = (status || '').trim().toLowerCase()
    if (['synthesized', 'completed', 'success'].includes(norm)) return { value: 100, stage: 'Synthesis complete' }
    return { value: 0, stage: 'Awaiting documents' }
}

export default function DueDiligenceDashboard({ onReturnToLanding }: { onReturnToLanding?: () => void } = {}) {
    const {
        activeWorkspaceTab,
        setActiveWorkspaceTab,
        activeViewProjectId,
        setActiveViewProjectId,
        projectId,
        setProjectId,
        projectStage,
        setProjectStage,
        documentType,
        setDocumentType,
        selectedProjectKey,
        setSelectedProjectKey,
        isBatchDrawerOpen,
        setIsBatchDrawerOpen,
        isFaqSidebarOpen,
        setIsFaqSidebarOpen,
        isApiKeyModalOpen,
        setIsApiKeyModalOpen,
        isProjectsPanelOpen,
        setIsProjectsPanelOpen,
        isShortcutsOpen,
        setIsShortcutsOpen,
        commandPaletteOpen,
        setCommandPaletteOpen,
        submissionNotes,
        setSubmissionNotes,
        dealName,
        setDealName,
        askingPrice,
        setAskingPrice,
        activeEvidence,
        setActiveEvidence,
        isTocCollapsed,
        setIsTocCollapsed,
        tocWidth,
        setTocWidth,
        askingPriceByProject,
        setAskingPriceByProject,
        projectChecklistById,
        setProjectChecklistById,
    } = useDealWorkspaceState()

    const [isWalkthroughModalOpen, setIsWalkthroughModalOpen] = useState(false)
    const [isReportIssueOpen, setIsReportIssueOpen] = useState(false)
    const [selectedWalkthroughDemoId, setSelectedWalkthroughDemoId] = useState<DemoVariantId>('short-supademo')
    const [isLeftQuickDockVisible, setIsLeftQuickDockVisible] = useState(true)

    const walkthrough = useNativeWalkthrough({
        activeTab: activeWorkspaceTab,
        onTabChange: setActiveWorkspaceTab,
    })

    const {
        shouldShowNudge,
        nudgeReason,
        dismissNudge,
        snoozeNudge,
        markWalkthroughCompleted,
    } = useUserEngagement()

    const [simulatedWalkthroughBatch, setSimulatedWalkthroughBatch] = useState<{
        id: string
        expectedDocumentCount: number
        finishedCount: number
        processingCount?: number
        progressPercent?: number
        elapsedSeconds: number
        workerStatus?: string
    } | null>(null)

    // Auto-launch walkthrough if requested via URL hash or search params
    useEffect(() => {
        if (typeof window === 'undefined') return
        const hash = window.location.hash || ''
        const search = window.location.search || ''
        const fullQuery = `${hash}&${search}`
        if (fullQuery.includes('walkthrough=core') || fullQuery.includes('tour=core')) {
            walkthrough.startTour('core-fast')
        } else if (fullQuery.includes('walkthrough=deep') || fullQuery.includes('tour=deep')) {
            walkthrough.startTour('deep-dive')
        } else if (fullQuery.includes('walkthrough=quest') || fullQuery.includes('tour=quest')) {
            walkthrough.startTour('interactive-quest')
        }
    }, [])

    const { data: diligenceData, error } = useGetDiligenceData()
    const {
        data: submissionHistoryData,
        loading: submissionHistoryLoading,
        error: submissionHistoryError,
        trigger: triggerSubmissionHistory,
    } = useGetSubmissionHistory()
    const {
        data: submitResponse,
        loading: submitLoading,
        error: submitError,
        trigger: triggerSubmitDealPacket,
    } = useSubmitDealPacket()
    const {
        data: projectSynthesisData,
        loading: projectSynthesisLoading,
        error: projectSynthesisError,
        trigger: triggerProjectSynthesis,
    } = useGetProjectSynthesis()
    const { data: dealModelsData, trigger: triggerDealModels } = useGetDealModels()
    const { trigger: triggerSaveDealModel } = useSaveDealModel()
    const { data: workflowErrorData, loading: workflowErrorsLoading, error: workflowErrorsError, trigger: triggerWorkflowErrors } = useGetWorkflowErrors()
    const { data: watchdogEventsData, trigger: triggerWatchdogEvents } = useGetWatchdogEvents()
    const { data: evalRunsData, trigger: triggerEvalRuns } = useGetEvalRuns()
    const { trigger: triggerSubmissionConsideration } = useUpdateSubmissionConsideration()

    // Fetch initial backend data on mount
    useEffect(() => {
        void triggerSubmissionHistory({ environment: 'production' })
        void triggerProjectSynthesis({ environment: 'production' })
        void triggerDealModels()
        void triggerWorkflowErrors({ environment: 'production' })
        void triggerWatchdogEvents({ environment: 'production' })
        void triggerEvalRuns()
    }, [triggerSubmissionHistory, triggerProjectSynthesis, triggerDealModels, triggerWorkflowErrors, triggerWatchdogEvents, triggerEvalRuns])

    const diligenceFindings = useMemo(() => {
        if (Array.isArray(diligenceData) && diligenceData.length > 0) {
            return diligenceData
        }
        return fallbackDiligenceFindings
    }, [diligenceData])

    const liveSubmissionHistory = (Array.isArray(submissionHistoryData) ? submissionHistoryData : []) as SubmissionHistoryItem[]
    const liveProjectSynthesesData = (Array.isArray(projectSynthesisData) ? projectSynthesisData : []) as ProjectSynthesisItem[]
    const isExampleMode = getDataSource() === 'mock'


    const [manualSubmissions, setManualSubmissions] = useState<SubmissionHistoryItem[]>(() => {
        if (typeof window === 'undefined') return []
        try {
            const saved = localStorage.getItem('mergeworks_manual_submissions')
            return saved ? JSON.parse(saved) : []
        } catch {
            return []
        }
    })

    const [manualSyntheses, setManualSyntheses] = useState<ProjectSynthesisItem[]>(() => {
        if (typeof window === 'undefined') return []
        try {
            const saved = localStorage.getItem('mergeworks_manual_syntheses')
            return saved ? JSON.parse(saved) : []
        } catch {
            return []
        }
    })

    const rawSubmissionHistory = useMemo(() => {
        if (isExampleMode) return [...manualSubmissions, ...exampleSubmissionHistoryRows]
        const liveKeys = new Set(liveSubmissionHistory.map((r: any) => (r.projectId || r.dealName || '').toLowerCase()))
        const missingBenchmarkRows = exampleSubmissionHistoryRows.filter(
            (r: any) => !liveKeys.has((r.projectId || '').toLowerCase()) && !liveKeys.has((r.dealName || '').toLowerCase())
        )
        return [...manualSubmissions, ...liveSubmissionHistory, ...missingBenchmarkRows]
    }, [isExampleMode, liveSubmissionHistory, manualSubmissions])

    const rawProjectSyntheses = useMemo(() => {
        if (isExampleMode) return [...manualSyntheses, ...exampleProjectSyntheses]
        const liveKeys = new Set(liveProjectSynthesesData.map((s: any) => (s.projectId || '').toLowerCase().replace(/-+$/, '')))
        const missingBenchmarkRows = exampleProjectSyntheses.filter(
            (s: any) => !liveKeys.has((s.projectId || '').toLowerCase().replace(/-+$/, ''))
        )
        return [...manualSyntheses, ...liveProjectSynthesesData, ...missingBenchmarkRows]
    }, [isExampleMode, liveProjectSynthesesData, manualSyntheses])

    const [isolationModeEnabled, setIsolationModeEnabled] = useState(isDataIsolationEnabled)

    useEffect(() => {
        const handleIsolationChange = (e: Event) => {
            const customEvent = e as CustomEvent<{ enabled: boolean }>
            if (customEvent.detail && typeof customEvent.detail.enabled === 'boolean') {
                setIsolationModeEnabled(customEvent.detail.enabled)
            } else {
                setIsolationModeEnabled(isDataIsolationEnabled())
            }
        }
        window.addEventListener(DATA_ISOLATION_EVENT, handleIsolationChange)
        return () => window.removeEventListener(DATA_ISOLATION_EVENT, handleIsolationChange)
    }, [])

    const submissionHistory = useMemo(() => {
        const user = getStoredAuth()
        const base = (!isolationModeEnabled || (user && user.role === 'admin' && !isolationModeEnabled))
            ? rawSubmissionHistory
            : rawSubmissionHistory.filter((row: SubmissionHistoryItem) => {
                const pk = getProjectKey(row)
                if (user?.email) return isOwnedByUser(pk, user.email)
                const owner = getProjectOwner(pk)
                return !owner || owner === 'guest' || owner === 'localdev@mergeworks.io'
            })

        if (walkthrough.isActive || simulatedWalkthroughBatch) {
            const other = base.filter((r: any) => r.projectId !== 'apex-industrial-tech' && r.projectId !== 'cascadia-climate-services')
            return [...DEMO_FALLBACK_DOCS, ...other]
        }
        return base
    }, [rawSubmissionHistory, isolationModeEnabled, walkthrough.isActive, simulatedWalkthroughBatch])

    const visibleProjectSyntheses = useMemo(() => {
        const user = getStoredAuth()
        const base = (!isolationModeEnabled || (user && user.role === 'admin' && !isolationModeEnabled))
            ? rawProjectSyntheses
            : rawProjectSyntheses.filter((s: any) => {
                const pk = s.projectId || ''
                if (user?.email) return isOwnedByUser(pk, user.email)
                const owner = getProjectOwner(pk)
                return !owner || owner === 'guest' || owner === 'localdev@mergeworks.io'
            })

        if (walkthrough.isActive || simulatedWalkthroughBatch) {
            const other = base.filter((s: any) => s.projectId !== 'apex-industrial-tech' && s.projectId !== 'cascadia-climate-services')
            return [DEMO_FALLBACK_SYNTHESIS, DEMO_FALLBACK_SYNTHESIS_CASCADIA, ...other]
        }
        return base
    }, [rawProjectSyntheses, isolationModeEnabled, walkthrough.isActive, simulatedWalkthroughBatch])

    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [isSubmittingFile, setIsSubmittingFile] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [batchSubmissionMessage, setBatchSubmissionMessage] = useState('')
    const lastUploadAttemptAtRef = useRef(0)
    const [retryingRequestId, setRetryingRequestId] = useState<string | null>(null)
    const [isStoppingBatch, setIsStoppingBatch] = useState(false)
    const [isStoppingSynthesis, setIsStoppingSynthesis] = useState(false)
    const [activeSubmissionBatch, setActiveSubmissionBatch] = useState<SubmissionBatch | null>(() => {
        try {
            const stored = window.sessionStorage.getItem('mergeworks.activeSubmissionBatch')
            if (!stored) return null
            const parsed = JSON.parse(stored) as SubmissionBatch
            if (parsed?.id && (Date.now() - (parsed.startedAt || 0) > 3600000)) {
                window.sessionStorage.removeItem('mergeworks.activeSubmissionBatch')
                return null
            }
            return parsed
        } catch { return null }
    })

    // Warn user before reloading if an active file upload batch is in progress
    useEffect(() => {
        if (!isSubmittingFile) return

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault()
            e.returnValue = 'Documents are currently being uploaded and queued. If you reload or close the tab now, the batch upload will be interrupted.'
            return e.returnValue
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [isSubmittingFile])

    const simulatedBatchTimerRef = useRef<any>(null)

    const clearSimulatedBatchTimer = useCallback(() => {
        if (simulatedBatchTimerRef.current) {
            clearInterval(simulatedBatchTimerRef.current)
            simulatedBatchTimerRef.current = null
        }
    }, [])

    useEffect(() => {
        const handleWalkthroughAction = (e: Event) => {
            const customEvent = e as CustomEvent<{ stepId?: string; action?: { type: string; payload?: any } }>
            const action = customEvent.detail?.action
            if (!action) return

            if (action.type === 'stage_packet') {
                setDealName('Apex Industrial Technologies LLC')
                setAskingPrice('12500000')
                setProjectStage('qoe')
                try {
                    const sampleFiles = [
                        new File([new Uint8Array(1024 * 3400)], 'Apex_Industrial_FY23-FY25_Profit_and_Loss.pdf', { type: 'application/pdf' }),
                        new File([new Uint8Array(1024 * 1800)], 'Apex_Industrial_Q3_Balance_Sheet.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
                        new File([new Uint8Array(1024 * 840)], 'Signed_Letter_of_Intent_Apex_Acquisition.pdf', { type: 'application/pdf' }),
                        new File([new Uint8Array(1024 * 2100)], 'IRS_Form_1120_Tax_Return_2024.pdf', { type: 'application/pdf' }),
                    ]
                    setSelectedFiles(sampleFiles)
                } catch {
                    // Fallback
                }
            } else if (action.type === 'simulate_queue') {
                clearSimulatedBatchTimer()
                setSelectedFiles([])
                
                let currentElapsed = 0
                setSimulatedWalkthroughBatch({
                    id: 'apex-demo-001',
                    expectedDocumentCount: 4,
                    finishedCount: 0,
                    processingCount: 4,
                    progressPercent: 6,
                    elapsedSeconds: 0,
                    workerStatus: 'Initializing 4 parallel extraction workers on n8n Pod 1 (OpenAI 5.6 Terra)...',
                })

                simulatedBatchTimerRef.current = setInterval(() => {
                    currentElapsed += 1
                    if (currentElapsed >= 11) {
                        setSimulatedWalkthroughBatch({
                            id: 'apex-demo-001',
                            expectedDocumentCount: 4,
                            finishedCount: 4,
                            processingCount: 0,
                            progressPercent: 100,
                            elapsedSeconds: currentElapsed,
                            workerStatus: 'All 4 documents verified & extracted with 100% confidence.',
                        })
                        clearSimulatedBatchTimer()
                    } else if (currentElapsed >= 8) {
                        setSimulatedWalkthroughBatch({
                            id: 'apex-demo-001',
                            expectedDocumentCount: 4,
                            finishedCount: 3,
                            processingCount: 1,
                            progressPercent: 79,
                            elapsedSeconds: currentElapsed,
                            workerStatus: 'LOI terms extracted ($12.5M valuation cap). 1 worker active...',
                        })
                    } else if (currentElapsed >= 5) {
                        setSimulatedWalkthroughBatch({
                            id: 'apex-demo-001',
                            expectedDocumentCount: 4,
                            finishedCount: 2,
                            processingCount: 2,
                            progressPercent: 54,
                            elapsedSeconds: currentElapsed,
                            workerStatus: 'Balance Sheet reconciled (Working Capital checked). 2 workers active...',
                        })
                    } else if (currentElapsed >= 2) {
                        setSimulatedWalkthroughBatch({
                            id: 'apex-demo-001',
                            expectedDocumentCount: 4,
                            finishedCount: 1,
                            processingCount: 3,
                            progressPercent: 28,
                            elapsedSeconds: currentElapsed,
                            workerStatus: 'P&L verified ($15.8M Revenue, $3.2M EBITDA). 3 workers active...',
                        })
                    } else {
                        setSimulatedWalkthroughBatch((prev) => prev ? {
                            ...prev,
                            elapsedSeconds: currentElapsed,
                            progressPercent: Math.min(20, 6 + currentElapsed * 4),
                        } : null)
                    }
                }, 1000)
            } else if (action.type === 'simulate_open_evidence') {
                setActiveEvidence({
                    title: 'Discrepancy: Gross Revenue vs IRS Form 1120-S',
                    sourceFile: 'Apex-2023-Tax-Return-Form-1120S.pdf',
                    sourceLocation: 'Page 4, Line 1a (Gross Receipts)',
                    excerpt: 'Reported Gross Receipts $14,210,000 vs CIM reported Revenue $15,800,000 (discrepancy of $1,590,000 requires working capital reserve adjustment).',
                    status: 'critical_conflict',
                    provenance: 'Automated Cross-Doc Reconciliation',
                    confidence: 0.99,
                })
            } else if (action.type === 'simulate_open_doc_evidence') {
                setActiveEvidence({
                    title: 'EBITDA Normalization: Management Consulting Add-Back',
                    sourceFile: 'Apex-Financials-FY23.xlsx',
                    sourceLocation: 'Tab "P&L Summary", Cell G42',
                    excerpt: 'Management consulting fee of $450,000 paid to related entity; confirmed non-recurring add-back.',
                    status: 'confirmed',
                    provenance: 'Line Item Extraction Pass',
                    confidence: 0.98,
                })
            } else if (action.type === 'close_evidence') {
                setActiveEvidence(null)
            } else if (action.type === 'open_export_modal') {
                setIsExportModalOpen(true)
            } else if (action.type === 'close_export_modal') {
                setIsExportModalOpen(false)
            } else if (action.type === 'reset_simulation') {
                clearSimulatedBatchTimer()
                setSimulatedWalkthroughBatch(null)
                setActiveEvidence(null)
                setIsExportModalOpen(false)
            }
        }

        const handleDirectOpenExport = () => setIsExportModalOpen(true)
        const handleDirectCloseExport = () => setIsExportModalOpen(false)

        window.addEventListener('mergeworks:walkthrough-action', handleWalkthroughAction)
        window.addEventListener('mergeworks:open-export-modal', handleDirectOpenExport)
        window.addEventListener('mergeworks:close-export-modal', handleDirectCloseExport)
        return () => {
            clearSimulatedBatchTimer()
            window.removeEventListener('mergeworks:walkthrough-action', handleWalkthroughAction)
            window.removeEventListener('mergeworks:open-export-modal', handleDirectOpenExport)
            window.removeEventListener('mergeworks:close-export-modal', handleDirectCloseExport)
        }
    }, [clearSimulatedBatchTimer])

    useEffect(() => {
        try {
            if (activeSubmissionBatch) {
                window.sessionStorage.setItem('mergeworks.activeSubmissionBatch', JSON.stringify(activeSubmissionBatch))
            } else {
                window.sessionStorage.removeItem('mergeworks.activeSubmissionBatch')
            }
        } catch { }
    }, [activeSubmissionBatch])

    const inFlightBatchPlaceholder = useMemo(() => {
        if (activeSubmissionBatch?.id && !activeSubmissionBatch.endedAt && !activeSubmissionBatch.stoppedAt) {
            const batchRows = submissionHistory.filter((r) => r.submissionBatchId === activeSubmissionBatch.id || r.projectId === activeSubmissionBatch.id)
            const hasPendingBatchRows = batchRows.some((r) => isActiveSubmissionStatus(r.status))
            if (!hasPendingBatchRows && batchRows.length > 0) {
                return null
            }

            return {
                projectId: activeSubmissionBatch.id,
                dealName: dealName || activeSubmissionBatch.id,
                projectStage,
                expectedDocumentCount: activeSubmissionBatch.expectedDocumentCount,
            }
        }
        return null
    }, [activeSubmissionBatch, dealName, projectStage, submissionHistory])

    const projectSummaries = useMemo(
        () => createProjectSummaries(rawSubmissionHistory, inFlightBatchPlaceholder),
        [rawSubmissionHistory, inFlightBatchPlaceholder]
    )

    const availableProjects = useMemo(() => {
        const nameCounts = new Map<string, number>()
        projectSummaries.forEach((ps: any) => {
            const name = (ps.projectName || ps.companyName || ps.projectKey || '').trim()
            nameCounts.set(name, (nameCounts.get(name) || 0) + 1)
        })

        return projectSummaries.map((ps: any) => {
            const baseName = ps.projectName || ps.companyName || ps.projectKey || 'Untitled Deal'
            const count = ps.documentCount ?? 0
            const countLabel = count === 1 ? '1 doc' : `${count} docs`
            const hasDuplicateName = (nameCounts.get(baseName.trim()) || 0) > 1

            let label = `${baseName} (${countLabel})`
            if (hasDuplicateName) {
                const shortId = (ps.projectId || ps.projectKey || '').replace(/^project-/, '').substring(0, 8)
                label = `${baseName} (${countLabel} • #${shortId})`
            }

            return {
                key: ps.projectKey,
                label,
                name: baseName,
                id: ps.projectId || ps.projectKey,
            }
        })
    }, [projectSummaries])

    const todayPipelineStats = useMemo(() => {
        const isToday = (dateInput?: string | number | null) => {
            if (!dateInput) return false
            const d = new Date(dateInput)
            if (isNaN(d.getTime())) return false
            const today = new Date()
            return (
                d.getFullYear() === today.getFullYear() &&
                d.getMonth() === today.getMonth() &&
                d.getDate() === today.getDate()
            )
        }

        // 1. Docs finished today
        const completedDocsToday = (submissionHistory || []).filter(doc => {
            if (!isExampleMode && (doc.requestID?.startsWith('mock-') || doc.requestID?.startsWith('bm-'))) return false
            const status = String(doc.status || '').trim().toLowerCase()
            const isCompleted = ['completed', 'processed', 'passed', 'extracted'].includes(status)
            if (!isCompleted) return false
            const timestamp = doc.processedAt || doc.updatedAt || doc.createdAt || doc.receivedAt
            return isToday(timestamp)
        })
        const docsFinishedTodayCount = completedDocsToday.length

        // 2. Syntheses finished today
        const completedSynthesesToday = (visibleProjectSyntheses || []).filter((synth: any) => {
            if (!isExampleMode && (synth.projectId?.startsWith('benchmark-') || synth.projectId?.startsWith('gt-') || synth.projectId === 'werkheiser-pass-1' || synth.projectId === 'werkheiser-pass-2')) return false
            const status = String(synth.status || synth.projectStatus || '').trim().toLowerCase()
            const hasSubstantiveOutput = Boolean(
                (synth.finalRecommendation && synth.finalRecommendation.trim().length > 0) ||
                (synth.finalJudgmentSummary && synth.finalJudgmentSummary.trim().length > 0) ||
                (synth.costUsd && synth.costUsd > 0) ||
                (synth.totalTokens && synth.totalTokens > 0)
            )
            const isCompleted = (['synthesized', 'completed', 'ready', 'success'].includes(status) || hasSubstantiveOutput) && hasSubstantiveOutput
            if (!isCompleted) return false
            const timestamp = synth.projectProcessedAt || synth.createdAt || synth.created_at || synth.updatedAt
            return isToday(timestamp)
        })
        const synthesesFinishedTodayCount = completedSynthesesToday.length

        // 3. Projects finished processing today
        const completedProjectsToday = (projectSummaries || []).filter((p: any) => {
            if (!isExampleMode && (p.projectId?.startsWith('benchmark-') || p.projectId?.startsWith('gt-') || p.projectId === 'werkheiser-pass-1' || p.projectId === 'werkheiser-pass-2')) return false
            const status = String(p.synthesisStatus || '').trim().toLowerCase()
            const inProgress = typeof p.inProgressCount === 'number' ? p.inProgressCount : 0
            const isCompleted = ['synthesized', 'ready for synthesis', 'ready', 'completed'].includes(status) || (p.completedCount > 0 && inProgress === 0)
            if (!isCompleted) return false
            const timestamp = p.latestActivity || p.updatedAt || p.createdAt
            return isToday(timestamp)
        })
        const projectsFinishedTodayCount = completedProjectsToday.length

        // 4. Total cost used today (strictly measured actual telemetry from today's runs, $0.00 if nothing ran)
        const docCostToday = completedDocsToday.reduce((acc, doc) => {
            const cost = typeof doc.costUsd === 'number' ? doc.costUsd : Number((doc as any).cost_usd) || (doc.totalTokens ? doc.totalTokens * 0.0000075 : 0)
            return acc + (Number.isFinite(cost) && cost > 0 ? cost : 0)
        }, 0)
        const synthCostToday = completedSynthesesToday.reduce((acc, synth: any) => {
            const cost = typeof synth.costUsd === 'number' ? synth.costUsd : Number(synth.cost_usd) || (synth.totalTokens ? synth.totalTokens * 0.0000075 : 0)
            return acc + (Number.isFinite(cost) && cost > 0 ? cost : 0)
        }, 0)
        const totalCostToday = docCostToday + synthCostToday
        return {
            projectsFinishedToday: projectsFinishedTodayCount,
            synthesesFinishedToday: synthesesFinishedTodayCount,
            docsFinishedToday: docsFinishedTodayCount,
            totalCostToday: totalCostToday,
        }
    }, [submissionHistory, visibleProjectSyntheses, projectSummaries, isExampleMode])

    const portfolioAllTimeCost = useMemo(() => {
        const docCost = (submissionHistory || []).reduce((acc, doc) => {
            const cost = typeof doc.costUsd === 'number' ? doc.costUsd : Number((doc as any).cost_usd) || (doc.totalTokens ? doc.totalTokens * 0.0000075 : 0.055)
            return acc + (Number.isFinite(cost) && cost > 0 ? cost : 0)
        }, 0)
        const synthCost = (visibleProjectSyntheses || []).reduce((acc, synth: any) => {
            const cost = typeof synth.costUsd === 'number' ? synth.costUsd : Number(synth.cost_usd) || (synth.totalTokens ? synth.totalTokens * 0.0000075 : 0.069)
            return acc + (Number.isFinite(cost) && cost > 0 ? cost : 0)
        }, 0)
        return docCost + synthCost
    }, [submissionHistory, visibleProjectSyntheses])

    const [activeHistoryEnvironment, setActiveHistoryEnvironment] = useState<SubmitEnvironment>('production')
    const [currentTheme, setCurrentTheme] = useState(getStoredTheme)
    const [desktopNotificationPermission, setDesktopNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
        return Notification.permission
    })

    const [dealModelDraftByProject, setDealModelDraftByProject] = useState<Record<string, DealModel>>({})
    const dealModelSaveTimeout = useRef<number | null>(null)
    const [hasRestoredLatestProject, setHasRestoredLatestProject] = useState(false)

    // Automatically restore active viewing project from deep link, stored active project, or default to the most recently submitted live project on initial page load / refresh once backend query completes
    useEffect(() => {
        if (!isExampleMode && (submissionHistoryLoading || submissionHistoryData === null)) return
        if (hasRestoredLatestProject || projectSummaries.length === 0) return

        let urlProjectTarget: any = null
        if (typeof window !== 'undefined') {
            const parsed = parseUrlDeepLinkState(window.location.search)
            if (parsed.projectQuery) {
                urlProjectTarget = matchProjectFromQuery(parsed.projectQuery, projectSummaries)
            }
        }

        const storedActiveKey = typeof window !== 'undefined'
            ? (window.localStorage.getItem('mergeworks.activeProjectKey') || window.localStorage.getItem('mergeworks.selectedProjectKey'))
            : null

        const matchingStoredProject = storedActiveKey
            ? projectSummaries.find((p: any) => p.projectKey === storedActiveKey || p.projectId === storedActiveKey)
            : null

        const targetProject = urlProjectTarget || matchingStoredProject || projectSummaries[0]
        if (targetProject) {
            const targetKey = targetProject.projectKey || targetProject.projectId
            if (activeViewProjectId !== targetKey) {
                setActiveViewProjectId(targetKey)
            }
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('mergeworks.activeProjectKey', targetKey)
            }
        }
        setHasRestoredLatestProject(true)
    }, [submissionHistoryLoading, hasRestoredLatestProject, projectSummaries, activeViewProjectId, setActiveViewProjectId, isExampleMode, submissionHistoryData])

    // Keep project fields in sync whenever selectedProjectKey changes, auto-resolving orphaned keys
    useEffect(() => {
        if (selectedProjectKey === 'new' || projectSummaries.length === 0) return
        let matchingProject = projectSummaries.find((p: any) => p.projectKey === selectedProjectKey || p.projectId === selectedProjectKey)

        // If selectedProjectKey is an orphaned raw key (e.g. project-20260811-xxx that was re-associated in Supabase), resolve to matching company or newest project
        if (!matchingProject) {
            matchingProject = projectSummaries.find((p: any) =>
                (p.companyName && selectedProjectKey.toLowerCase().includes(p.companyName.toLowerCase())) ||
                (p.projectName && selectedProjectKey.toLowerCase().includes(p.projectName.toLowerCase()))
            ) || projectSummaries[0]

            if (matchingProject) {
                console.log(`[ProjectSync] Auto-resolving orphaned project key "${selectedProjectKey}" -> "${matchingProject.projectKey}"`)
                setSelectedProjectKey(matchingProject.projectKey)
            }
        }

        if (matchingProject) {
            if (dealName !== matchingProject.projectName) {
                setDealName(matchingProject.projectName)
            }
            const targetPid = matchingProject.projectId || matchingProject.projectKey
            if (projectId !== targetPid) {
                setProjectId(targetPid)
            }
            const targetStage = matchingProject.stage || 'post-loi'
            if (projectStage !== targetStage) {
                setProjectStage(targetStage)
            }
        }
    }, [dealName, projectId, projectStage, projectSummaries, selectedProjectKey, setDealName, setProjectId, setProjectStage, setSelectedProjectKey])

    const [notifications, setNotifications] = useState<Notification[]>(() => {
        const now = new Date()
        return [
            { id: '1', type: 'info', title: 'Welcome to Dillon AI', description: 'Upload documents or switch to example data to explore.', timestamp: now, read: false },
        ]
    })

    const handleMarkNotificationRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    const handleMarkAllNotificationsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    const handleClearNotifications = () => setNotifications([])

    type ToastItem = { id: string; title: string; description: string; type?: 'info' | 'success' | 'warning' | 'error' }
    const [activeToasts, setActiveToasts] = useState<ToastItem[]>([])

    const addToast = (toast: Omit<ToastItem, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
        setActiveToasts(prev => [...prev, { ...toast, id }])
        setTimeout(() => {
            setActiveToasts(prev => prev.filter(t => t.id !== id))
        }, 7000)
    }

    useEffect(() => {
        if (isExampleMode || typeof window === 'undefined') return

        let cancelled = false
        const restorePendingExampleModeSubmission = async () => {
            let pending: PendingExampleModeSubmission | null = null
            try {
                const stored = window.sessionStorage.getItem(PENDING_EXAMPLE_MODE_SUBMISSION_KEY)
                pending = stored ? JSON.parse(stored) as PendingExampleModeSubmission : null
            } catch {
                pending = null
            }
            if (!pending) return

            try {
                setSelectedProjectKey(pending.selectedProjectKey || 'new')
                setDealName(pending.dealName)
                setAskingPrice(pending.askingPrice)
                setProjectId(pending.projectId)
                setProjectStage(pending.projectStage)
                setDocumentType(pending.documentType)
                setSubmissionNotes(pending.submissionNotes)
                const restoredFiles = pending.files.map((file) => base64ToFile(file.base64, file.name, file.type || 'application/octet-stream'))
                if (!cancelled) {
                    setSelectedFiles(restoredFiles)
                    window.sessionStorage.removeItem(PENDING_EXAMPLE_MODE_SUBMISSION_KEY)
                    setBatchSubmissionMessage('Switched from Example to Live n8n automatically. Your selected files were restored — press Queue again to submit them live.')
                }
            } catch {
                window.sessionStorage.removeItem(PENDING_EXAMPLE_MODE_SUBMISSION_KEY)
            }
        }

        void restorePendingExampleModeSubmission()
        return () => { cancelled = true }
    }, [isExampleMode, setAskingPrice, setDealName, setDocumentType, setProjectId, setProjectStage, setSelectedProjectKey, setSubmissionNotes])

    const isTourActive = walkthrough.isActive || Boolean(simulatedWalkthroughBatch)
    const activeProjectId = isExampleMode
        ? 'atlas-001'
        : (isTourActive ? 'apex-industrial-tech' : (activeViewProjectId || (selectedProjectKey !== 'new' ? projectId : '') || projectSummaries[0]?.projectId || projectSummaries[0]?.projectKey || ''))

    const activeViewProject = useMemo(() => {
        if (!activeProjectId || projectSummaries.length === 0) return null
        const found = projectSummaries.find((p: any) => p.projectId === activeProjectId || p.projectKey === activeProjectId)
        if (!found) return null
        return {
            key: found.projectKey,
            name: found.projectName || found.companyName || found.projectKey,
            id: found.projectId || found.projectKey,
        }
    }, [activeProjectId, projectSummaries])

    // Keep browser address bar in sync with active project and active tab for 1-click URL sharing
    useEffect(() => {
        if (isTourActive || isExampleMode) return
        if (!activeProjectId) return
        syncBrowserUrl(activeViewProject?.key || activeProjectId, activeWorkspaceTab)
    }, [activeProjectId, activeViewProject, activeWorkspaceTab, isTourActive, isExampleMode])

    // Scroll directly to Project Intake section when opening or refreshing the dashboard from landing page, data source toggle, or direct URL entry
    useEffect(() => {
        if (typeof window === 'undefined') return

        if ('scrollRestoration' in window.history) {
            try {
                window.history.scrollRestoration = 'manual'
            } catch {
                // Ignore in restricted iframe environments
            }
        }

        const rawHash = (window.location.hash || '').toLowerCase().trim()
        const isIntakeTargetHash =
            !rawHash ||
            rawHash === '#' ||
            rawHash === '#overview' ||
            rawHash === '#dashboard' ||
            rawHash === '#deal-workspace' ||
            rawHash === '#upload-section' ||
            rawHash === '#project-intake' ||
            rawHash === '#deal-intake' ||
            rawHash === '#intake' ||
            rawHash === '#upload'

        if (isIntakeTargetHash) {
            const scrollToIntake = () => {
                const intakeEl = (document.querySelector('[data-project-intake]') ||
                    document.getElementById('upload-section') ||
                    document.getElementById('project-intake') ||
                    document.getElementById('deal-intake')) as HTMLElement | null

                if (intakeEl) {
                    intakeEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
            }

            const timeouts = [
                setTimeout(scrollToIntake, 0),
                setTimeout(scrollToIntake, 50),
                setTimeout(scrollToIntake, 150),
                setTimeout(scrollToIntake, 350),
                setTimeout(scrollToIntake, 700),
                setTimeout(scrollToIntake, 1200),
            ]

            return () => {
                timeouts.forEach(clearTimeout)
            }
        }
    }, [])

    const handleAppendToActiveProject = useCallback(() => {
        if (!activeViewProject) return
        setSelectedProjectKey(activeViewProject.key)
        const target = projectSummaries.find((p: any) => p.projectKey === activeViewProject.key || p.projectId === activeViewProject.key)
        if (target) {
            setProjectId(target.projectId || target.projectKey)
            setDealName(target.projectName)
            setProjectStage(target.stage || 'post-loi')
        }
    }, [activeViewProject, projectSummaries, setDealName, setProjectId, setProjectStage, setSelectedProjectKey])

    const handleSwitchActiveViewProject = useCallback((projectKey: string) => {
        if (!projectKey) return
        setActiveViewProjectId(projectKey)
        try {
            localStorage.setItem('mergeworks.activeProjectKey', projectKey)
        } catch {
            // ignore
        }
    }, [setActiveViewProjectId])

    const mostRecentProject = useMemo(() => projectSummaries[0] ?? null, [projectSummaries])
    const isViewingOlderDeal = Boolean(
        hasRestoredLatestProject &&
        !submissionHistoryLoading &&
        !isExampleMode &&
        !isTourActive &&
        mostRecentProject &&
        activeProjectId &&
        (activeViewProjectId
            ? (activeViewProjectId !== mostRecentProject.projectKey && activeViewProjectId !== mostRecentProject.projectId)
            : (activeProjectId !== mostRecentProject.projectId && activeProjectId !== mostRecentProject.projectKey))
    )

    const prevFailedCountRef = useRef<number | null>(null)
    useEffect(() => {
        const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000
        const recentFailedDocs = submissionHistory.filter((row) => {
            const isFailedStatus = ['failed', 'error', 'rejected'].includes((row.status || '').trim().toLowerCase()) ||
                (row.errorMessage || row.aiEscalationReason || '').toLowerCase().includes('credit') ||
                (row.errorMessage || row.aiEscalationReason || '').toLowerCase().includes('balance')
            if (!isFailedStatus) return false

            const rowTime = row.updatedAt ? new Date(row.updatedAt).getTime() : (row.createdAt ? new Date(row.createdAt).getTime() : 0)
            return rowTime > fifteenMinutesAgo || (activeProjectId && row.projectId === activeProjectId)
        })

        if (prevFailedCountRef.current !== null && recentFailedDocs.length > prevFailedCountRef.current) {
            const newlyFailedCount = recentFailedDocs.length - prevFailedCountRef.current
            const sampleDoc = recentFailedDocs[0]
            const projLabel = sampleDoc?.dealName || sampleDoc?.companyName || 'diligence project'
            triggerFailureAlert(
                '🔴 AI Processing Error — Due Diligence Pipeline',
                `${newlyFailedCount} document(s) in ${projLabel} failed processing or hit credit limits. Check the Diligence tab to retry.`
            )
        }
        prevFailedCountRef.current = recentFailedDocs.length
    }, [submissionHistory, activeProjectId])

    const activeDealModel = useMemo<DealModel>(() => {
        if (isTourActive || isExampleMode) {
            return DEMO_FALLBACK_DEAL_MODEL
        }
        const saved = Array.isArray(dealModelsData) ? dealModelsData.find((model) => model.projectId === activeProjectId) : undefined
        return dealModelDraftByProject[activeProjectId] ?? saved ?? {
            projectId: activeProjectId,
            askingPrice: parseDashboardMoneyInput(askingPrice),
            purchasePrice: null, debtAssumed: null, cashAcquired: null, workingCapitalRequirement: null,
            transactionFees: null, holdPeriodYears: null, taxRate: null, closingCosts: null,
            maintenanceCapex: null, exitMultiple: null, exitCosts: null, equityContributionPercent: null,
            interestRate: null, amortizationYears: null, sellerNoteAmount: null, bearRevenueGrowth: null,
            baseRevenueGrowth: null, bullRevenueGrowth: null, bearEbitdaMargin: null, baseEbitdaMargin: null,
            bullEbitdaMargin: null, bearExitMultiple: null, baseExitMultiple: null, bullExitMultiple: null,
            revenueMultiple: null, ebitdaMultiple: null, assetHaircutPercent: null, modelUpdatedAt: '',
            modelUpdatedBy: '', documentedFactsJson: '', documentedFactsStatus: '',
        }
    }, [activeProjectId, askingPrice, dealModelDraftByProject, dealModelsData, isExampleMode, isTourActive])

    const activeProjectDocuments = useMemo(() => {
        if (isTourActive || isExampleMode) {
            return DEMO_FALLBACK_DOCS
        }
        const matching = submissionHistory.filter((row) => isRowMatchingProject(row, activeProjectId, projectSummaries))
        if (matching.length === 0) {
            const normPid = (activeProjectId || '').trim().toLowerCase()
            if (normPid === 'apex-industrial-tech' || (normPid.includes('apex') && !normPid.includes('vanguard'))) {
                return DEMO_FALLBACK_DOCS.filter(d => (d.projectId || '').includes('apex'))
            }
            if (normPid === 'cascadia-climate-services' || normPid.includes('cascadia')) {
                return DEMO_FALLBACK_DOCS.filter(d => (d.projectId || '').includes('cascadia'))
            }
            return []
        }
        const sorted = [...matching].sort((a, b) => {
            const timeA = new Date(a.processedAt || a.createdAt || a.receivedAt || a.updatedAt || 0).getTime()
            const timeB = new Date(b.processedAt || b.createdAt || b.receivedAt || b.updatedAt || 0).getTime()
            return timeB - timeA
        })
        const uniqueDocs = new Map<string, SubmissionHistoryItem>()
        sorted.forEach((row) => {
            const fileKey = (row.fileName || row.requestID || String(row.id)).trim().toLowerCase()
            if (!uniqueDocs.has(fileKey)) {
                uniqueDocs.set(fileKey, row)
            }
        })
        return [...uniqueDocs.values()]
    }, [activeProjectId, submissionHistory, projectSummaries, isTourActive, isExampleMode])

    const handleStartTour = useCallback((tourId: string) => {
        if (!isExampleMode && activeProjectDocuments.length === 0) {
            setDataSource('mock')
        }
        walkthrough.startTour(tourId)
    }, [activeProjectDocuments.length, isExampleMode, walkthrough])

    const handleResumeTour = useCallback(() => {
        if (!isExampleMode && activeProjectDocuments.length === 0) {
            setDataSource('mock')
        }
        walkthrough.resumeTour()
    }, [activeProjectDocuments.length, isExampleMode, walkthrough])

    const hydratedDealModel = useMemo(
        () => hydrateModelFactsFromDocuments(activeDealModel, activeProjectDocuments),
        [activeDealModel, activeProjectDocuments]
    )

    const returnsDisplayModel = useMemo(
        () => withDerivedCapitalStack(isExampleMode ? hydratedDealModel : buildReturnsDisplayModel(hydratedDealModel)),
        [hydratedDealModel, isExampleMode]
    )

    const isReturnsIllustrativePreview = useMemo(() => {
        if (isExampleMode) return false
        try {
            const facts = JSON.parse(hydratedDealModel.documentedFactsJson || '{}')
            const hasDocumentedEbitda = (facts.ebitda_sde?.status === 'confirmed' || facts.ebitda_sde?.status === 'reported') && typeof facts.ebitda_sde?.value === 'number'
            const hasDocumentedPrice = hydratedDealModel.askingPrice != null || hydratedDealModel.purchasePrice != null
            return !(hasDocumentedEbitda && hasDocumentedPrice)
        } catch { return true }
    }, [hydratedDealModel, isExampleMode])

    const isGrowthIllustrativePreview = useMemo(() => {
        if (isExampleMode) return false
        try {
            const facts = JSON.parse(hydratedDealModel.documentedFactsJson || '{}')
            const hasDocumentedRevenue = (facts.revenue?.status === 'confirmed' || facts.revenue?.status === 'reported') && typeof facts.revenue?.value === 'number'
            const hasDocumentedEbitda = (facts.ebitda_sde?.status === 'confirmed' || facts.ebitda_sde?.status === 'reported') && typeof facts.ebitda_sde?.value === 'number'
            return !(hasDocumentedRevenue || hasDocumentedEbitda)
        } catch { return true }
    }, [hydratedDealModel, isExampleMode])

    const activeProjectSynthesis = useMemo(() => {
        if (isTourActive || isExampleMode) {
            return DEMO_FALLBACK_SYNTHESIS
        }
        const found = visibleProjectSyntheses.find((s: any) => 
            s.projectId === activeProjectId || 
            isRowMatchingProject({ projectId: s.projectId } as any, activeProjectId, projectSummaries)
        ) ?? null
        return found
    }, [activeProjectId, visibleProjectSyntheses, projectSummaries, isTourActive, isExampleMode])

    const effectiveDealName = isTourActive
        ? 'Apex Industrial Technologies LLC'
        : (isExampleMode ? 'Apex Industrial Technologies (Atlas Demo)' : (activeViewProject?.name || dealName || ''))

    const suggestedProjectName = useMemo(() => {
        if (isTourActive) {
            return 'Apex Industrial Technologies LLC'
        }
        if (selectedFiles.length > 0) {
            return selectedFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
        }
        return dealName || activeViewProject?.name || 'New Project'
    }, [dealName, activeViewProject, selectedFiles, isTourActive])

    const suggestedProjectId = useMemo(() => {
        const used = projectSummaries.map((p: any) => p.projectId || p.projectKey)
        return createUnusedProjectId(used)
    }, [projectSummaries])

    const handleAskingPriceChange = (value: string) => {
        setAskingPrice(value)
        if (activeProjectId) {
            setAskingPriceByProject((current) => ({ ...current, [activeProjectId]: value }))
        }
    }

    const handleDealModelChange = (updated: Partial<DealModel>) => {
        setDealModelDraftByProject((current) => {
            const existing = current[activeProjectId] ?? activeDealModel
            const next = { ...existing, ...updated }
            if (dealModelSaveTimeout.current) window.clearTimeout(dealModelSaveTimeout.current)
            dealModelSaveTimeout.current = window.setTimeout(() => {
                void triggerSaveDealModel(next)
            }, 800)
            return { ...current, [activeProjectId]: next }
        })
    }

    const handleDealModelDefaults = () => {
        handleDealModelChange(returnsDisplayModel)
    }

    const impact = useMemo(() => computeImpactMetrics(submissionHistory), [submissionHistory])
    const activeProjectImpact = useMemo(() => computeImpactMetrics(activeProjectDocuments), [activeProjectDocuments])

    const hasActiveSubmissions = useMemo(() => {
        return submissionHistory.some((row) => isActiveSubmissionStatus(row.status))
    }, [submissionHistory])

    const latestBatchRows = useMemo(() => {
        if (isTourActive || isExampleMode) {
            return DEMO_FALLBACK_DOCS
        }

        const batchId = activeSubmissionBatch?.id
        if (batchId) {
            const batchRows = submissionHistory.filter((row) => row.submissionBatchId === batchId && !isSystemTestProbeFile(row.fileName))
            if (batchRows.length > 0) {
                const uniqueBatch = new Map<string, SubmissionHistoryItem>()
                batchRows.forEach((row) => {
                    const key = (row.fileName || row.requestID || String(row.id)).trim().toLowerCase()
                    if (!uniqueBatch.has(key)) uniqueBatch.set(key, row)
                })
                return [...uniqueBatch.values()].sort((a, b) => new Date(a.createdAt || a.receivedAt || a.updatedAt || 0).getTime() - new Date(b.createdAt || b.receivedAt || b.updatedAt || 0).getTime())
            }
        }

        const projectRows = submissionHistory.filter((row) => !isSystemTestProbeFile(row.fileName) && isRowMatchingProject(row, activeProjectId, projectSummaries))
        if (projectRows.length === 0) return []

        const sorted = [...projectRows].sort((a, b) => {
            const timeA = new Date(a.processedAt || a.createdAt || a.receivedAt || a.updatedAt || 0).getTime()
            const timeB = new Date(b.processedAt || b.createdAt || b.receivedAt || b.updatedAt || 0).getTime()
            return timeB - timeA
        })

        const uniqueDocs = new Map<string, SubmissionHistoryItem>()
        sorted.forEach((row) => {
            const fileKey = (row.fileName || row.requestID || String(row.id)).trim().toLowerCase()
            if (!uniqueDocs.has(fileKey)) {
                uniqueDocs.set(fileKey, row)
            }
        })

        const result = [...uniqueDocs.values()]
        return result.sort((a, b) => new Date(a.createdAt || a.receivedAt || a.updatedAt || 0).getTime() - new Date(b.createdAt || b.receivedAt || b.updatedAt || 0).getTime())
    }, [activeProjectId, activeSubmissionBatch?.id, submissionHistory, projectSummaries, isTourActive, isExampleMode])

    const activeBatchRows = useMemo(() => {
        if (activeSubmissionBatch?.id) {
            const batchRows = submissionHistory.filter((row) => {
                if (isSystemTestProbeFile(row.fileName)) return false
                if (row.submissionBatchId === activeSubmissionBatch.id) return true
                if (row.projectId === activeSubmissionBatch.id || isRowMatchingProject(row, activeSubmissionBatch.id, projectSummaries)) {
                    if (activeSubmissionBatch.startedAt) {
                        const rowTime = new Date(row.createdAt || row.receivedAt || row.processedAt || 0).getTime()
                        return rowTime >= (activeSubmissionBatch.startedAt - 5000)
                    }
                }
                return false
            })
            if (batchRows.length > 0) return batchRows
            return []
        }
        return latestBatchRows
    }, [activeSubmissionBatch, latestBatchRows, submissionHistory, projectSummaries])

    const batchProgress = useMemo(() => deriveBatchProgress(activeBatchRows), [activeBatchRows])
    const activeBatchExpectedCount = activeSubmissionBatch?.expectedDocumentCount || batchProgress.expectedCount
    const activeBatchFinishedCount = batchProgress.finishedCount
    const activeBatchProcessingCount = batchProgress.processingCount
    const activeBatchFailedCount = batchProgress.failedCount
    const activeBatchCompletedCount = batchProgress.completedCount
    const activeBatchStuckRows = batchProgress.stuckRows
    const activeBatchErrors = batchProgress.errors
    const activeBatchAdvisories = batchProgress.advisories
    const activeBatchProcessingPercent = Math.min(100, Math.round((activeBatchProcessingCount / (activeBatchExpectedCount || 1)) * 100))
    const activeBatchProgressPercent = Math.min(100, Math.round((activeBatchFinishedCount / (activeBatchExpectedCount || 1)) * 100))

    const isInterruptedBatch = useMemo(() => {
        if (isExampleMode || isSubmittingFile) return false
        if (activeBatchProcessingCount > 0) return false
        if (activeBatchRows.length === 0) return false
        return activeBatchRows.length === activeBatchFinishedCount && activeBatchFinishedCount < activeBatchExpectedCount
    }, [isExampleMode, isSubmittingFile, activeBatchProcessingCount, activeBatchRows.length, activeBatchFinishedCount, activeBatchExpectedCount])

    const isCurrentProjectProcessingDocuments = useMemo(() => {
        return activeProjectDocuments.some((doc) => {
            const st = (doc.status || '').trim().toLowerCase()
            return ['uploading', 'processing', 'running'].includes(st)
        })
    }, [activeProjectDocuments])

    const isCurrentProjectExtractingDocs = useMemo(() => {
        if (isExampleMode) return false
        if (isSubmittingFile) return true
        if (activeBatchProcessingCount > 0) return true
        if (isInterruptedBatch) return false
        if (activeSubmissionBatch && activeBatchFinishedCount < activeBatchExpectedCount) return true
        if (activeProjectDocuments.length === 0) return false
        return activeProjectDocuments.some((d) =>
            ['processing', 'running', 'uploading'].includes((d.status || '').trim().toLowerCase())
        )
    }, [activeProjectDocuments, isExampleMode, isSubmittingFile, activeBatchProcessingCount, isInterruptedBatch, activeSubmissionBatch, activeBatchFinishedCount, activeBatchExpectedCount])

    const isCurrentProjectDiligenceRunning = useMemo(() => {
        if (isExampleMode) return false
        if (isInterruptedBatch) return false
        return (
            isSubmittingFile ||
            isCurrentProjectExtractingDocs ||
            isCurrentProjectProcessingDocuments ||
            Boolean(activeSubmissionBatch && activeBatchFinishedCount < activeBatchExpectedCount)
        )
    }, [
        isExampleMode,
        isInterruptedBatch,
        isSubmittingFile,
        isCurrentProjectExtractingDocs,
        isCurrentProjectProcessingDocuments,
        activeSubmissionBatch,
        activeBatchFinishedCount,
        activeBatchExpectedCount,
    ])

    const isCurrentProjectDiligenceComplete = useMemo(() => {
        if (isExampleMode) return activeProjectDocuments.length > 0
        if (isCurrentProjectDiligenceRunning) return false
        if (activeProjectDocuments.length === 0) return false
        return activeProjectDocuments.some((doc) => {
            const st = (doc.status || '').trim().toLowerCase()
            return ['completed', 'processed', 'success', 'approved', 'done'].includes(st)
        })
    }, [isExampleMode, isCurrentProjectDiligenceRunning, activeProjectDocuments])

    const [isManualSynthesisRunning, setIsManualSynthesisRunning] = useState(false)

    // Reset manual synthesis running flag when fresh synthesis completes or fails
    useEffect(() => {
        if (isManualSynthesisRunning) {
            const synthStatus = (activeProjectSynthesis?.projectStatus || '').trim().toLowerCase()
            const fjJson = (activeProjectSynthesis?.finalJudgmentJson || '').trim()
            const isFinishedStatus = ['synthesized', 'completed', 'success'].includes(synthStatus)
            const isErrorStatus = ['failed', 'error', 'synthesis_blocked', 'synthesis_refresh_failed'].includes(synthStatus)
            const hasRealResults = ((activeProjectSynthesis?.finalRecommendation || '').trim().length > 0 && !(activeProjectSynthesis?.finalRecommendation || '').toUpperCase().includes('SYNTHESIS PENDING')) ||
                (activeProjectSynthesis?.finalJudgmentSummary || '').trim().length > 0 ||
                (fjJson.length > 0 && fjJson !== '{}')

            if (isErrorStatus || (isFinishedStatus && hasRealResults)) {
                const timer = setTimeout(() => setIsManualSynthesisRunning(false), 2000)
                return () => clearTimeout(timer)
            }
        }
    }, [activeProjectSynthesis?.projectStatus, activeProjectSynthesis?.finalRecommendation, activeProjectSynthesis?.finalJudgmentSummary, activeProjectSynthesis?.finalJudgmentJson, isManualSynthesisRunning])

    // Safety timeout for manual synthesis flag (90s max)
    useEffect(() => {
        if (!isManualSynthesisRunning) return
        const timer = setTimeout(() => setIsManualSynthesisRunning(false), 90_000)
        return () => clearTimeout(timer)
    }, [isManualSynthesisRunning])

    const activeProjectSynthesisSucceeded = useMemo(() => {
        if (!activeProjectSynthesis) return false
        const st = (activeProjectSynthesis.projectStatus || '').trim().toLowerCase()
        const hasRealRecommendation = (activeProjectSynthesis.finalRecommendation || '').trim().length > 0 && !(activeProjectSynthesis.finalRecommendation || '').toUpperCase().includes('SYNTHESIS PENDING')
        const hasRealSummary = (activeProjectSynthesis.finalJudgmentSummary || '').trim().length > 0
        const isCompletedStatus = ['synthesized', 'completed', 'success'].includes(st)
        return isCompletedStatus && (hasRealRecommendation || hasRealSummary)
    }, [activeProjectSynthesis])

    const isCurrentProjectSynthesisRunning = useMemo(() => {
        if (isManualSynthesisRunning) return true
        if (isExampleMode || activeProjectDocuments.length === 0) return false
        if (isCurrentProjectExtractingDocs) return false

        const completedDocs = activeProjectDocuments.filter((d) =>
            ['completed', 'approved'].includes((d.status || '').trim().toLowerCase())
        )
        const completedDocCount = completedDocs.length

        if (completedDocCount === 0) return false
        if (activeProjectSynthesisSucceeded) return false

        if (!activeProjectSynthesis) {
            return true
        }

        const synthStatus = (activeProjectSynthesis.projectStatus || '').trim().toLowerCase()
        if (['processing', 'pending', 'queued', 'running', 'awaiting_synthesis', 'awaiting_documents', 'started', ''].includes(synthStatus)) {
            return true
        }

        return false
    }, [activeProjectDocuments, activeProjectSynthesis, activeProjectSynthesisSucceeded, isCurrentProjectExtractingDocs, isExampleMode, isManualSynthesisRunning])

    const isCurrentProjectAwaitingSynthesis = useMemo(() => {
        return isCurrentProjectExtractingDocs || isCurrentProjectSynthesisRunning || isManualSynthesisRunning
    }, [isCurrentProjectExtractingDocs, isCurrentProjectSynthesisRunning, isManualSynthesisRunning])

    // Supabase Realtime WebSocket subscription for live documents and synthesis updates
    const { isConnected: isRealtimeConnected } = useSupabaseRealtimeDiligence({
        enabled: !isExampleMode,
        projectId: activeProjectId,
        onDocumentChange: () => {
            void triggerSubmissionHistory({ environment: 'production', skipCache: true })
        },
        onSynthesisChange: () => {
            void triggerProjectSynthesis({ environment: 'production', skipCache: true })
        },
    })

    // Periodic refresh effect: Gentle fallback heartbeat during active processing.
    // When Realtime WebSocket is connected, updates are pushed instantly via WebSockets and heartbeat runs every 20s.
    // If Realtime is disconnected, heartbeat runs every 6s.
    useEffect(() => {
        const isActivelyProcessing = Boolean(
            activeSubmissionBatch ||
            hasActiveSubmissions ||
            isCurrentProjectProcessingDocuments ||
            isCurrentProjectAwaitingSynthesis
        )

        if (!isActivelyProcessing) return

        const pollIntervalMs = isRealtimeConnected ? 20_000 : 6_000
        const interval = setInterval(() => {
            void triggerSubmissionHistory({ environment: 'production' })
            void triggerProjectSynthesis({ environment: 'production' })
        }, pollIntervalMs)
        return () => clearInterval(interval)
    }, [
        isRealtimeConnected,
        triggerSubmissionHistory,
        triggerProjectSynthesis,
        activeSubmissionBatch,
        hasActiveSubmissions,
        isCurrentProjectProcessingDocuments,
        isCurrentProjectAwaitingSynthesis,
    ])

    // Refresh on tab focus / visibility change only if more than 30s have passed
    useEffect(() => {
        let lastFocusFetch = 0
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now()
                if (now - lastFocusFetch > 30_000) {
                    lastFocusFetch = now
                    void triggerSubmissionHistory({ environment: 'production' })
                    void triggerProjectSynthesis({ environment: 'production' })
                }
            }
        }
        document.addEventListener('visibilitychange', handleVisibility)
        window.addEventListener('focus', handleVisibility)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility)
            window.removeEventListener('focus', handleVisibility)
        }
    }, [triggerSubmissionHistory, triggerProjectSynthesis])


    const currentSynthesisProgress = useMemo(
        () => deriveSynthesisProgress(activeProjectSynthesis?.projectStatus, isCurrentProjectAwaitingSynthesis),
        [activeProjectSynthesis?.projectStatus, isCurrentProjectAwaitingSynthesis]
    )

    const [batchNowTimestamp, setBatchNowTimestamp] = useState(() => Date.now())
    useEffect(() => {
        if (!activeSubmissionBatch?.startedAt || activeBatchFinishedCount >= activeBatchExpectedCount) return
        const timer = setInterval(() => setBatchNowTimestamp(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [activeBatchExpectedCount, activeBatchFinishedCount, activeSubmissionBatch?.startedAt])

    const batchElapsedSeconds = activeSubmissionBatch?.startedAt ? Math.max(0, Math.floor(((activeSubmissionBatch.endedAt || batchNowTimestamp) - activeSubmissionBatch.startedAt) / 1000)) : 0
    const activeBatchImpact = useMemo(() => computeImpactMetrics(activeBatchRows), [activeBatchRows])

    const [synthesisStartTimestamps, setSynthesisStartTimestamps] = useState<Record<string, number>>(() => {
        try {
            const raw = window.sessionStorage.getItem('mergeworks.synthesisStartTimestamps')
            return raw ? JSON.parse(raw) : {}
        } catch {
            return {}
        }
    })

    const recordSynthesisStartTime = useCallback((pid: string, time = Date.now()) => {
        if (!pid) return
        setSynthesisStartTimestamps((prev) => {
            if (prev[pid] && prev[pid] > 0) return prev
            const next = { ...prev, [pid]: time }
            try { window.sessionStorage.setItem('mergeworks.synthesisStartTimestamps', JSON.stringify(next)) } catch {}
            return next
        })
    }, [])

    const clearSynthesisStartTime = useCallback((pid: string) => {
        if (!pid) return
        setSynthesisStartTimestamps((prev) => {
            if (!prev[pid]) return prev
            const { [pid]: _, ...next } = prev
            try { window.sessionStorage.setItem('mergeworks.synthesisStartTimestamps', JSON.stringify(next)) } catch {}
            return next
        })
    }, [])

    // Clear synthesis start timestamp when a new document extraction begins
    useEffect(() => {
        if (isCurrentProjectExtractingDocs) {
            clearSynthesisStartTime(activeProjectId)
        }
    }, [isCurrentProjectExtractingDocs, activeProjectId, clearSynthesisStartTime])

    const isAnySynthesisRunning = !isCurrentProjectExtractingDocs && (isCurrentProjectSynthesisRunning || isManualSynthesisRunning)

    // Synchronize synthesis start timestamp only when document extraction is done and synthesis becomes active
    useEffect(() => {
        if (!isAnySynthesisRunning) return
        if (synthesisStartTimestamps[activeProjectId]) return

        let start = Date.now()
        if (activeProjectSynthesis?.createdAt) {
            const t = new Date(activeProjectSynthesis.createdAt).getTime()
            if (!isNaN(t) && t > 0 && t <= Date.now()) {
                const completedDocs = activeProjectDocuments.filter((d) =>
                    ['completed', 'approved'].includes((d.status || '').trim().toLowerCase())
                )
                const latestDocTime = completedDocs.length > 0
                    ? Math.max(...completedDocs.map((d) => new Date(d.processedAt || d.createdAt || d.updatedAt || 0).getTime()))
                    : 0
                if (latestDocTime > 0 && t >= latestDocTime - 5000) {
                    start = t
                }
            }
        }
        recordSynthesisStartTime(activeProjectId, start)
    }, [
        isAnySynthesisRunning,
        activeProjectId,
        synthesisStartTimestamps,
        activeProjectSynthesis?.createdAt,
        activeProjectDocuments,
        recordSynthesisStartTime,
    ])

    const [synthesisNowTimestamp, setSynthesisNowTimestamp] = useState(() => Date.now())
    useEffect(() => {
        if (!isAnySynthesisRunning) return
        const timer = setInterval(() => setSynthesisNowTimestamp(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [isAnySynthesisRunning])

    const currentSynthesisElapsedSeconds = useMemo(() => {
        if (!isAnySynthesisRunning) return 0
        const start = synthesisStartTimestamps[activeProjectId]
        if (!start) return 0
        return Math.max(0, Math.floor((synthesisNowTimestamp - start) / 1000))
    }, [isAnySynthesisRunning, synthesisStartTimestamps, activeProjectId, synthesisNowTimestamp])

    const [selectedBatchDocIndex, setSelectedBatchDocIndex] = useState<number>(0)
    const [userHasNavigatedBatchDocs, setUserHasNavigatedBatchDocs] = useState(false)
    const [pendingTargetDocFileName, setPendingTargetDocFileName] = useState<string | null>(null)

    // Sync selectedBatchDocIndex when a target document is requested via handleEvalDocSelect
    useEffect(() => {
        if (!pendingTargetDocFileName || latestBatchRows.length === 0) return

        // Verify latestBatchRows actually belong to the current activeProjectId before trying to match
        const sampleRow = latestBatchRows[0]
        if (sampleRow && !isRowMatchingProject(sampleRow, activeProjectId, projectSummaries)) {
            return
        }

        const normTarget = pendingTargetDocFileName.toLowerCase().trim()
        const targetClean = normTarget.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/g, '')

        const idx = latestBatchRows.findIndex((row) => {
            const fn = (row.fileName || (row as any).originalFilename || '').toLowerCase().trim()
            const fnClean = fn.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/g, '')
            return (
                fn === normTarget ||
                fn.includes(normTarget) ||
                normTarget.includes(fn) ||
                (targetClean.length > 2 && fnClean.length > 2 && (fnClean.includes(targetClean) || targetClean.includes(fnClean)))
            )
        })

        if (idx >= 0) {
            setSelectedBatchDocIndex(idx)
            setUserHasNavigatedBatchDocs(true)
        } else {
            setSelectedBatchDocIndex(0)
        }

        setPendingTargetDocFileName(null)
    }, [pendingTargetDocFileName, latestBatchRows, activeProjectId, projectSummaries])

    // Reset userHasNavigatedBatchDocs when active project or submission batch changes
    useEffect(() => {
        setUserHasNavigatedBatchDocs(false)
    }, [activeProjectId, activeSubmissionBatch?.id])

    // Auto-select the latest completed document (or active processing document) if the user hasn't manually overridden
    useEffect(() => {
        const targetList = activeProjectDocuments.length > 0 ? activeProjectDocuments : latestBatchRows
        if (userHasNavigatedBatchDocs || pendingTargetDocFileName || targetList.length === 0) return

        const lastCompletedIdx = findLastIndex(targetList, (doc: SubmissionHistoryItem) => (doc.status || '').trim().toLowerCase() === 'completed')
        const firstProcessingIndex = targetList.findIndex((doc: SubmissionHistoryItem) => isActiveSubmissionStatus(doc.status))
        const targetIdx = lastCompletedIdx !== -1 ? lastCompletedIdx : (firstProcessingIndex !== -1 ? firstProcessingIndex : 0)

        setSelectedBatchDocIndex((prev) => (prev !== targetIdx ? targetIdx : prev))
    }, [activeProjectDocuments, latestBatchRows, userHasNavigatedBatchDocs, pendingTargetDocFileName])

    const activeDocList = activeProjectDocuments.length > 0 ? activeProjectDocuments : latestBatchRows
    const safeBatchDocIndex = Math.min(Math.max(0, selectedBatchDocIndex), Math.max(0, activeDocList.length - 1))

    const displayedSubmissionRow = activeDocList[safeBatchDocIndex] ?? activeProjectDocuments[0] ?? submissionHistory[0]
    const liveSubmittedRow = displayedSubmissionRow

    const webhookResponse = useMemo(() => {
        if (!submitResponse) return null
        return submitResponse
    }, [submitResponse])

    const displayedSubmitStatus = displayedSubmissionRow?.status ?? (webhookResponse as any)?.status ?? (submitLoading ? 'queued' : '')
    const displayedSubmitRowId = displayedSubmissionRow ? String(displayedSubmissionRow.id) : ((webhookResponse as any)?.id ? String((webhookResponse as any).id) : 'Pending')
    const displayedSubmitReceivedAt = displayedSubmissionRow?.receivedAt ?? (webhookResponse as any)?.receivedAt ?? (webhookResponse as any)?.createdAt ?? ''
    const displayedSubmitTrafficLight = displayedSubmissionRow?.trafficLight ?? ''
    const displayedSubmitRiskLevel = displayedSubmissionRow?.riskLevel ?? ''
    const displayedSubmitCategory = displayedSubmissionRow?.documentType ?? ''
    const displayedSubmitConfidence = displayedSubmissionRow?.aiConfidence ?? ''
    const displayedSubmitVariance = ''
    const displayedSubmitValuationCurrency = displayedSubmissionRow?.valuationCurrency ?? 'USD'
    const displayedSubmitAiSummary = displayedSubmissionRow?.aiSummary ?? ''
    const liveSubmitInsight = displayedSubmissionRow ? getAiSubmissionViewModel(displayedSubmissionRow) : null
    const liveSubmitCitations = useMemo(() => liveSubmitInsight?.citations ?? [], [liveSubmitInsight])
    const submitEnvironment = activeHistoryEnvironment

    const highPriorityCount = diligenceFindings.filter((f) => f.severity === 'Critical' || f.severity === 'High').length
    const validatedCount = Object.values(projectChecklistById).filter((item: any) => item?.completed).length

    const batchInProgressNotificationId = useRef<string | null>(null)
    const synthesisInProgressNotificationProjectId = useRef<string | null>(null)

    useEffect(() => {
        if (!activeSubmissionBatch || activeBatchExpectedCount === 0) return
        if (activeBatchFinishedCount < activeBatchExpectedCount && activeBatchProcessingCount > 0) {
            if (batchInProgressNotificationId.current === activeSubmissionBatch.id) return
            batchInProgressNotificationId.current = activeSubmissionBatch.id
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Document batch is processing', { body: `All ${activeBatchExpectedCount} documents have reached processing. Analysis is still running.` })
            }
        }
    }, [activeBatchExpectedCount, activeBatchFinishedCount, activeBatchProcessingCount, activeSubmissionBatch])

    useEffect(() => {
        if (!activeSubmissionBatch || activeBatchExpectedCount === 0) return
        if (activeBatchFinishedCount < activeBatchExpectedCount) {
            batchInProgressNotificationId.current = activeSubmissionBatch.id
            return
        }
        if (batchInProgressNotificationId.current !== activeSubmissionBatch.id) return
        batchInProgressNotificationId.current = null
        playCompletionSound()
        const title = 'Document batch complete'
        const description = `${activeBatchFinishedCount}/${activeBatchExpectedCount} documents have reached a final status.`
        addToast({ title, description, type: 'success' })
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: description })
        }
        setNotifications(prev => [{ id: `batch-${Date.now()}`, type: 'document_processed', title, description, timestamp: new Date(), read: false }, ...prev])
    }, [activeBatchExpectedCount, activeBatchFinishedCount, activeSubmissionBatch])

    useEffect(() => {
        if (isCurrentProjectAwaitingSynthesis) {
            synthesisInProgressNotificationProjectId.current = activeProjectId
            return
        }
        if (synthesisInProgressNotificationProjectId.current !== activeProjectId || !activeProjectSynthesisSucceeded) return
        synthesisInProgressNotificationProjectId.current = null
        playCompletionSound()
        const title = 'Project synthesis complete'
        const description = 'Your due diligence synthesis is ready to review.'
        addToast({ title, description, type: 'success' })
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: description })
        }
        setNotifications(prev => [{ id: `synth-${Date.now()}`, type: 'synthesis_complete', title, description, timestamp: new Date(), read: false }, ...prev])
    }, [activeProjectId, activeProjectSynthesisSucceeded, isCurrentProjectAwaitingSynthesis])

    const enableDesktopNotifications = async () => {
        playCompletionSound()
        if (!('Notification' in window)) { setDesktopNotificationPermission('unsupported'); return }
        const permission = await Notification.requestPermission()
        setDesktopNotificationPermission(permission)
    }

    useEffect(() => {
        function handleCtrlK(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                setCommandPaletteOpen(prev => !prev)
            }
        }
        window.addEventListener('keydown', handleCtrlK)
        return () => window.removeEventListener('keydown', handleCtrlK)
    }, [setCommandPaletteOpen])

    useEffect(() => {
        function handleCtrlShiftP(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
                e.preventDefault()
                setIsProjectsPanelOpen(prev => !prev)
            }
        }
        window.addEventListener('keydown', handleCtrlShiftP)
        return () => window.removeEventListener('keydown', handleCtrlShiftP)
    }, [setIsProjectsPanelOpen])

    useEffect(() => {
        function handleGlobalEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                if (activeEvidence) setActiveEvidence(null)
                if (isWalkthroughModalOpen) setIsWalkthroughModalOpen(false)
                if (isReportIssueOpen) setIsReportIssueOpen(false)
                if (isExportModalOpen) setIsExportModalOpen(false)
                if (isApiKeyModalOpen) setIsApiKeyModalOpen(false)
                if (isBatchDrawerOpen) setIsBatchDrawerOpen(false)
                if (isProjectsPanelOpen) setIsProjectsPanelOpen(false)
                if (isFaqSidebarOpen) setIsFaqSidebarOpen(false)
                if (isShortcutsOpen) setIsShortcutsOpen(false)
                if (commandPaletteOpen) setCommandPaletteOpen(false)
            }
        }
        window.addEventListener('keydown', handleGlobalEscape)
        return () => window.removeEventListener('keydown', handleGlobalEscape)
    }, [
        activeEvidence,
        commandPaletteOpen,
        isApiKeyModalOpen,
        isBatchDrawerOpen,
        isExportModalOpen,
        isFaqSidebarOpen,
        isProjectsPanelOpen,
        isReportIssueOpen,
        isShortcutsOpen,
        isWalkthroughModalOpen,
        setActiveEvidence,
        setCommandPaletteOpen,
        setIsApiKeyModalOpen,
        setIsBatchDrawerOpen,
        setIsExportModalOpen,
        setIsFaqSidebarOpen,
        setIsProjectsPanelOpen,
        setIsReportIssueOpen,
        setIsShortcutsOpen,
        setIsWalkthroughModalOpen,
    ])

    const handleCreateProject = () => {
        const usedProjectIds = projectSummaries.map((project: any) => project.projectId || project.projectKey)

        setSelectedProjectKey('new')
        setBatchSubmissionMessage('')
        setDealName('')
        setProjectId(createUnusedProjectId(usedProjectIds))
        setProjectStage('post-loi')
        setDocumentType('auto-detect')
        setSubmissionNotes('')
    }

    const handleManualDealComplete = useCallback((
        newDealModel: DealModel,
        newSynthesis: ProjectSynthesisItem,
        formData: ManualDealFormData
    ) => {
        const submissionRow: SubmissionHistoryItem = {
            id: Math.floor(Math.random() * 900000) + 100000,
            projectId: newDealModel.projectId,
            projectName: formData.dealName,
            dealName: formData.dealName,
            fileName: `${formData.dealName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Quick_Intake.json`,
            fileType: 'application/json',
            fileSize: 2048,
            documentType: 'Deal Questionnaire / Manual Intake',
            status: 'COMPLETE',
            requestID: `manual-${newDealModel.projectId}`,
            receivedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            extractedData: {
                companyName: formData.companyName,
                industry: formData.industry,
                askingPrice: formData.askingPrice,
                revenue: formData.annualRevenue,
                ebitda: newDealModel.ebitda,
                disallowedAddBacks: formData.disallowedAddBacks,
                notes: formData.generalNotes,
            },
            intakeSource: 'manual_questionnaire',
        }

        setManualSubmissions((prev) => {
            const next = [submissionRow, ...prev.filter(r => r.projectId !== newDealModel.projectId)]
            try { localStorage.setItem('mergeworks_manual_submissions', JSON.stringify(next)) } catch {}
            return next
        })

        setManualSyntheses((prev) => {
            const next = [newSynthesis, ...prev.filter(s => s.projectId !== newDealModel.projectId)]
            try { localStorage.setItem('mergeworks_manual_syntheses', JSON.stringify(next)) } catch {}
            return next
        })

        // Save deal model to state/store
        void triggerSaveDealModel(newDealModel)

        // Switch workspace and project view
        setDealName(formData.dealName)
        setAskingPrice(String(formData.askingPrice))
        setProjectId(newDealModel.projectId)
        setSelectedProjectKey(newDealModel.projectId)
        setActiveViewProjectId(newDealModel.projectId)
        setActiveWorkspaceTab('overview')

        if (typeof window !== 'undefined') {
            window.localStorage.setItem('mergeworks.activeProjectKey', newDealModel.projectId)
            window.location.hash = '#overview'
            window.setTimeout(() => {
                const el = document.getElementById('deal-overview') || document.querySelector('[data-deal-overview]')
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 50)
        }
    }, [triggerSaveDealModel, setDealName, setAskingPrice, setProjectId, setSelectedProjectKey, setActiveViewProjectId, setActiveWorkspaceTab])

    const handlePortfolioProjectSelect = (projectKey: string, targetTab: WorkspaceTab = 'synthesis') => {
        setActiveViewProjectId(projectKey)
        setActiveWorkspaceTab(targetTab)
        setActiveSubmissionBatch(null)
        setUserHasNavigatedBatchDocs(false)

        if (typeof window !== 'undefined') {
            window.localStorage.setItem('mergeworks.activeProjectKey', projectKey)
        }

        window.setTimeout(() => {
            const elId = targetTab === 'diligence' ? 'diligence-workspace' : 'project-synthesis'
            document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 0)
    }

    const handleEvalProjectSelect = (targetIdentifier: string, targetTab: WorkspaceTab = 'synthesis') => {
        const raw = (targetIdentifier || '').toLowerCase().trim()

        let matchingProject = projectSummaries.find((p: any) => {
            const pk = (p.projectKey || '').toLowerCase()
            const pid = (p.projectId || '').toLowerCase()
            const pn = (p.projectName || '').toLowerCase()
            const cn = (p.companyName || '').toLowerCase()
            return pk === raw || pid === raw || pn === raw || cn === raw
        })

        if (!matchingProject) {
            matchingProject = projectSummaries.find((p: any) => {
                const pk = (p.projectKey || '').toLowerCase()
                const pn = (p.projectName || '').toLowerCase()
                const cn = (p.companyName || '').toLowerCase()
                return (pk && raw.includes(pk)) || (pn && raw.includes(pn)) || (cn && raw.includes(cn)) || (pk && pk.includes(raw)) || (pn && pn.includes(raw))
            })
        }

        if (!matchingProject) {
            let fallbackKey = ''
            if (raw.includes('werkheiser') || raw.includes('business 1')) {
                fallbackKey = 'werkheiser-commercial-cleaning'
            } else if (raw.includes('iron tree') || raw.includes('irontree') || raw.includes('business 2') || raw.includes('cyber')) {
                fallbackKey = 'irontree-tree-service'
            } else if (raw.includes('turnkey') || raw.includes('business 3')) {
                fallbackKey = 'turnkey-logistics-group'
            } else if (raw.includes('conversionxl') || raw.includes('cxl') || raw.includes('business 4')) {
                fallbackKey = 'cxl-digital-agency'
            } else if (raw.includes('medspa') || raw.includes('medical spa') || raw.includes('business 5')) {
                fallbackKey = 'medspa-wellness-clinic'
            } else if (raw.includes('widgetco') || raw.includes('forensic')) {
                fallbackKey = 'widgetco-forensic-suite'
            } else if (raw.includes('mergeworks') || raw.includes('testing')) {
                fallbackKey = 'mergeworks-testing-suite'
            }

            if (fallbackKey) {
                matchingProject = projectSummaries.find((p: any) => p.projectKey === fallbackKey || p.projectId === fallbackKey)
            }
        }

        const resolvedProjectKey = matchingProject?.projectKey || matchingProject?.projectId || targetIdentifier
        handlePortfolioProjectSelect(resolvedProjectKey, targetTab)
    }

    const handleEvalDocSelect = (docFileName: string, targetIdentifier?: string) => {
        handleEvalProjectSelect(targetIdentifier || docFileName || 'werkheiser-commercial-cleaning', 'diligence')
        setUserHasNavigatedBatchDocs(true)
        setPendingTargetDocFileName(docFileName)
        setActiveEvidence(null)

        window.setTimeout(() => {
            const elem = document.getElementById('diligence-workspace') || document.getElementById('deal-workspace')
            elem?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 50)
    }

    const handleExcludeDocument = async (requestID: string) => {
        if (!requestID || !window.confirm('Exclude this document from the project checklist and future synthesis? Its n8n record will be retained for audit.')) return
        const result = await triggerSubmissionConsideration({ requestID, action: 'nonconsidered', environment: activeHistoryEnvironment }).result
        if (result) await handleRefreshHistory(activeHistoryEnvironment)
    }

    const handleAuditProjectOpen = (targetProjectId: string) => {
        const project = projectSummaries.find((candidate: any) => (candidate.projectId || candidate.projectKey) === targetProjectId)
        const targetKey = project?.projectKey || targetProjectId
        setActiveViewProjectId(targetKey)
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('mergeworks.activeProjectKey', targetKey)
        }
        setActiveWorkspaceTab('documents')
        window.setTimeout(() => {
            document.getElementById('project-portfolio')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 0)
    }

    const handleOpenProjectSynthesis = (targetProjectId: string) => {
        const project = projectSummaries.find((candidate: any) => (candidate.projectId || candidate.projectKey) === targetProjectId)
        const targetKey = project?.projectKey || targetProjectId
        setActiveViewProjectId(targetKey)
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('mergeworks.activeProjectKey', targetKey)
        }
        setActiveWorkspaceTab('synthesis')
        window.setTimeout(() => {
            document.getElementById('project-synthesis')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 0)
    }

    const handleIncludeDocument = async (requestID: string) => {
        if (!requestID || !window.confirm('Include this document in the project checklist and future synthesis again?')) return
        const result = await triggerSubmissionConsideration({ requestID, action: 'considered', environment: activeHistoryEnvironment }).result
        if (result) await handleRefreshHistory(activeHistoryEnvironment)
    }

    const handleRunSynthesis = async () => {
        const sourceDocument = submissionHistory.find((row) => getProjectKey(row) === activeProjectId
            && row.isConsidered
            && (row.status.trim().toLowerCase() === 'completed' || row.status.trim().toLowerCase() === 'approved'))
        if (!sourceDocument) {
            setBatchSubmissionMessage('A completed document with saved analysis is required before synthesis can run.')
            return
        }
        if (!window.confirm('Run a new project synthesis using the currently completed, included documents? This does not re-upload or reprocess files.')) return
        setIsManualSynthesisRunning(true)
        recordSynthesisStartTime(activeProjectId, Date.now())
        setBatchSubmissionMessage('Starting a new project synthesis from the completed documents…')
        try {
            const userOpenAiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_openai_key') || '') : ''
            const userAnthropicApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_anthropic_key') || '') : ''
            const userGeminiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_gemini_key') || '') : ''
            const userDeepseekApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_deepseek_key') || '') : ''
            const modelPipeline = getEffectiveModelPipeline()

            const response = await fetch('/api/diligence/run-synthesis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: activeProjectId,
                    environment: activeHistoryEnvironment,
                    userOpenAiApiKey,
                    userAnthropicApiKey,
                    userGeminiApiKey,
                    userDeepseekApiKey,
                    synthPrimaryModel: modelPipeline.synthPrimary,
                    synthBackupModel: modelPipeline.synthBackup,
                })
            })
            if (!response.ok) throw new Error('Failed to trigger project synthesis')
            setBatchSubmissionMessage('Project synthesis successfully triggered! The consolidator is now running…')
            await Promise.all([
                handleRefreshHistory(activeHistoryEnvironment),
                triggerProjectSynthesis({ environment: activeHistoryEnvironment }, { skipCache: true }).result,
            ])
        } catch (err) {
            setIsManualSynthesisRunning(false)
            clearSynthesisStartTime(activeProjectId)
            setBatchSubmissionMessage(err instanceof Error ? err.message : 'Unable to start synthesis')
        }
    }

    const [runningSynthesisWithoutLoi, setRunningSynthesisWithoutLoi] = useState(false)
    const [isRerunningBatch, setIsRerunningBatch] = useState(false)

    const handleRunSynthesisWithoutLoi = async () => {
        const projectDocs = submissionHistory.filter((row) => getProjectKey(row) === activeProjectId)
        const loiDoc = projectDocs.find((d) => {
            const name = (d.fileName || d.dealName || '').toLowerCase()
            return (name.includes('loi') || name.includes('letter_of_intent') || name.includes('letter-of-intent'))
                && d.isConsidered
        })
        if (!loiDoc) {
            setBatchSubmissionMessage('No LOI document found in this project to exclude.')
            return
        }
        const loiRequestId = loiDoc.requestID || String(loiDoc.id || '')
        if (!loiRequestId) {
            setBatchSubmissionMessage('LOI document has no request ID — cannot exclude.')
            return
        }

        if (!window.confirm(
            `Run a new Pre-LOI blind discovery synthesis excluding "${loiDoc.fileName || 'LOI'}"?\n\n` +
            `This temporarily removes the LOI from the synthesis scope, runs the consolidator on the remaining ${projectDocs.length - 1} documents, ` +
            `then automatically re-includes the LOI. Cost depends on document count and context size.`
        )) return

        setRunningSynthesisWithoutLoi(true)
        setIsManualSynthesisRunning(true)
        recordSynthesisStartTime(activeProjectId, Date.now())
        setBatchSubmissionMessage('Excluding LOI for pre-LOI synthesis run…')

        try {
            await triggerSubmissionConsideration({ requestID: loiRequestId, action: 'nonconsidered', environment: activeHistoryEnvironment }).result

            await new Promise(r => setTimeout(r, 1000))

            const userOpenAiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_openai_key') || '') : ''
            const userAnthropicApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_anthropic_key') || '') : ''
            const userGeminiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_gemini_key') || '') : ''
            const userDeepseekApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_deepseek_key') || '') : ''
            const modelPipeline = getEffectiveModelPipeline()

            const response = await fetch('/api/diligence/run-synthesis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: activeProjectId,
                    environment: activeHistoryEnvironment,
                    userOpenAiApiKey,
                    userAnthropicApiKey,
                    userGeminiApiKey,
                    userDeepseekApiKey,
                    synthPrimaryModel: modelPipeline.synthPrimary,
                    synthBackupModel: modelPipeline.synthBackup,
                })
            })
            if (!response.ok) throw new Error('Failed to trigger synthesis webhook')

            setBatchSubmissionMessage('Pre-LOI synthesis triggered! Re-including LOI in ~5s…')

            setTimeout(async () => {
                try {
                    await triggerSubmissionConsideration({ requestID: loiRequestId, action: 'considered', environment: activeHistoryEnvironment }).result
                    setBatchSubmissionMessage('LOI re-included. Pre-LOI synthesis is running — refresh in ~30s to see results.')
                } catch {
                    setBatchSubmissionMessage('Pre-LOI synthesis running. Please manually re-include the LOI document after results appear.')
                }
                setRunningSynthesisWithoutLoi(false)
                await Promise.all([
                    handleRefreshHistory(activeHistoryEnvironment),
                    triggerProjectSynthesis({ environment: activeHistoryEnvironment }, { skipCache: true }).result,
                ])
            }, 5000)
        } catch (err) {
            await triggerSubmissionConsideration({ requestID: loiRequestId, action: 'considered', environment: activeHistoryEnvironment }).result.catch(() => {})
            setRunningSynthesisWithoutLoi(false)
            setBatchSubmissionMessage(err instanceof Error ? err.message : 'Unable to run pre-LOI synthesis')
        }
    }

    const handleRerunLatestBatch = async () => {
        const batchDocs = activeBatchRows.length > 0 ? activeBatchRows : activeProjectDocuments
        const validDocs = batchDocs.filter(d => Boolean(d.requestID))
        if (validDocs.length === 0) {
            setBatchSubmissionMessage('No documents with valid request IDs found in the batch.')
            return
        }
        if (!window.confirm(`Re-run all ${validDocs.length} documents in this batch?\n\nEach document will be re-extracted in real-time. Project synthesis will trigger automatically once all documents finish.`)) return

        setIsRerunningBatch(true)
        setBatchSubmissionMessage(`Queueing batch re-run for ${validDocs.length} documents…`)
        setActiveSubmissionBatch({
            id: activeProjectId,
            expectedDocumentCount: validDocs.length,
            environment: activeHistoryEnvironment,
            startedAt: Date.now(),
        })

        const userOpenAiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_openai_key') || '') : ''
        const userAnthropicApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_anthropic_key') || '') : ''
        const userGeminiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_gemini_key') || '') : ''
        const userDeepseekApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_deepseek_key') || '') : ''
        const modelPipeline = getEffectiveModelPipeline()

        try {
            await Promise.all(
                validDocs.map(doc =>
                    fetch('/api/diligence/retry-failed-document', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            requestID: doc.requestID,
                            environment: activeHistoryEnvironment,
                            userOpenAiApiKey,
                            userAnthropicApiKey,
                            userGeminiApiKey,
                            userDeepseekApiKey,
                            docPrimaryModel: modelPipeline.docPrimary,
                            docBackupModel: modelPipeline.docBackup,
                            synthPrimaryModel: modelPipeline.synthPrimary,
                            synthBackupModel: modelPipeline.synthBackup,
                        }),
                    }).catch(() => null)
                )
            )
            setBatchSubmissionMessage(`Batch re-run active (${validDocs.length} documents). Extraction is running in parallel, and synthesis will automatically trigger once finished.`)
            await triggerSubmissionHistory({ environment: activeHistoryEnvironment }, { skipCache: true }).result
        } catch (err) {
            setBatchSubmissionMessage(err instanceof Error ? err.message : 'Failed to re-run batch')
        } finally {
            setIsRerunningBatch(false)
        }
    }

    const handleRerunAllProjectDocuments = async (targetProjectId?: string) => {
        const projId = targetProjectId || activeProjectId
        const projectDocs = submissionHistory.filter(r => (getProjectKey(r) === projId || r.projectId === projId) && r.isConsidered !== false)
        const validDocs = projectDocs.filter(d => Boolean(d.requestID))
        if (validDocs.length === 0) {
            setBatchSubmissionMessage('No documents with valid request IDs found in this project.')
            return
        }
        if (!window.confirm(`Re-run all ${validDocs.length} documents in this project?\n\nEach document will be re-extracted in real-time. Project synthesis will automatically consolidate once all documents finish.`)) return

        setIsRerunningBatch(true)
        setBatchSubmissionMessage(`Queueing re-run for all ${validDocs.length} documents in project…`)
        setActiveSubmissionBatch({
            id: projId,
            expectedDocumentCount: validDocs.length,
            environment: activeHistoryEnvironment,
            startedAt: Date.now(),
        })

        const userOpenAiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_openai_key') || '') : ''
        const userAnthropicApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_anthropic_key') || '') : ''
        const userGeminiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_gemini_key') || '') : ''
        const userDeepseekApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_deepseek_key') || '') : ''
        const modelPipeline = getEffectiveModelPipeline()

        try {
            await Promise.all(
                validDocs.map(doc =>
                    fetch('/api/diligence/retry-failed-document', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            requestID: doc.requestID,
                            environment: activeHistoryEnvironment,
                            userOpenAiApiKey,
                            userAnthropicApiKey,
                            userGeminiApiKey,
                            userDeepseekApiKey,
                            docPrimaryModel: modelPipeline.docPrimary,
                            docBackupModel: modelPipeline.docBackup,
                            synthPrimaryModel: modelPipeline.synthPrimary,
                            synthBackupModel: modelPipeline.synthBackup,
                        }),
                    }).catch(() => null)
                )
            )
            setBatchSubmissionMessage(`Re-running all ${validDocs.length} documents in project in real-time. Project synthesis will automatically consolidate once completed.`)
            await triggerSubmissionHistory({ environment: activeHistoryEnvironment }, { skipCache: true }).result
        } catch (err) {
            setBatchSubmissionMessage(err instanceof Error ? err.message : 'Failed to re-run project documents')
        } finally {
            setIsRerunningBatch(false)
        }
    }

    const handleRetryFailedDocument = async (requestID: string) => {
        const targetRow = submissionHistory.find((r) => r.requestID === requestID || String(r.id) === requestID)
        const targetProjectId = targetRow?.projectId || activeProjectId

        setActiveWorkspaceTab('diligence')
        window.setTimeout(() => {
            document.getElementById('deal-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 0)
        setRetryingRequestId(requestID)
        setBatchSubmissionMessage('')
        try {
            const userOpenAiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_openai_key') || '') : ''
            const userAnthropicApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_anthropic_key') || '') : ''
            const userGeminiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_gemini_key') || '') : ''
            const userDeepseekApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_deepseek_key') || '') : ''
            const modelPipeline = getEffectiveModelPipeline()

            const response = await fetch('/api/diligence/retry-failed-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestID,
                    environment: activeHistoryEnvironment,
                    userOpenAiApiKey,
                    userAnthropicApiKey,
                    userGeminiApiKey,
                    userDeepseekApiKey,
                    docPrimaryModel: modelPipeline.docPrimary,
                    docBackupModel: modelPipeline.docBackup,
                    synthPrimaryModel: modelPipeline.synthPrimary,
                    synthBackupModel: modelPipeline.synthBackup,
                }),
            })
            const body = await response.json() as { error?: string; status?: string }
            if (!response.ok) throw new Error(body.error || 'Unable to queue retry')

            if (targetProjectId) {
                setActiveSubmissionBatch({
                    id: targetProjectId,
                    expectedDocumentCount: 1,
                    environment: activeHistoryEnvironment,
                    startedAt: Date.now(),
                })
                setSelectedProjectKey(targetRow ? getProjectKey(targetRow) : targetProjectId)
            }

            setBatchSubmissionMessage('Retry queued. The existing document is being processed again in real-time.')
            await triggerSubmissionHistory({ environment: activeHistoryEnvironment }, { skipCache: true }).result
        } catch (err) {
            setBatchSubmissionMessage(err instanceof Error ? err.message : 'Unable to queue retry')
        } finally {
            setRetryingRequestId(null)
        }
    }

    const handleRequeueNewProject = (requestID?: string) => {
        const targetRow = requestID ? submissionHistory.find((r) => r.requestID === requestID || String(r.id) === requestID) : null
        handleCreateProject()
        if (targetRow) {
            setDealName(targetRow.dealName ? `${targetRow.dealName} (Retry)` : '')
            setDocumentType(targetRow.documentType || 'auto-detect')
            setSubmissionNotes(targetRow.submissionNotes || '')
        }
        setBatchSubmissionMessage('Pre-filled new project intake form. Drop your document file above to queue under a new project.')
        document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const handleStopBatch = async () => {
        const candidateRows = activeBatchRows.length > 0
            ? activeBatchRows
            : submissionHistory.filter((row) => {
                const isProjectMatch = (getProjectKey(row) === activeProjectId) || (row.projectId === activeProjectId)
                return isProjectMatch || isActiveSubmissionStatus(row.status)
            })

        const stoppableRequestIds = candidateRows
            .filter((row) => isActiveSubmissionStatus(row.status))
            .map((row) => row.requestID)
            .filter((reqId) => reqId.trim().length > 0)

        if (stoppableRequestIds.length === 0) {
            setBatchSubmissionMessage('No active documents are currently processing to stop.')
            return
        }

        if (!window.confirm(`Stop ${stoppableRequestIds.length} active document${stoppableRequestIds.length === 1 ? '' : 's'}? Completed documents will be kept, and synthesis will not run until you retry or re-queue documents.`)) return
        setIsStoppingBatch(true)
        try {
            const response = await fetch('/api/diligence/stop-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestIDs: stoppableRequestIds, environment: activeHistoryEnvironment }),
            })
            const body = await response.json() as { error?: string; stopped?: number }
            if (!response.ok) throw new Error(body.error || 'Unable to stop the active batch')
            setBatchSubmissionMessage(`Stopped ${body.stopped ?? stoppableRequestIds.length} active document${(body.stopped ?? stoppableRequestIds.length) === 1 ? '' : 's'}.`)
            setActiveSubmissionBatch((current) => current ? { ...current, stoppedAt: Date.now(), endedAt: Date.now() } : current)
            await handleRefreshHistory(activeHistoryEnvironment)
        } catch (err) {
            setBatchSubmissionMessage(err instanceof Error ? err.message : 'Unable to stop the active batch')
        } finally {
            setIsStoppingBatch(false)
        }
    }

    const handleStopSynthesis = async () => {
        if (!activeProjectId) return
        if (!window.confirm('Stop the current synthesis for this project? This marks the synthesis as stopped so you can retry or re-run it later.')) return
        setIsStoppingSynthesis(true)
        setIsManualSynthesisRunning(false)
        clearSynthesisStartTime(activeProjectId)
        try {
            const response = await fetch('/api/diligence/stop-synthesis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: activeProjectId, environment: activeHistoryEnvironment }),
            })
            const body = await response.json() as { error?: string }
            if (!response.ok) throw new Error(body.error || 'Unable to stop synthesis')
            setBatchSubmissionMessage('Synthesis marked as stopped. You can refresh, retry document analysis, or run synthesis again when ready.')
            await triggerProjectSynthesis({ environment: activeHistoryEnvironment }, { skipCache: true }).result
        } catch (err) {
            setBatchSubmissionMessage(err instanceof Error ? err.message : 'Unable to stop synthesis')
        } finally {
            clearSynthesisStartTime(activeProjectId)
            setIsStoppingSynthesis(false)
        }
    }

    const handleRefreshHistory = async (environment: SubmitEnvironment) => {
        setActiveHistoryEnvironment(environment)
        await triggerSubmissionHistory({ environment }, { skipCache: true }).result
        await triggerProjectSynthesis({ environment }, { skipCache: true }).result
    }

    const handleCancelSubmission = () => {
        setIsSubmittingFile(false)
        lastUploadAttemptAtRef.current = 0
        setBatchSubmissionMessage('Pipeline execution cancelled by user. You can modify files or re-queue at any time.')
    }

    const handleSubmit = async (environment: SubmitEnvironment) => {
        if (selectedFiles.length === 0) return

        if (isExampleMode && environment === 'production') {
            setDataSource('live')
        }

        const now = Date.now()
        if (isSubmittingFile || now - lastUploadAttemptAtRef.current < 10_000) {
            setBatchSubmissionMessage('Upload is already in progress or was just started. Wait a few seconds before submitting another batch so the same files are not queued twice.')
            return
        }
        lastUploadAttemptAtRef.current = now

        const refreshedHistory = await triggerSubmissionHistory({ environment }, { skipCache: true }).result
        const duplicateCheckRows = Array.isArray(refreshedHistory) ? refreshedHistory as SubmissionHistoryItem[] : submissionHistory
        const resolvedProjectId = projectId || suggestedProjectId
        const duplicateFileNames: string[] = []
        const selectedMetadataKeys = new Set<string>()
        const filesToQueue = selectedFiles.filter((file) => {
            const metadataKey = `${file.name.trim().toLowerCase()}::${file.size}`
            const isDuplicate = selectedMetadataKeys.has(metadataKey)
                || isDuplicateProjectDocument(file, resolvedProjectId, duplicateCheckRows)

            selectedMetadataKeys.add(metadataKey)
            if (isDuplicate) {
                duplicateFileNames.push(file.name)
                return false
            }

            return true
        })

        if (filesToQueue.length === 0) {
            playErrorSound()
            setBatchSubmissionMessage(`No documents were queued. ${duplicateFileNames.join(', ')} ${duplicateFileNames.length === 1 ? 'has' : 'have'} already been added to this project.`)
            return
        }

        if (environment === 'production' && desktopNotificationPermission === 'default') {
            void enableDesktopNotifications()
        }

        if (environment === 'production') {
            setActiveWorkspaceTab('diligence')
            window.setTimeout(() => {
                const target = document.getElementById('diligence-batch') || document.getElementById('deal-workspace')
                target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 60)
        }

        setIsSubmittingFile(true)
        setBatchSubmissionMessage('')

        try {
            const targetProjectId = (selectedProjectKey === 'new' || !projectId) ? (suggestedProjectId || `project-${Date.now().toString(36)}`) : projectId
            setSelectedProjectKey(targetProjectId)
            setProjectId(targetProjectId)
            setActiveViewProjectId(targetProjectId)
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('mergeworks.activeProjectKey', targetProjectId)
                window.localStorage.setItem('mergeworks.selectedProjectKey', targetProjectId)
            }

            const submissionBatchId = `batch-${now}-${Math.random().toString(36).substring(2, 7)}`
            const expectedBatchDocumentCount = filesToQueue.length
            const failedFileNames: string[] = []

            setActiveSubmissionBatch({
                id: submissionBatchId,
                expectedDocumentCount: expectedBatchDocumentCount,
                environment,
                startedAt: now,
            })

            const CONCURRENCY = 3
            for (let i = 0; i < filesToQueue.length; i += CONCURRENCY) {
                const chunk = filesToQueue.slice(i, i + CONCURRENCY)
                await Promise.all(chunk.map(async (file) => {
                    try {
                        let storageFileUrl = ''
                        let storagePath = ''
                        try {
                            const uploadRes = await uploadDocumentToSupabaseStorage({
                                file,
                                projectId: targetProjectId,
                            })
                            storageFileUrl = uploadRes.storageFileUrl
                            storagePath = uploadRes.storagePath
                        } catch (storageErr) {
                            console.warn('Direct storage upload failed, falling back to base64 inline:', storageErr)
                        }

                        // For files <= 3.5MB, keep base64 for n8n Google Drive compatibility.
                        // For files > 3.5MB, omit base64 to prevent Vercel 4.5MB request cap (n8n/Supabase uses storageFileUrl).
                        let fileBase64 = ''
                        if (file.size <= 3.5 * 1024 * 1024) {
                            fileBase64 = await readFileAsBase64(file)
                        }

                        const userOpenAiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_openai_key') || '') : ''
                        const userAnthropicApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_anthropic_key') || '') : ''
                        const userGeminiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_gemini_key') || '') : ''
                        const userDeepseekApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_deepseek_key') || '') : ''
                        const modelPipeline = getEffectiveModelPipeline()

                        const result = await triggerSubmitDealPacket({
                            environment,
                            fileName: file.name,
                            fileSize: file.size,
                            fileType: file.type || 'application/octet-stream',
                            fileBase64,
                            storageFileUrl,
                            storagePath,
                            dealName: dealName || suggestedProjectName,
                            companyName: dealName || suggestedProjectName,
                            workstream: '',
                            submissionNotes,
                            projectId: targetProjectId,
                            projectStage,
                            documentType,
                            submissionBatchId,
                            expectedBatchDocumentCount,
                            userOpenAiApiKey,
                            userAnthropicApiKey,
                            userGeminiApiKey,
                            userDeepseekApiKey,
                            docPrimaryModel: modelPipeline.docPrimary,
                            docBackupModel: modelPipeline.docBackup,
                            synthPrimaryModel: modelPipeline.synthPrimary,
                            synthBackupModel: modelPipeline.synthBackup,
                        }).result

                        if (result?.status === 'duplicate') {
                            duplicateFileNames.push(file.name)
                        }
                    } catch {
                        failedFileNames.push(file.name)
                    }
                }))
            }

            const queuedFileCount = expectedBatchDocumentCount - failedFileNames.length - duplicateFileNames.length
            const submissionMessages: string[] = []
            if (duplicateFileNames.length > 0) {
                submissionMessages.push(`${duplicateFileNames.join(', ')} ${duplicateFileNames.length === 1 ? 'was' : 'were'} not queued because ${duplicateFileNames.length === 1 ? 'this document has' : 'these documents have'} already been added to this project.`)
            }
            if (failedFileNames.length > 0) {
                submissionMessages.push(
                    queuedFileCount > 0
                        ? `${failedFileNames.length} file${failedFileNames.length === 1 ? '' : 's'} could not be queued (${failedFileNames.join(', ')}). Re-upload the failed file${failedFileNames.length === 1 ? '' : 's'} before relying on synthesis.`
                        : `No new files could be queued (${failedFileNames.join(', ')}). Please try the non-duplicate files again.`
                )
            }
            if (submissionMessages.length > 0) {
                if (duplicateFileNames.length > 0) playErrorSound()
                setBatchSubmissionMessage(submissionMessages.join(' '))
            }

            setSubmissionNotes('')
            setDocumentType('auto-detect')
            const resolvedKey = projectId || suggestedProjectId
            setSelectedProjectKey(resolvedKey)
            setSelectedFiles([])
            if (dealName.length === 0) setDealName(suggestedProjectName)
            if (projectId.length === 0) setProjectId(suggestedProjectId)
            const currentUser = getStoredAuth()
            if (currentUser?.email && resolvedKey) {
                claimProject(resolvedKey, currentUser.email)
            }
            await handleRefreshHistory(environment)
        } finally {
            setIsSubmittingFile(false)
        }
    }

    const openFindingEvidence = (finding: any) => {
        setActiveEvidence({
            title: finding.summary,
            sourceFile: finding.owner,
            sourceLocation: finding.sourceCitation,
            excerpt: finding.sourceExcerpt,
            status: finding.findingType,
            provenance: 'Retool Legacy',
        })
    }

    const hasDuplicateSubmissionMessage = batchSubmissionMessage.toLowerCase().includes('duplicate') || batchSubmissionMessage.toLowerCase().includes('already been added')

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Floating In-App Toast Overlay */}
            {activeToasts.length > 0 && (
                <div className="fixed top-16 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
                    {activeToasts.map((toast) => (
                        <div
                            key={toast.id}
                            className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-background/95 border border-primary/30 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-3 duration-300"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    {toast.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{toast.description}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveToasts(prev => prev.filter(t => t.id !== toast.id))}
                                className="text-muted-foreground hover:text-foreground text-xs p-1 rounded-md"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div
                style={{
                    paddingLeft: !isTocCollapsed ? `${tocWidth + 8}px` : undefined,
                    paddingRight: '56px',
                }}
            >
                <WorkspaceHeader
                    isExampleMode={isExampleMode}
                    activeProjectDocuments={activeProjectDocuments}
                    setIsProjectsPanelOpen={setIsProjectsPanelOpen}
                    projectSummaries={projectSummaries}
                    currentTheme={currentTheme}
                    setCurrentTheme={setCurrentTheme}
                    setStoredTheme={setStoredTheme}
                    hydratedDealModel={hydratedDealModel}
                    activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                    dealName={effectiveDealName}
                    suggestedProjectName={suggestedProjectName}
                    notifications={notifications}
                    handleMarkNotificationRead={handleMarkNotificationRead}
                    handleMarkAllNotificationsRead={handleMarkAllNotificationsRead}
                    handleClearNotifications={handleClearNotifications}
                    setActiveWorkspaceTab={setActiveWorkspaceTab}
                    setIsApiKeyModalOpen={setIsApiKeyModalOpen}
                    isActiveSubmissionStatus={isActiveSubmissionStatus}
                    onReturnToLanding={onReturnToLanding}
                    onOpenWalkthrough={() => setIsWalkthroughModalOpen(true)}
                    onOpenIntake={() => {
                        const intakeEl = document.querySelector('[data-project-intake]') || document.getElementById('deal-intake')
                        if (intakeEl) {
                            intakeEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        } else {
                            setActiveWorkspaceTab('documents')
                            setTimeout(() => {
                                document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }, 100)
                        }
                    }}
                    resumeState={walkthrough.resumeState}
                    onResumeTour={handleResumeTour}
                    activeProjectId={activeProjectId}
                    activeWorkspaceTab={activeWorkspaceTab}
                    onOpenSearch={() => setCommandPaletteOpen(true)}
                    onOpenReportIssue={() => setIsReportIssueOpen(true)}
                />

                <div className="mx-auto max-w-[1440px] px-4 pb-2 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-1.5 text-xs text-muted-foreground shadow-2xs">
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-primary shrink-0" />
                            <span>
                                <strong className="font-semibold text-foreground">Data Source:</strong> {isExampleMode ? 'Example Mode (Mock Data)' : 'Live n8n Mode (Production Engine)'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                                size="sm"
                                variant={isExampleMode ? 'default' : 'outline'}
                                className="h-7 px-2.5 text-xs cursor-pointer"
                                onClick={() => setDataSource('mock')}
                            >
                                Example Mode
                            </Button>
                            <Button
                                size="sm"
                                variant={!isExampleMode ? 'default' : 'outline'}
                                className="h-7 px-2.5 text-xs cursor-pointer"
                                onClick={() => setDataSource('live')}
                            >
                                Live n8n
                            </Button>
                        </div>
                    </div>
                </div>

            <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
                {(() => {
                    const topMeasured = sumMeasuredCost({
                        documents: activeProjectDocuments,
                        synthesis: activeProjectSynthesis,
                    })
                    const topActiveDocCount = activeProjectDocuments.length > 0 ? activeProjectDocuments.length : 21
                    const topMatchingSyntheses = (visibleProjectSyntheses || []).filter(s =>
                        s.projectId === activeProjectId ||
                        String(s.id) === activeProjectId ||
                        (Boolean(s.projectId) && Boolean(activeProjectId) && (s.projectId.includes(activeProjectId) || activeProjectId.includes(s.projectId)))
                    )
                    const topActiveSynthRuns = topMatchingSyntheses.length > 0 ? topMatchingSyntheses.length : 2

                    const topTotalSynthCost = topMatchingSyntheses.reduce((acc, s) => acc + (typeof s.costUsd === 'number' && s.costUsd > 0 ? s.costUsd : (s.totalTokens ? s.totalTokens * 0.0000075 : 0.069)), 0)
                    const topDocCost = topMeasured.docCost > 0 ? topMeasured.docCost : topActiveDocCount * 0.055
                    const topSynthCost = topTotalSynthCost > 0 ? topTotalSynthCost : topMeasured.synthesisCost > 0 ? topMeasured.synthesisCost : topActiveSynthRuns * 0.12
                    const topTotalDealCost = topDocCost + topSynthCost

                    return (
                        <DealHealthKPIs
                            synthesis={activeProjectSynthesis ?? undefined}
                            model={hydratedDealModel}
                            impact={activeProjectImpact}
                            documentsCount={activeProjectDocuments.length}
                            docCost={topDocCost}
                            totalCost={topTotalDealCost}
                            portfolioTotalCost={portfolioAllTimeCost}
                            todayStats={todayPipelineStats}
                            projectSummaries={projectSummaries}
                        />
                    )
                })()}
            </div>

            <main className="mx-auto max-w-[1440px] space-y-8 px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
                <div id="upload-section" className="scroll-mt-6" />
                <div id="project-intake" className="scroll-mt-6" />
                <ProjectIntakeCard
                    dealName={dealName}
                    askingPrice={askingPrice}
                    projectId={projectId}
                    projectStage={projectStage}
                    documentType={documentType}
                    submissionNotes={submissionNotes}
                    selectedProjectKey={selectedProjectKey}
                    suggestedProjectName={suggestedProjectName}
                    suggestedProjectId={suggestedProjectId}
                    availableProjects={availableProjects}
                    selectedFiles={selectedFiles}
                    disabled={isSubmittingFile || submitLoading}
                    isExampleMode={isExampleMode}
                    activeViewProject={activeViewProject}
                    onCancelSubmission={isSubmittingFile || submitLoading ? handleCancelSubmission : undefined}
                    onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                    onDealNameChange={setDealName}
                    onAskingPriceChange={handleAskingPriceChange}
                    onProjectIdChange={setProjectId}
                    onProjectStageChange={setProjectStage}
                    onDocumentTypeChange={setDocumentType}
                    onSubmissionNotesChange={setSubmissionNotes}
                    onSelectedProjectKeyChange={setSelectedProjectKey}
                    onCreateProject={handleCreateProject}
                    onAppendToActiveProject={handleAppendToActiveProject}
                    onSwitchActiveViewProject={handleSwitchActiveViewProject}
                    onFileSelect={setSelectedFiles}
                    onSubmit={(environment) => { void handleSubmit(environment) }}
                    onManualDealComplete={handleManualDealComplete}
                />

                {submitError ? (
                    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        Unable to queue the latest document: {submitError}
                    </div>
                ) : null}

                {batchSubmissionMessage ? (
                    <div role={hasDuplicateSubmissionMessage ? 'alert' : 'status'} aria-live={hasDuplicateSubmissionMessage ? 'assertive' : 'polite'} className={hasDuplicateSubmissionMessage ? 'rounded-xl border-2 border-destructive/60 bg-destructive/10 px-4 py-4 text-sm text-foreground shadow-md' : 'rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground'}>
                        <div className="flex items-start gap-3">
                            <AlertCircle className={hasDuplicateSubmissionMessage ? 'mt-0.5 h-5 w-5 shrink-0 text-destructive' : 'mt-0.5 h-5 w-5 shrink-0 text-warning'} />
                            <div>
                                <p className={hasDuplicateSubmissionMessage ? 'font-semibold text-destructive' : 'font-semibold'}>{hasDuplicateSubmissionMessage ? 'Duplicate document blocked' : 'Upload notice'}</p>
                                <p className="mt-1 leading-6 text-foreground">{batchSubmissionMessage}</p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Data Isolation Privacy Callout Banner */}
                <DataIsolationBanner />

                {/* Interactive Product Walkthrough & Video Gallery Dock */}
                <WorkspaceDemoGalleryBar
                    resumeState={walkthrough.resumeState}
                    onResumeTour={handleResumeTour}
                    onSelectDemo={(demoId) => {
                        if (demoId === 'native-core') {
                            handleStartTour('core-fast')
                        } else if (demoId === 'native-deep') {
                            handleStartTour('deep-dive')
                        } else if (demoId === 'native-quest') {
                            handleStartTour('interactive-quest')
                        } else {
                            setSelectedWalkthroughDemoId(demoId)
                            setIsWalkthroughModalOpen(true)
                        }
                    }}
                />

                <div id="diligence-workspace" className="scroll-mt-6" />
                <div id="deal-workspace" className="scroll-mt-6" />

                {isViewingOlderDeal && mostRecentProject && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-950 dark:text-amber-200 shadow-xs animate-in fade-in-0 duration-200">
                        <div className="flex items-center gap-2.5">
                            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>
                                You are currently viewing: <strong className="font-bold text-amber-950 dark:text-amber-100">{activeViewProject?.name || effectiveDealName || activeProjectId} ({activeProjectDocuments.length} {activeProjectDocuments.length === 1 ? 'doc' : 'docs'})</strong> (this is not the most recent project).
                            </span>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-600/40 bg-background/90 hover:bg-background text-amber-950 dark:text-amber-200 font-semibold text-xs gap-1.5 shadow-2xs cursor-pointer"
                            onClick={() => handlePortfolioProjectSelect(mostRecentProject.projectKey || mostRecentProject.projectId)}
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Switch back to most recent project ({mostRecentProject.projectName || mostRecentProject.companyName || mostRecentProject.projectKey} • {mostRecentProject.documentCount} {mostRecentProject.documentCount === 1 ? 'doc' : 'docs'})
                        </Button>
                    </div>
                )}

                {/* Secondary Global Search Bar right above Navigation Bar */}
                <div className="w-full">
                    <button
                        type="button"
                        onClick={() => setCommandPaletteOpen(true)}
                        className="w-full flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl border border-primary/25 bg-background/80 hover:bg-background hover:border-primary/50 text-muted-foreground hover:text-foreground text-sm shadow-xs transition-all cursor-pointer group hover:shadow-md"
                        title="Global Search across projects, tabs, metrics, flags, and actions (⌘K or Ctrl+K)"
                    >
                        <span className="flex items-center gap-2.5 min-w-0">
                            <Search className="h-4 w-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="font-medium text-foreground/80 truncate">Search deals, tabs, metrics, findings, actions...</span>
                        </span>
                        <kbd className="inline-flex items-center gap-1 rounded bg-muted/90 px-2 py-0.5 text-[11px] font-mono font-semibold border border-border text-foreground shadow-2xs shrink-0">
                            ⌘K
                        </kbd>
                    </button>
                </div>

                <DealWorkspaceNav
                    activeTab={activeWorkspaceTab}
                    isDiligenceRunning={isCurrentProjectDiligenceRunning}
                    isDiligenceComplete={isCurrentProjectDiligenceComplete}
                    isSynthesisReady={activeProjectSynthesisSucceeded}
                    isSynthesisRunning={isCurrentProjectSynthesisRunning}
                    isSynthesisWaiting={isCurrentProjectExtractingDocs || isCurrentProjectDiligenceRunning || isCurrentProjectProcessingDocuments}
                    synthesisElapsedSeconds={currentSynthesisElapsedSeconds}
                    onStartTabTour={walkthrough.startTabTour}
                    onTabChange={(tab) => {
                        setActiveWorkspaceTab(tab)
                        const workspace = document.getElementById('deal-workspace')
                        if (workspace) {
                            workspace.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        } else {
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                    }}
                />

                <WorkspaceTabTutorialBanner
                    activeTab={activeWorkspaceTab}
                    onStartTabTour={walkthrough.startTabTour}
                    onOpenFullWalkthrough={() => setIsWalkthroughModalOpen(true)}
                />

                <TabSidebarTOC
                    activeTab={activeWorkspaceTab}
                    isCollapsed={isTocCollapsed}
                    setIsCollapsed={setIsTocCollapsed}
                    tocWidth={tocWidth}
                    setTocWidth={setTocWidth}
                />

                {activeWorkspaceTab === 'overview' ? (
                    <OverviewWorkspaceView
                        hydratedDealModel={hydratedDealModel}
                        activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                        visibleProjectSyntheses={visibleProjectSyntheses}
                        activeProjectId={activeProjectId}
                        dealName={effectiveDealName}
                        suggestedProjectName={suggestedProjectName}
                        activeProjectDocuments={activeProjectDocuments}
                        activeProjectImpact={activeProjectImpact}
                        setActiveWorkspaceTab={setActiveWorkspaceTab}
                        todayStats={todayPipelineStats}
                        projectSummaries={projectSummaries}
                        portfolioTotalCost={portfolioAllTimeCost}
                    />
                ) : null}

                {activeWorkspaceTab === 'analysis' ? (
                    <AnalysisWorkspaceView
                        hydratedDealModel={hydratedDealModel}
                        activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                        dealName={effectiveDealName}
                        suggestedProjectName={suggestedProjectName}
                        activeProjectDocuments={activeProjectDocuments}
                        activeProjectImpact={activeProjectImpact}
                        activeProjectId={activeProjectId}
                        setActiveWorkspaceTab={setActiveWorkspaceTab}
                    />
                ) : null}

                {activeWorkspaceTab === 'diagnostics' ? (
                    <DiagnosticsWorkspaceView
                        hydratedDealModel={hydratedDealModel}
                        activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                        dealName={effectiveDealName}
                        suggestedProjectName={suggestedProjectName}
                        activeProjectDocuments={activeProjectDocuments}
                        activeProjectId={activeProjectId}
                        setActiveWorkspaceTab={setActiveWorkspaceTab}
                    />
                ) : null}

                <Suspense fallback={<div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/20 p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Loading tab…</span></div>}>
                    {activeWorkspaceTab === 'valuation' ? (
                        <ValuationWorkspaceView
                            hydratedDealModel={hydratedDealModel}
                            activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                            askingPrice={askingPrice}
                            handleDealModelChange={handleDealModelChange}
                            submissionHistory={submissionHistory}
                            setActiveEvidence={setActiveEvidence}
                            returnsDisplayModel={returnsDisplayModel}
                            activeProjectDocuments={activeProjectDocuments}
                        />
                    ) : null}

                    {activeWorkspaceTab === 'returns' ? (
                        <ReturnsWorkspaceView
                            activeDealModel={activeDealModel}
                            returnsDisplayModel={returnsDisplayModel}
                            isReturnsIllustrativePreview={isReturnsIllustrativePreview}
                            submissionHistory={submissionHistory}
                            setActiveEvidence={setActiveEvidence}
                            activeProjectDocuments={activeProjectDocuments}
                            handleDealModelChange={handleDealModelChange}
                            handleDealModelDefaults={handleDealModelDefaults}
                        />
                    ) : null}

                    {activeWorkspaceTab === 'growth' ? (
                        <GrowthWorkspaceView
                            activeDealModel={activeDealModel}
                            isGrowthIllustrativePreview={isGrowthIllustrativePreview}
                            returnsDisplayModel={returnsDisplayModel}
                            submissionHistory={submissionHistory}
                            setActiveEvidence={setActiveEvidence}
                            activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                            activeProjectDocuments={activeProjectDocuments}
                            handleDealModelChange={handleDealModelChange}
                            handleDealModelDefaults={handleDealModelDefaults}
                        />
                    ) : null}

                    {activeWorkspaceTab === 'structure' ? (
                        <StructureWorkspaceView
                            activeDealModel={activeDealModel}
                            hydratedDealModel={returnsDisplayModel}
                            setActiveEvidence={setActiveEvidence}
                            handleDealModelChange={handleDealModelChange}
                            handleDealModelDefaults={handleDealModelDefaults}
                        />
                    ) : null}

                    {activeWorkspaceTab === 'negotiation' ? (
                        <NegotiationWorkspaceView
                            activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                            hydratedDealModel={hydratedDealModel}
                            activeProjectId={activeProjectId}
                            activeProjectDocuments={activeProjectDocuments}
                            dealName={effectiveDealName}
                            suggestedProjectName={suggestedProjectName}
                        />
                    ) : null}

                    {activeWorkspaceTab === 'diligence' ? (
                        <div className="space-y-6">
                            {(activeSubmissionBatch || activeBatchProcessingCount > 0 || simulatedWalkthroughBatch || activeBatchExpectedCount > 0 || activeBatchRows.length > 0 || activeProjectDocuments.length > 0) ? (
                                <div id="diligence-batch" className="scroll-mt-6">
                                    <BatchProgressCard
                                        activeSubmissionBatch={activeSubmissionBatch ?? (simulatedWalkthroughBatch ? {
                                            id: simulatedWalkthroughBatch.id,
                                            expectedDocumentCount: simulatedWalkthroughBatch.expectedDocumentCount,
                                            environment: 'production',
                                            startedAt: Date.now() - (simulatedWalkthroughBatch.elapsedSeconds * 1000),
                                        } : {
                                            id: activeProjectId,
                                            expectedDocumentCount: activeBatchExpectedCount,
                                            environment: 'production',
                                            startedAt: Date.now(),
                                        })}
                                        activeBatchFinishedCount={simulatedWalkthroughBatch ? simulatedWalkthroughBatch.finishedCount : activeBatchFinishedCount}
                                        activeBatchExpectedCount={simulatedWalkthroughBatch ? simulatedWalkthroughBatch.expectedDocumentCount : activeBatchExpectedCount}
                                        activeBatchFailedCount={simulatedWalkthroughBatch ? 0 : activeBatchFailedCount}
                                        isStoppingBatch={isStoppingBatch}
                                        handleStopBatch={() => { void handleStopBatch() }}
                                        activeBatchProcessingCount={simulatedWalkthroughBatch ? (simulatedWalkthroughBatch.processingCount ?? 0) : activeBatchProcessingCount}
                                        activeBatchProcessingPercent={simulatedWalkthroughBatch ? ((simulatedWalkthroughBatch.processingCount ?? 0) > 0 ? 100 : 0) : activeBatchProcessingPercent}
                                        activeBatchProgressPercent={simulatedWalkthroughBatch ? (simulatedWalkthroughBatch.progressPercent ?? 100) : activeBatchProgressPercent}
                                        batchElapsedSeconds={simulatedWalkthroughBatch ? simulatedWalkthroughBatch.elapsedSeconds : batchElapsedSeconds}
                                        activeBatchImpact={activeBatchImpact}
                                        activeBatchStuckRows={activeBatchStuckRows}
                                        activeBatchErrors={activeBatchErrors}
                                        activeBatchAdvisories={activeBatchAdvisories}
                                        activeBatchCompletedCount={simulatedWalkthroughBatch ? simulatedWalkthroughBatch.finishedCount : activeBatchCompletedCount}
                                        activeProjectId={activeProjectId}
                                        retryingRequestId={retryingRequestId ?? undefined}
                                        handleRetryFailedDocument={(requestID) => { void handleRetryFailedDocument(requestID) }}
                                        handleOpenProjectSynthesis={handleOpenProjectSynthesis}
                                        batchDocuments={activeBatchRows.length > 0 ? activeBatchRows : activeProjectDocuments}
                                        handleRerunLatestBatch={handleRerunLatestBatch}
                                        handleRerunAllProjectDocs={handleRerunAllProjectDocuments}
                                        isRerunningBatch={isRerunningBatch}
                                        handleRunSynthesis={handleRunSynthesis}
                                        isAwaitingSynthesis={isCurrentProjectAwaitingSynthesis}
                                    />
                                </div>
                            ) : null}

                            {!isExampleMode && isCurrentProjectExtractingDocs ? (
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 rounded-lg border border-blue-300 bg-blue-50 p-4 dark:border-blue-800/50 dark:bg-blue-900/15">
                                        <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-blue-600 dark:text-blue-400" />
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">Document extraction in progress</p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Per-document extraction is currently running for uploaded files. Project synthesis will trigger automatically once all documents finish processing.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-lg border border-slate-300 bg-slate-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/25">
                                        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400 animate-pulse" />
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">Project synthesis has not started (Queued)</p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Multi-document evidence reconciliation and valuation analysis will start automatically as soon as batch document extraction completes.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {!isExampleMode && isInterruptedBatch ? (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50/90 p-4 dark:border-amber-800/60 dark:bg-amber-950/30">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">
                                                Batch upload was interrupted ({activeBatchFinishedCount} of {activeBatchExpectedCount} files received)
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                A page reload occurred while queueing documents. All {activeBatchFinishedCount} received documents have finished extraction and analysis. You can proceed directly to synthesis with these documents or upload the remaining files.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (activeSubmissionBatch) {
                                                    setActiveSubmissionBatch({
                                                        ...activeSubmissionBatch,
                                                        expectedDocumentCount: activeBatchFinishedCount,
                                                    })
                                                }
                                                void handleRunSynthesis()
                                            }}
                                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center gap-1.5"
                                        >
                                            <Play className="h-3.5 w-3.5 fill-current" />
                                            <span>Proceed to Synthesis ({activeBatchFinishedCount} Files)</span>
                                        </button>
                                    </div>
                                </div>
                            ) : null}

                            {!isExampleMode && !isCurrentProjectProcessingDocuments && isCurrentProjectSynthesisRunning ? (
                                <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/15">
                                    <div className="flex items-start gap-3">
                                        <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-amber-600" />
                                        <div>
                                            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                <span>Project synthesis in progress</span>
                                                <span className="font-mono text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                                                    {formatElapsedDuration(currentSynthesisElapsedSeconds)}
                                                </span>
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                All documents finished processing, so the agent is now consolidating them into one project judgment.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs font-semibold text-amber-700 dark:text-amber-300 shrink-0 bg-background/80 dark:bg-card/80 px-2.5 py-1 rounded border border-amber-300 dark:border-amber-700/50">
                                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                                        <span>{formatElapsedDuration(currentSynthesisElapsedSeconds)}</span>
                                    </div>
                                </div>
                            ) : null}

                            {(submitResponse || displayedSubmissionRow || activeProjectDocuments.length > 0 || simulatedWalkthroughBatch || isTourActive || isExampleMode) ? (
                                <LatestSubmissionSection
                                    displayedSubmissionRow={displayedSubmissionRow}
                                    displayedSubmitStatus={displayedSubmitStatus}
                                    submitEnvironment={submitEnvironment}
                                    liveSubmittedRow={liveSubmittedRow}
                                    latestBatchRows={activeProjectDocuments.length > 0 ? activeProjectDocuments : latestBatchRows}
                                    safeBatchDocIndex={safeBatchDocIndex}
                                    setSelectedBatchDocIndex={setSelectedBatchDocIndex}
                                    setUserHasNavigatedBatchDocs={setUserHasNavigatedBatchDocs}
                                    retryingRequestId={retryingRequestId ?? undefined}
                                    handleRetryFailedDocument={(reqId) => { void handleRetryFailedDocument(reqId) }}
                                    handleOpenProjectSynthesis={handleOpenProjectSynthesis}
                                    projectId={projectId}
                                    projectStage={projectStage}
                                    documentType={documentType}
                                    submitResponse={submitResponse}
                                    webhookResponse={webhookResponse}
                                    displayedSubmitRowId={displayedSubmitRowId}
                                    displayedSubmitReceivedAt={displayedSubmitReceivedAt}
                                    displayedSubmitTrafficLight={displayedSubmitTrafficLight}
                                    displayedSubmitRiskLevel={displayedSubmitRiskLevel}
                                    displayedSubmitCategory={displayedSubmitCategory}
                                    displayedSubmitConfidence={displayedSubmitConfidence}
                                    displayedSubmitVariance={displayedSubmitVariance}
                                    displayedSubmitValuationCurrency={displayedSubmitValuationCurrency}
                                    displayedSubmitAiSummary={displayedSubmitAiSummary}
                                    liveSubmitCitations={liveSubmitCitations}
                                    activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                                    isCurrentProjectAwaitingSynthesis={isCurrentProjectAwaitingSynthesis}
                                    setActiveEvidence={setActiveEvidence}
                                    handleRerunLatestBatch={handleRerunLatestBatch}
                                    handleRerunAllProjectDocs={handleRerunAllProjectDocuments}
                                    handleRunSynthesis={handleRunSynthesis}
                                    isRerunningBatch={isRerunningBatch}
                                />
                            ) : null}

                            <DiligenceWorkspaceView
                                projectSummaries={projectSummaries}
                                dealModelsData={dealModelsData}
                                visibleProjectSyntheses={visibleProjectSyntheses}
                                activeProjectId={activeProjectId}
                                setSelectedProjectKey={setSelectedProjectKey}
                                askingPrice={askingPrice}
                                handleAskingPriceChange={handleAskingPriceChange}
                                activeProjectImpact={activeProjectImpact}
                                activeDealModel={activeDealModel}
                                submissionHistory={submissionHistory}
                                getProjectKey={getProjectKey}
                                setActiveEvidence={setActiveEvidence}
                                isExampleMode={isExampleMode}
                                setActiveWorkspaceTab={setActiveWorkspaceTab}
                                hydratedDealModel={hydratedDealModel}
                                activeProjectDocuments={activeProjectDocuments}
                                activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                                dealName={effectiveDealName}
                                suggestedProjectName={suggestedProjectName}
                                projectChecklistById={projectChecklistById}
                                setProjectChecklistById={setProjectChecklistById}
                                impact={impact}
                                onReturnToLanding={onReturnToLanding}
                                handleRunSynthesis={handleRunSynthesis}
                                isCurrentProjectAwaitingSynthesis={isCurrentProjectAwaitingSynthesis}
                                isCurrentProjectSynthesisRunning={isCurrentProjectSynthesisRunning}
                                isCurrentProjectExtractingDocs={isCurrentProjectExtractingDocs}
                                synthesisElapsedSeconds={currentSynthesisElapsedSeconds}
                            />
                        </div>
                    ) : null}

                    {activeWorkspaceTab === 'documents' ? (
                        <DocumentsWorkspaceView
                            submissionHistory={submissionHistory}
                            visibleProjectSyntheses={visibleProjectSyntheses}
                            selectedProjectKey={activeViewProject?.key || activeProjectId}
                            handlePortfolioProjectSelect={handlePortfolioProjectSelect}
                            handleExcludeDocument={handleExcludeDocument}
                            handleIncludeDocument={handleIncludeDocument}
                            handleRetryFailedDocument={handleRetryFailedDocument}
                            handleRequeueNewProject={handleRequeueNewProject}
                            retryingRequestId={retryingRequestId}
                            handleRunSynthesis={handleRunSynthesis}
                            isCurrentProjectAwaitingSynthesis={isCurrentProjectAwaitingSynthesis}
                            setSelectedProjectKey={setSelectedProjectKey}
                            handleRerunAllProjectDocs={handleRerunAllProjectDocuments}
                        />
                    ) : null}

                    {activeWorkspaceTab === 'compare' ? (
                        <section id="project-comparison" className="scroll-mt-6 space-y-4">
                            <div id="compare-header" className="scroll-mt-6">
                                <SectionHeader
                                    step={1}
                                    title="Multi-Project Deal Comparison Matrix"
                                    description="Compare financial metrics, valuation multiples, and acquisition risk postures side-by-side across all deal projects."
                                />
                            </div>
                            <div id="compare-table" className="scroll-mt-6">
                                <ProjectComparisonCard
                                    projects={projectSummaries.map((ps) => ({
                                        projectId: ps.projectId || ps.projectKey,
                                        projectName: ps.projectName || ps.companyName || ps.projectKey,
                                        model: (Array.isArray(dealModelsData) ? dealModelsData.find((m: any) => m.projectId === (ps.projectId || ps.projectKey)) : undefined) ?? {
                                            projectId: ps.projectId || ps.projectKey,
                                            askingPrice: null,
                                            purchasePrice: null,
                                            debtAssumed: null,
                                            cashAcquired: null,
                                            workingCapitalRequirement: null,
                                            transactionFees: null,
                                            holdPeriodYears: null,
                                            taxRate: null,
                                            closingCosts: null,
                                            maintenanceCapex: null,
                                            exitMultiple: null,
                                            exitCosts: null,
                                            equityContributionPercent: null,
                                            interestRate: null,
                                            amortizationYears: null,
                                            sellerNoteAmount: null,
                                            bearRevenueGrowth: null,
                                            baseRevenueGrowth: null,
                                            bullRevenueGrowth: null,
                                            bearEbitdaMargin: null,
                                            baseEbitdaMargin: null,
                                            bullEbitdaMargin: null,
                                            bearExitMultiple: null,
                                            baseExitMultiple: null,
                                            bullExitMultiple: null,
                                            revenueMultiple: null,
                                            ebitdaMultiple: null,
                                            assetHaircutPercent: null,
                                            modelUpdatedAt: '',
                                            modelUpdatedBy: '',
                                            documentedFactsJson: '',
                                            documentedFactsStatus: '',
                                        },
                                        synthesis: visibleProjectSyntheses.find((s) => s.projectId === (ps.projectId || ps.projectKey)),
                                        documentsCount: ps.documentCount,
                                        completedDocuments: ps.completedCount,
                                    }))}
                                    activeProjectId={activeProjectId}
                                    onSelectProject={(id: string) => {
                                        setSelectedProjectKey(id)
                                    }}
                                />
                            </div>
                        </section>
                    ) : null}

                    {activeWorkspaceTab === 'synthesis' ? (
                        <section id="project-synthesis" className="scroll-mt-6 space-y-4">
                            <SectionHeader
                                step={1}
                                title="Final acquisition judgment"
                                description="The consolidator's cross-document verdict for the selected project."
                            />
                            <ProjectSynthesisCard
                                syntheses={visibleProjectSyntheses}
                                projects={projectSummaries}
                                currentProjectId={activeProjectId}
                                documentAnalysisPending={isCurrentProjectProcessingDocuments}
                                synthesisPending={isCurrentProjectAwaitingSynthesis}
                                synthesisProgress={isExampleMode ? 100 : currentSynthesisProgress.value}
                                synthesisStage={isExampleMode ? 'Example synthesis complete' : currentSynthesisProgress.stage}
                                loading={projectSynthesisLoading}
                                error={projectSynthesisError}
                                model={hydratedDealModel}
                                impact={activeProjectImpact}
                                documents={activeProjectDocuments}
                                onOpenEvidence={setActiveEvidence}
                                onExcludeDocument={handleExcludeDocument}
                                onIncludeDocument={handleIncludeDocument}
                                onRetryDocument={handleRetryFailedDocument}
                                retryingRequestId={retryingRequestId}
                                onStopSynthesis={handleStopSynthesis}
                                stoppingSynthesis={isStoppingSynthesis}
                                onRunSynthesis={handleRunSynthesis}
                                onRunSynthesisWithoutLoi={handleRunSynthesisWithoutLoi}
                                runningSynthesisWithoutLoi={runningSynthesisWithoutLoi}
                                runningSynthesis={isCurrentProjectAwaitingSynthesis || isCurrentProjectSynthesisRunning}
                                synthesisElapsedSeconds={currentSynthesisElapsedSeconds}
                                onRefresh={() => {
                                    void triggerProjectSynthesis({ environment: activeHistoryEnvironment }, { skipCache: true }).result
                                }}
                                onSwitchTab={setActiveWorkspaceTab}
                            />
                            <div id="synthesis-management-questions" className="scroll-mt-6">
                                <ManagementQuestionTracker
                                    projectId={activeProjectId}
                                    suggestedQuestions={activeProjectSynthesis?.openQuestions ?? []}
                                />
                            </div>
                        </section>
                    ) : null}

                    {activeWorkspaceTab === 'history' ? (
                        <section className="space-y-4">
                            <div id="history-header" className="scroll-mt-6">
                                <SectionHeader
                                    step={1}
                                    title="Submission audit trail"
                                    description="Per-document processing status and AI output, newest first."
                                />
                            </div>
                            <div id="history-table" className="scroll-mt-6">
                                <SubmissionHistoryCard
                                    rows={submissionHistory}
                                    loading={submissionHistoryLoading}
                                    error={submissionHistoryError}
                                    activeEnvironment={activeHistoryEnvironment}
                                    onRefreshProduction={() => { void handleRefreshHistory('production') }}
                                    onRefreshTest={() => { void handleRefreshHistory('test') }}
                                    isPolling={hasActiveSubmissions}
                                    onRetryFailedDocument={handleRetryFailedDocument}
                                    retryingRequestId={retryingRequestId}
                                    onOpenProject={handleAuditProjectOpen}
                                    onOpenEvidence={setActiveEvidence}
                                />
                            </div>
                        </section>
                    ) : null}

                    {activeWorkspaceTab === 'email' ? (
                        <section className="space-y-4">
                            <div id="email-header" className="scroll-mt-6">
                                <SectionHeader
                                    step={1}
                                    title="Email drafts"
                                    description="Ready-to-send updates for the current deal, based on the selected project and synthesis state."
                                />
                            </div>
                            <div id="email-editor" className="scroll-mt-6">
                                <DealEmailDraftCard
                                    model={hydratedDealModel}
                                    synthesis={activeProjectSynthesis ?? undefined}
                                    projectName={effectiveDealName || suggestedProjectName}
                                />
                            </div>
                        </section>
                    ) : null}

                    {activeWorkspaceTab === 'evals' ? (
                            <EvalDashboardTab
                                evalRuns={Array.isArray(evalRunsData) ? evalRunsData : []}
                                onTriggerEvalRuns={triggerEvalRuns}
                                syntheses={visibleProjectSyntheses}
                                documents={submissionHistory}
                                onSelectProject={(targetIdentifier, targetTab = 'synthesis') => {
                                    handleEvalProjectSelect(targetIdentifier, (targetTab as WorkspaceTab) || 'synthesis')
                                }}
                                onSelectDoc={(docFileName, targetIdentifier) => {
                                    handleEvalDocSelect(docFileName, targetIdentifier)
                                }}
                            />
                    ) : null}

                    {activeWorkspaceTab === 'spending' ? (
                        <SpendingAnalyticsTab
                            documents={submissionHistory}
                            syntheses={visibleProjectSyntheses}
                            onSelectProject={(targetIdentifier) => {
                                handleEvalProjectSelect(targetIdentifier, 'synthesis')
                            }}
                        />
                    ) : null}

                    {activeWorkspaceTab === 'faqs' ? (
                        <section id="faqs-header" className="scroll-mt-6 space-y-6">
                            <TechnicalFaqWorkspaceTab onSwitchTab={(tab) => setActiveWorkspaceTab(tab as WorkspaceTab)} />
                        </section>
                    ) : null}

                    {activeWorkspaceTab === 'shortcuts' ? (
                        <section id="shortcuts-header" className="scroll-mt-6 space-y-6">
                            <KeyboardShortcutsWorkspaceView
                                onNavigateTab={(tab) => {
                                    setActiveWorkspaceTab(tab)
                                    const workspace = document.getElementById('deal-workspace')
                                    if (workspace) {
                                        workspace.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                    }
                                }}
                                onStartTour={() => walkthrough.startTour('core-fast', 0)}
                            />
                        </section>
                    ) : null}

                    {activeWorkspaceTab === 'errors' ? (
                        <section id="workflow-errors" className="scroll-mt-6 space-y-6">
                            <div id="errors-header" className="scroll-mt-6">
                                <WorkflowErrorLogCard
                                    rows={Array.isArray(workflowErrorData) ? workflowErrorData : []}
                                    watchdogEvents={Array.isArray(watchdogEventsData) ? watchdogEventsData : []}
                                    loading={workflowErrorsLoading}
                                    error={workflowErrorsError}
                                    onRefresh={() => {
                                        void triggerWorkflowErrors({ environment: activeHistoryEnvironment })
                                        void triggerWatchdogEvents({ environment: activeHistoryEnvironment })
                                    }}
                                />
                            </div>
                            <div id="errors-arch" className="scroll-mt-6">
                                <SystemArchitectureCard />
                            </div>
                        </section>
                    ) : null}

                    {activeWorkspaceTab === 'report_issue' ? (
                        <section id="report-an-issue" className="scroll-mt-6 space-y-6">
                            <ReportIssueWorkspaceView
                                currentDealName={dealName || suggestedProjectName}
                                activeWorkspaceTab={activeWorkspaceTab}
                                onSwitchTab={(tab) => {
                                    setActiveWorkspaceTab(tab)
                                    const workspace = document.getElementById('deal-workspace')
                                    if (workspace) {
                                        workspace.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                    }
                                }}
                                onOpenChat={() => {}}
                            />
                        </section>
                    ) : null}

                    {activeWorkspaceTab === 'account' ? (
                        <section id="account-settings" className="scroll-mt-6 space-y-6">
                            <AccountWorkspaceView
                                projectSummaries={projectSummaries}
                                onSelectProject={(id) => {
                                    setActiveViewProjectId(id)
                                }}
                                onSwitchTab={(tab) => {
                                    setActiveWorkspaceTab(tab)
                                    const workspace = document.getElementById('deal-workspace')
                                    if (workspace) {
                                        workspace.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                    }
                                }}
                                onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                            />
                        </section>
                    ) : null}
                </Suspense>

                {SHOW_LEGACY_DILIGENCE_BACKUP ? (
                    <LegacyDiligenceBackupCard
                        diligenceFindings={diligenceFindings}
                        highPriorityCount={highPriorityCount}
                        validatedCount={validatedCount}
                        error={error}
                        openFindingEvidence={openFindingEvidence}
                    />
                ) : null}
            </main>
        </div>

            {/* Right Side Sticky Navigation Dock: FAQ, Activity, Tour, Project Intake & Report Issue */}
            <RightSideQuickActions
                isFaqOpen={isFaqSidebarOpen}
                onToggleFaq={() => setIsFaqSidebarOpen((prev) => !prev)}
                hasActiveSubmissions={hasActiveSubmissions}
                inFlightBatchPlaceholder={Boolean(inFlightBatchPlaceholder)}
                onOpenActivity={() => setIsBatchDrawerOpen(true)}
                resumeState={walkthrough.resumeState}
                isTourActive={walkthrough.isActive}
                onOpenTour={() => setIsWalkthroughModalOpen(true)}
                onResumeTour={handleResumeTour}
                onOpenIntake={() => {
                    const intakeEl = document.querySelector('[data-project-intake]') || document.getElementById('deal-intake')
                    if (intakeEl) {
                        intakeEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    } else {
                        setActiveWorkspaceTab('documents')
                        setTimeout(() => {
                            document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 100)
                    }
                }}
                onOpenReportIssue={() => setIsReportIssueOpen(true)}
                isEvidenceDrawerOpen={Boolean(activeEvidence)}
            />

            <aside
                aria-label="Quick Actions"
                className={`fixed bottom-2.5 left-3 z-40 transition-all duration-300 ${
                    activeEvidence ? 'opacity-0 pointer-events-none -translate-x-10 scale-95' : 'opacity-100 translate-x-0 scale-100'
                }`}
            >
                {isLeftQuickDockVisible ? (
                    <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-background/90 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in-0 duration-200">
                        <LoginButton />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => setIsApiKeyModalOpen(true)}
                            title="Configure custom Anthropic API Key (BYOK)"
                        >
                            <Key className="h-3.5 w-3.5" />
                            <span className="sr-only">API Key</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-full transition-colors ${hasActiveSubmissions || inFlightBatchPlaceholder ? 'text-primary animate-pulse bg-primary/10' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
                            onClick={() => setIsBatchDrawerOpen(true)}
                            title="Batch processing activity (Ctrl+Shift+B)"
                        >
                            <Activity className="h-3.5 w-3.5" />
                            <span className="sr-only">Batch activity</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => setIsShortcutsOpen(true)}
                            title="Keyboard shortcuts (?)"
                        >
                            <Keyboard className="h-3.5 w-3.5" />
                            <span className="sr-only">Keyboard shortcuts</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-full transition-colors ${
                                isFaqSidebarOpen
                                    ? 'text-primary bg-primary/10 font-bold'
                                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                            }`}
                            onClick={() => setIsFaqSidebarOpen((prev) => !prev)}
                            title="FAQs & Workflow Guide"
                        >
                            <HelpCircle className="h-3.5 w-3.5" />
                            <span className="sr-only">FAQs &amp; Guide</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors ml-0.5"
                            onClick={() => setIsLeftQuickDockVisible(false)}
                            title="Dismiss quick actions toolbar"
                        >
                            <X className="h-3.5 w-3.5" />
                            <span className="sr-only">Close toolbar</span>
                        </Button>
                    </div>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-full border-border/80 bg-background/90 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur-md hover:text-foreground hover:bg-muted/80 transition-all duration-200"
                        onClick={() => setIsLeftQuickDockVisible(true)}
                        title="Re-open quick actions toolbar"
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                        <span>Quick actions</span>
                    </Button>
                )}
            </aside>

            <EvidenceDrawer evidence={activeEvidence} onClose={() => setActiveEvidence(null)} />

            <ProjectsSidePanel
                isOpen={isProjectsPanelOpen}
                onClose={() => setIsProjectsPanelOpen(false)}
                projects={projectSummaries}
                activeProjectKey={activeViewProject?.key || activeProjectId}
                syntheses={visibleProjectSyntheses}
                onSelectProject={(key) => handlePortfolioProjectSelect(key)}
                onOpenIntake={() => {
                    handleCreateProject()
                    document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth' })
                }}
            />

            {/* Legal Disclaimer & Compliance Footer */}
            <footer className="mt-12 border-t border-border/60 pt-5 pb-8 px-4 text-center text-xs text-muted-foreground flex flex-col lg:flex-row items-center justify-between gap-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-2 font-semibold text-foreground/80">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>256-bit TLS Encryption • Zero-Retention Pipeline • RLS Database Protection</span>
                </div>
                <p className="max-w-2xl text-left text-2xs opacity-85 leading-normal">
                    <strong>Disclaimer:</strong> Dillon AI is an AI-assisted financial due diligence platform. Extracted metrics, EBITDA reconstructions, and risk flags are generated for informational analysis only and do not constitute formal legal, accounting, tax, or investment advice. Always consult certified CPAs and M&A deal advisors before executing acquisitions.
                </p>
            </footer>

            <BatchProcessingSidePanel
                isOpen={isBatchDrawerOpen}
                onClose={() => setIsBatchDrawerOpen(false)}
                inFlightBatch={inFlightBatchPlaceholder}
                activeBatchRows={activeBatchRows}
                batchProgressPercent={activeBatchProgressPercent}
                batchProcessingCount={activeBatchProcessingCount}
                batchExpectedCount={activeBatchExpectedCount}
                batchFinishedCount={activeBatchFinishedCount}
                batchFailedCount={activeBatchFailedCount}
                batchElapsedSeconds={batchElapsedSeconds}
                batchSubmissionMessage={batchSubmissionMessage}
                isStoppingBatch={isStoppingBatch}
                onStopBatch={() => { void handleStopBatch() }}
                onRetryDocument={(requestID) => { void handleRetryFailedDocument(requestID) }}
                onRequeueNewProject={handleRequeueNewProject}
                retryingRequestId={retryingRequestId}
                submissionHistory={submissionHistory}
                resumeState={walkthrough.resumeState}
                onResumeTour={handleResumeTour}
            />

            <Suspense fallback={null}>
                <DealChatPanel
                    synthesis={activeProjectSynthesis ?? undefined}
                    model={hydratedDealModel}
                    projectName={effectiveDealName || suggestedProjectName}
                    documents={activeProjectDocuments}
                    allSyntheses={visibleProjectSyntheses}
                    onSuggestProjectSwitch={(targetProjectId) => {
                        const targetProject = projectSummaries.find((p: any) => (p.projectId || p.projectKey) === targetProjectId)
                        if (!targetProject) return
                        handlePortfolioProjectSelect(targetProject.projectKey)
                    }}
                    onOpenProjectsPanel={() => setIsProjectsPanelOpen(true)}
                    projectsCount={projectSummaries.length}
                    onNavigateTab={(tab, anchorId) => {
                        if (anchorId === 'project-intake' || anchorId === 'upload-section' || (tab as string) === 'intake' || (tab as string) === 'upload') {
                            const el = document.getElementById('project-intake') || document.getElementById('upload-section')
                            if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }
                            return
                        }
                        setActiveWorkspaceTab(tab)
                        if (anchorId) {
                            setTimeout(() => {
                                const el = document.getElementById(anchorId)
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }
                            }, 120)
                        }
                    }}
                />
            </Suspense>

            <Suspense fallback={null}>
                <CommandPalette
                    open={commandPaletteOpen}
                    onClose={() => setCommandPaletteOpen(false)}
                    onSelectTab={(tab) => setActiveWorkspaceTab(tab as WorkspaceTab)}
                    onToggleTheme={() => { const next = currentTheme === 'dark' ? 'light' : currentTheme === 'light' ? 'system' : 'dark'; setCurrentTheme(next); setStoredTheme(next) }}
                    onExportMarkdown={() => { const name = effectiveDealName || suggestedProjectName; const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50) || 'deal'; downloadFile(buildMarkdownReport(hydratedDealModel, activeProjectSynthesis ?? undefined, name), `${safeName}_summary.md`, 'text/markdown') }}
                    onExportJson={() => { const name = effectiveDealName || suggestedProjectName; const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50) || 'deal'; downloadFile(JSON.stringify(buildJsonExport(hydratedDealModel, activeProjectSynthesis ?? undefined, name), null, 2), `${safeName}_export.json`, 'application/json') }}
                    onShowShortcuts={() => { setIsShortcutsOpen(true) }}
                    onOpenChat={() => { }}
                    onCopySummary={() => { const name = effectiveDealName || suggestedProjectName; navigator.clipboard.writeText(buildMarkdownReport(hydratedDealModel, activeProjectSynthesis ?? undefined, name)) }}
                    onScrollToUpload={() => { document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth' }) }}
                    onStartTour={(tourId) => handleStartTour(tourId)}
                    onOpenWalkthrough={() => setIsWalkthroughModalOpen(true)}
                    onOpenReportIssue={() => setIsReportIssueOpen(true)}
                />
            </Suspense>

            <ApiKeyModal open={isApiKeyModalOpen} onOpenChange={setIsApiKeyModalOpen} />
            <ReportIssueModal
                open={isReportIssueOpen}
                onOpenChange={setIsReportIssueOpen}
                projectName={effectiveDealName || suggestedProjectName || (activeProjectId ? `Project #${activeProjectId}` : 'General Workspace')}
                activeTab={activeWorkspaceTab || 'Overview'}
            />
            <ExportDiligenceModal
                open={isExportModalOpen}
                onOpenChange={setIsExportModalOpen}
                dealName={effectiveDealName || suggestedProjectName || 'Active Target'}
                projectId={projectId || suggestedProjectId || 'default-project'}
                synthesis={activeProjectSynthesis}
                dealModel={hydratedDealModel}
                documents={activeProjectDocuments}
            />
            <KeyboardShortcutsDialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen} showTrigger={false} />
            <DashboardFaqSidebar
                isOpen={isFaqSidebarOpen}
                onClose={() => setIsFaqSidebarOpen(false)}
                onSwitchTab={setActiveWorkspaceTab}
                onOpenWalkthrough={() => setIsWalkthroughModalOpen(true)}
            />
            <WalkthroughLauncherModal
                isOpen={isWalkthroughModalOpen}
                onClose={() => setIsWalkthroughModalOpen(false)}
                onStartTour={(tourId) => handleStartTour(tourId)}
                resumeState={walkthrough.resumeState}
                onResumeTour={handleResumeTour}
                initialTab={selectedWalkthroughDemoId === 'short-yt' || selectedWalkthroughDemoId === 'short-supademo' || selectedWalkthroughDemoId === 'deep-supademo' ? 'video' : 'interactive'}
                initialVideoMode={selectedWalkthroughDemoId === 'short-supademo' ? 'quick' : selectedWalkthroughDemoId === 'deep-supademo' ? 'deep' : 'yt'}
            />
            <WalkthroughNudgeBeacon
                isOpen={shouldShowNudge && !walkthrough.isActive}
                reason={nudgeReason}
                onStartTour={() => {
                    handleStartTour('core-fast')
                    markWalkthroughCompleted()
                }}
                onSnooze={() => snoozeNudge(7 * 24 * 60 * 60 * 1000)}
                onDismiss={dismissNudge}
            />
            <NativeWalkthroughOverlay
                walkthrough={walkthrough}
                dealName={effectiveDealName || (isExampleMode ? 'Apex Industrial Technologies (Atlas Demo)' : (activeProjectId ? `Project #${activeProjectId}` : 'Apex Industrial Technologies'))}
            />
            <ScrollDownPrompt />
        </div>
    )
}
