import { describe, expect, it } from 'vitest'

// Import all workspace tab components to ensure static analysis and runtime initialization succeed without TDZ
import ProjectPortfolioCard from '../ProjectPortfolioCard'
import { DocumentsWorkspaceView } from './DocumentsWorkspaceView'
import DealMemoView from '../DealMemoView'
import ProjectSynthesisCard from '../ProjectSynthesisCard'
import EvalDashboardTab from '../EvalDashboardTab'
import SpendingAnalyticsTab from '../SpendingAnalyticsTab'
import TechnicalFaqWorkspaceTab from '../TechnicalFaqWorkspaceTab'
import KeyboardShortcutsWorkspaceView from './KeyboardShortcutsWorkspaceView'
import WorkflowErrorLogCard from '../WorkflowErrorLogCard'
import SubmissionHistoryCard from '../SubmissionHistoryCard'
import { AccountWorkspaceView } from './AccountWorkspaceView'
import ReportIssueWorkspaceView from './ReportIssueWorkspaceView'

describe('Workspace Tab Components Validation', () => {
    it('successfully loads and initializes ProjectPortfolioCard without TDZ errors', () => {
        expect(ProjectPortfolioCard).toBeDefined()
        expect(typeof ProjectPortfolioCard).toBe('function')
    })

    it('successfully loads and initializes DocumentsWorkspaceView', () => {
        expect(DocumentsWorkspaceView).toBeDefined()
        expect(typeof DocumentsWorkspaceView).toBe('function')
    })

    it('successfully loads and initializes DealMemoView', () => {
        expect(DealMemoView).toBeDefined()
        expect(typeof DealMemoView).toBe('function')
    })

    it('successfully loads and initializes ProjectSynthesisCard', () => {
        expect(ProjectSynthesisCard).toBeDefined()
        expect(typeof ProjectSynthesisCard).toBe('function')
    })

    it('successfully loads and initializes EvalDashboardTab', () => {
        expect(EvalDashboardTab).toBeDefined()
        expect(typeof EvalDashboardTab).toBe('function')
    })

    it('successfully loads and initializes SpendingAnalyticsTab', () => {
        expect(SpendingAnalyticsTab).toBeDefined()
        expect(typeof SpendingAnalyticsTab).toBe('function')
    })

    it('successfully loads and initializes TechnicalFaqWorkspaceTab', () => {
        expect(TechnicalFaqWorkspaceTab).toBeDefined()
        expect(typeof TechnicalFaqWorkspaceTab).toBe('function')
    })

    it('successfully loads and initializes KeyboardShortcutsWorkspaceView', () => {
        expect(KeyboardShortcutsWorkspaceView).toBeDefined()
        expect(typeof KeyboardShortcutsWorkspaceView).toBe('function')
    })

    it('successfully loads and initializes WorkflowErrorLogCard', () => {
        expect(WorkflowErrorLogCard).toBeDefined()
        expect(typeof WorkflowErrorLogCard).toBe('function')
    })

    it('successfully loads and initializes SubmissionHistoryCard', () => {
        expect(SubmissionHistoryCard).toBeDefined()
        expect(typeof SubmissionHistoryCard).toBe('function')
    })

    it('successfully loads and initializes AccountWorkspaceView', () => {
        expect(AccountWorkspaceView).toBeDefined()
        expect(typeof AccountWorkspaceView).toBe('function')
    })

    it('successfully loads and initializes ReportIssueWorkspaceView', () => {
        expect(ReportIssueWorkspaceView).toBeDefined()
        expect(typeof ReportIssueWorkspaceView).toBe('function')
    })
})
