import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    detectIssueReportIntent,
    detectDebateIntent,
    buildMultiAgentDebateResponse,
    generateSessionTitle,
    createInitialSession,
    formatRelativeDate,
    CHAT_SESSIONS_STORAGE_KEY,
    CHAT_ACTIVE_SESSION_KEY
} from './DealChatPanel'

describe('DealChatPanel detectIssueReportIntent', () => {
    it('detects bug reports accurately', () => {
        const result1 = detectIssueReportIntent('I found a bug in the document processing pipeline')
        expect(result1.isIssueIntent).toBe(true)
        expect(result1.category).toBe('bug')
        expect(result1.title).toContain('bug')

        const result2 = detectIssueReportIntent('report issue: something is broken with the upload button')
        expect(result2.isIssueIntent).toBe(true)
        expect(result2.category).toBe('ui_improvement') // contains button
    })

    it('detects UI / UX improvement reports accurately', () => {
        const result = detectIssueReportIntent('report a bug with the dark mode layout and visual theme')
        expect(result.isIssueIntent).toBe(true)
        expect(result.category).toBe('ui_improvement')
    })

    it('detects financial data accuracy reports accurately', () => {
        const result = detectIssueReportIntent('file an issue: EBITDA multiple calculation discrepancy in DCF')
        expect(result.isIssueIntent).toBe(true)
        expect(result.category).toBe('data_accuracy')
    })

    it('detects feature requests accurately', () => {
        const result = detectIssueReportIntent('file an issue: can you add support for multi-currency conversions?')
        expect(result.isIssueIntent).toBe(true)
        expect(result.category).toBe('feature_request')
    })

    it('returns false for normal M&A questions', () => {
        expect(detectIssueReportIntent('What is the asking price of this company?').isIssueIntent).toBe(false)
        expect(detectIssueReportIntent('Explain the red flags in plain English').isIssueIntent).toBe(false)
        expect(detectIssueReportIntent('How do I get started with diligence?').isIssueIntent).toBe(false)
        expect(detectIssueReportIntent('Compare all projects').isIssueIntent).toBe(false)
        expect(detectIssueReportIntent('Where is breakeven?').isIssueIntent).toBe(false)
    })
})

describe('DealChatPanel detectDebateIntent', () => {
    it('detects debate keywords and phrases', () => {
        expect(detectDebateIntent('Run Bull vs Bear IC debate')).toBe(true)
        expect(detectDebateIntent('Can the agents debate this deal?')).toBe(true)
        expect(detectDebateIntent('What does the investment committee think?')).toBe(true)
        expect(detectDebateIntent('Give me the bull case and bear case')).toBe(true)
        expect(detectDebateIntent('Who is the arbiter?')).toBe(true)
        expect(detectDebateIntent('agent council')).toBe(true)
        expect(detectDebateIntent('debate mode')).toBe(true)
    })

    it('returns false for generic questions', () => {
        expect(detectDebateIntent('What is the EBITDA?')).toBe(false)
        expect(detectDebateIntent('Show me the tax return summary')).toBe(false)
        expect(detectDebateIntent('Where is the breakeven chart?')).toBe(false)
    })
})

describe('DealChatPanel buildMultiAgentDebateResponse', () => {
    it('generates a full multi-agent IC debate council breakdown with Bull, Bear, and Arbiter', () => {
        const sampleModel: any = {
            askingPrice: 5000000,
            revenue: 8000000,
            ebitda: 1200000,
            documentedFactsJson: JSON.stringify({
                revenue: { value: 8000000, documentSource: 'P&L 2024' },
                ebitda_sde: { value: 1200000, documentSource: 'Tax Return 2024' },
            }),
        }

        const sampleSynthesis: any = {
            redFlags: ['32% Customer Concentration with top client', 'Unverified $150k Owner Add-back'],
            greenFlags: ['92% Annual Gross Recurring Contract Revenue', '18% EBITDA Margins vs 12% Industry Average'],
            negotiationLevers: ['Request $250k Purchase Price Haircut for Add-back', 'Mandate 15% Indemnity Escrow for 18 Months'],
            verdict: 'RENEGOTIATE',
        }

        const response = buildMultiAgentDebateResponse(
            {
                synthesis: sampleSynthesis,
                model: sampleModel,
                projectName: 'Apex Industrial Services',
            },
            'Run an IC debate'
        )

        expect(response).toContain('### ⚔️ Multi-Agent IC Council Debate: **Apex Industrial Services**')
        expect(response).toContain('#### 🐂 Bull Agent (Growth & Synergies Lead)')
        expect(response).toContain('#### 🐻 Bear Agent (Forensic Risk Auditor)')
        expect(response).toContain('#### ⚖️ Arbiter Agent (Lead Partner & IC Chair Consensus)')
        expect(response).toContain('**Consensus IC Posture**:')
        expect(response).toContain('PROCEED WITH CONDITIONAL COVENANTS')
        expect(response).toContain('92% Annual Gross Recurring Contract Revenue')
        expect(response).toContain('32% Customer Concentration with top client')
        expect(response).toContain('Open Synthesis Verdict')
    })
})

describe('DealChatPanel multi-session chat helpers', () => {
    it('generates clean, truncated session titles from user prompts', () => {
        expect(generateSessionTitle('   ## What is the asking price?  ')).toBe('What is the asking price?')
        expect(generateSessionTitle('Is the EBITDA verified in the 2024 tax return and audited financials?')).toBe('Is the EBITDA verified in the 2024 t...')
        expect(generateSessionTitle('')).toBe('New Conversation')
        expect(generateSessionTitle('   \n\n  ')).toBe('New Conversation')
    })

    it('creates initial sessions with appropriate default metadata and id', () => {
        const emptySession = createInitialSession('Project Alpha')
        expect(emptySession.id).toMatch(/^session-\d+-[a-z0-9]+$/)
        expect(emptySession.projectName).toBe('Project Alpha')
        expect(emptySession.messages).toEqual([])
        expect(emptySession.title).toBe('New Conversation')

        const sessionWithMessages = createInitialSession('Project Alpha', [
            { id: '1', role: 'user', content: 'What are the top 3 deal risks?', timestamp: Date.now() },
            { id: '2', role: 'assistant', content: 'Here are the risks...', timestamp: Date.now() }
        ])
        expect(sessionWithMessages.title).toBe('What are the top 3 deal risks?')
        expect(sessionWithMessages.messages.length).toBe(2)
    })

    it('formats relative dates accurately for session history', () => {
        const now = Date.now()
        expect(formatRelativeDate(now - 10 * 1000)).toBe('Just now')
        expect(formatRelativeDate(now - 15 * 60 * 1000)).toBe('15m ago')
        expect(formatRelativeDate(now - 3 * 3600 * 1000)).toBe('3h ago')
        expect(formatRelativeDate(now - 25 * 3600 * 1000)).toBe('Yesterday')
        expect(formatRelativeDate(now - 4 * 24 * 3600 * 1000)).toBe('4d ago')
        const pastDate = new Date(2025, 0, 15).getTime()
        expect(formatRelativeDate(pastDate)).toContain('Jan')
    })

    it('handles initial session title when initial messages contain only assistant responses', () => {
        const session = createInitialSession('Apex Corp', [
            { id: '1', role: 'assistant', content: 'Welcome to Apex Corp Diligence', timestamp: Date.now() }
        ])
        expect(session.title).toBe('Apex Corp Diligence')
    })

    it('strips markdown headers and special characters cleanly when generating session titles', () => {
        expect(generateSessionTitle('### **What is the ARR growth rate?**')).toBe('What is the ARR growth rate?**')
        expect(generateSessionTitle('- - - What about working capital pegs?\n\nAnd inventory?')).toBe('What about working capital pegs? And...')
    })

    it('exports proper storage keys', () => {
        expect(CHAT_SESSIONS_STORAGE_KEY).toBe('mergeworks.chatSessions.v1')
        expect(CHAT_ACTIVE_SESSION_KEY).toBe('mergeworks.chatActiveSessionId.v1')
    })
})

describe('DealChatPanel Client-Side AI Tools', () => {
    const mockContext: any = {
        model: {
            askingPrice: 5000000,
            purchasePrice: 4800000,
            documentedFactsJson: JSON.stringify({
                ebitda_sde: { value: 1250000, documentSource: 'Tax Return 2024' },
                revenue: { value: 8500000, documentSource: 'P&L 2024' },
            })
        },
        synthesis: {
            redFlags: ['Unverified $140,000 owner perk add-backs'],
            greenFlags: ['Solid 82% Month-12 cohort retention'],
            finalTrafficLight: 'YELLOW',
            finalRecommendation: 'RENEGOTIATE',
            finalJudgmentSummary: 'Strong cash flows with aggressive seller add-backs requiring price haircut.'
        },
        projectName: 'Apex Industrial Services'
    }

    it('calculates banking add-back disallowance and purchase price reduction at given multiple', async () => {
        const { executeClientSideTool } = await import('./DealChatPanel')
        const result = executeClientSideTool('calculate_deal_financials', {
            operation: 'add_back_disallowance',
            reportedEbitda: 1250000,
            disallowedAddBacks: 140000,
            targetMultiple: 4.5
        }, mockContext)

        expect(result.operation).toBe('add_back_disallowance')
        expect(result.reportedEbitda).toBe(1250000)
        expect(result.disallowedAddBacksAmount).toBe(140000)
        expect(result.normalizedTrueEbitda).toBe(1110000)
        expect(result.multipleApplied).toBe('4.5x')
        expect(result.baseValuation).toBe('$5,625,000')
        expect(result.revisedNormalizedValuation).toBe('$4,995,000')
        expect(result.justifiedPurchasePriceReduction).toBe('$630,000')
        expect(result.lenderRuleSummary).toContain('SBA 7(a)')
    })

    it('queries customer cohort retention matrix and churn health status', async () => {
        const { executeClientSideTool } = await import('./DealChatPanel')
        const result = executeClientSideTool('query_deal_data', {
            queryType: 'cohorts'
        }, mockContext)

        expect(result.cohortsCount).toBeGreaterThan(0)
        expect(result.cohorts).toBeDefined()
        expect(result.averageM12LogoRetention).toBeDefined()
        expect(result.averageM12Nrr).toBeDefined()
        expect(result.guidance).toContain('tab:analysis#analysis-cohort-retention')
    })

    it('queries categorized banking add-back items and recalculations', async () => {
        const { executeClientSideTool } = await import('./DealChatPanel')
        const result = executeClientSideTool('query_deal_data', {
            queryType: 'add_backs'
        }, mockContext)

        expect(result.totalAddBacksCount).toBeGreaterThan(0)
        expect(result.categorizedItems.length).toBeGreaterThan(0)
        expect(result.reportedEbitda).toBeDefined()
        expect(result.normalizedEbitda).toBeDefined()
        expect(result.purchasePriceReduction).toBeDefined()
        expect(result.guidance).toContain('tab:diligence#add-back-quality-card')
    })

    it('calculates Target Working Capital (NWC) Peg and APA contract clause', async () => {
        const { executeClientSideTool } = await import('./DealChatPanel')
        const result = executeClientSideTool('calculate_deal_financials', {
            operation: 'nwc_peg',
            timeframe: '12m',
            collarPercent: 5
        }, mockContext)

        expect(result.operation).toBe('nwc_peg')
        expect(result.timeframe).toBe('12m')
        expect(result.targetPeg).toBeDefined()
        expect(result.collarBandwidth).toContain('±5%')
        expect(result.guidance).toContain('tab:structure#structure-working-capital-peg')
    })

    it('includes add_back_disallowance, nwc_peg, and cohort options in tool schemas', async () => {
        const { CHAT_AGENT_OPENAI_TOOLS, CHAT_AGENT_ANTHROPIC_TOOLS } = await import('./DealChatPanel')
        
        const openAiCalcTool = CHAT_AGENT_OPENAI_TOOLS.find(t => t.function.name === 'calculate_deal_financials')
        const openAiCalcProps = openAiCalcTool?.function.parameters?.properties as Record<string, any> | undefined
        expect(openAiCalcProps?.operation?.enum).toContain('add_back_disallowance')
        expect(openAiCalcProps?.operation?.enum).toContain('nwc_peg')

        const openAiQueryTool = CHAT_AGENT_OPENAI_TOOLS.find(t => t.function.name === 'query_deal_data')
        const openAiQueryProps = openAiQueryTool?.function.parameters?.properties as Record<string, any> | undefined
        expect(openAiQueryProps?.queryType?.enum).toContain('cohorts')
        expect(openAiQueryProps?.queryType?.enum).toContain('add_backs')

        const anthropicCalcTool = CHAT_AGENT_ANTHROPIC_TOOLS.find(t => t.name === 'calculate_deal_financials')
        const anthropicCalcProps = anthropicCalcTool?.input_schema?.properties as Record<string, any> | undefined
        expect(anthropicCalcProps?.operation?.enum).toContain('add_back_disallowance')
        expect(anthropicCalcProps?.operation?.enum).toContain('nwc_peg')

        const anthropicQueryTool = CHAT_AGENT_ANTHROPIC_TOOLS.find(t => t.name === 'query_deal_data')
        const anthropicQueryProps = anthropicQueryTool?.input_schema?.properties as Record<string, any> | undefined
        expect(anthropicQueryProps?.queryType?.enum).toContain('cohorts')
        expect(anthropicQueryProps?.queryType?.enum).toContain('add_backs')
    })
})



