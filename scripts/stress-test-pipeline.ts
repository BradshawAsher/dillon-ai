import path from 'node:path'
import fs from 'node:fs'
import pLimit from 'p-limit'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
const envPath = path.resolve('frontend', '.env')
if (fs.existsSync(envPath)) {
    try {
        process.loadEnvFile(envPath)
    } catch {}
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY/SERVICE_ROLE_KEY in frontend/.env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface PipelineTestOptions {
    documentCount: number
    concurrency: number
}

function parseCliArgs(): PipelineTestOptions {
    const args = process.argv.slice(2)
    const options: PipelineTestOptions = {
        documentCount: 10,
        concurrency: 5,
    }

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--count' && args[i + 1]) {
            options.documentCount = parseInt(args[i + 1], 10)
            i++
        } else if (args[i] === '--concurrency' && args[i + 1]) {
            options.concurrency = parseInt(args[i + 1], 10)
            i++
        }
    }
    return options
}

function calculatePercentiles(latencies: number[]) {
    if (latencies.length === 0) return { p50: 0, p90: 0, p95: 0, p99: 0 }
    const sorted = [...latencies].sort((a, b) => a - b)
    const p = (pct: number) => sorted[Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length))]
    return {
        p50: Math.round(p(50)),
        p90: Math.round(p(90)),
        p95: Math.round(p(95)),
        p99: Math.round(p(99)),
    }
}

export async function runPipelineStressTest() {
    const opts = parseCliArgs()
    const testSessionId = `stress-pipeline-${Date.now()}`
    const testProjectId = `stress-pipeline-project-${Date.now()}`

    console.log('='.repeat(80))
    console.log('⚡ MERGEWORKS LAYER 3: PIPELINE QUEUE REGISTRATION STRESS TEST')
    console.log(`⚡ Session: ${testSessionId} | Documents: ${opts.documentCount} | Concurrency: ${opts.concurrency}`)
    console.log('⚡ Zero-Token Mode: Tests durable queue registration without invoking n8n or an LLM')
    console.log('='.repeat(80))

    const limit = pLimit(opts.concurrency)
    const webhookAcceptanceLatencies: number[] = []
    let acceptanceFailures = 0
    const testRequestIds: string[] = []

    // =========================================================================
    // Part A: Parallel Batch Document Ingestion / Webhook Dispatch
    // =========================================================================
    console.log(`\n▶ Part A: Dispatching ${opts.documentCount} concurrent document intake requests (simulating multi-file deal packet)...`)

    const intakeTasks = Array.from({ length: opts.documentCount }).map((_, index) =>
        limit(async () => {
            const requestId = `stress-pipe-${Date.now()}-${index}`
            testRequestIds.push(requestId)
            const start = Date.now()

            try {
                // Register durable history row in Supabase first (matching submitDealPacket contract)
                const { error } = await supabase.from('documents').insert({
                    request_id: requestId,
                    project_id: testProjectId,
                    deal_name: 'Pipeline Stress Test Co',
                    company_name: 'Pipeline Stress Test Co',
                    workstream: 'Financial Diligence',
                    submission_notes: `Stress test batch item ${index + 1}`,
                    analyst_name: 'Pipeline Load Harness',
                    analyst_email: 'stress-tester@mergeworks.local',
                    document_type: 'Income Statement (P&L)',
                    file_name: `stress_financial_statement_${index + 1}.pdf`,
                    file_size: 1024 * 150,
                    file_type: 'application/pdf',
                    trigger_timestamp: new Date().toISOString(),
                    received_at: new Date().toISOString(),
                    status: 'queued',
                    environment: 'test',
                    submission_batch_id: testSessionId,
                    expected_batch_document_count: opts.documentCount,
                })

                if (!error) {
                    webhookAcceptanceLatencies.push(Date.now() - start)
                } else {
                    acceptanceFailures++
                }
            } catch {
                acceptanceFailures++
            }
        })
    )

    const startTime = Date.now()
    await Promise.all(intakeTasks)
    const totalDuration = (Date.now() - startTime) / 1000
    const throughputRps = Math.round(opts.documentCount / (totalDuration || 1))
    const stats = calculatePercentiles(webhookAcceptanceLatencies)

    // =========================================================================
    // Part B: Simulated Queue Lifecycle & Watchdog Verification
    // =========================================================================
    console.log(`▶ Part B: Verifying queue status and database integrity across ${opts.documentCount} records...`)

    const { data: batchDocs, error: queryError } = await supabase
        .from('documents')
        .select('request_id, status, is_considered, environment')
        .eq('project_id', testProjectId)

    const registeredCount = batchDocs?.length || 0
    const isIntegrityValid = !queryError && registeredCount === opts.documentCount

    console.log(`   - Documents registered in batch: ${registeredCount} / ${opts.documentCount}`)
    console.log(`   - Integrity check: ${isIntegrityValid ? '✅ VALID (No lost or dropped documents)' : '❌ INVALID'}`)

    // =========================================================================
    // Part C: Automated Purge & Cleanup Routine
    // =========================================================================
    console.log(`\n🧹 Running Automated Cleanup Routine (Purging pipeline test records)...`)
    try {
        const { count: deletedCount } = await supabase
            .from('documents')
            .delete({ count: 'exact' })
            .eq('project_id', testProjectId)

        console.log(`✅ Purged ${deletedCount || 0} temporary test documents. Database clean, $0 token spend.`)
    } catch (cleanupErr) {
        console.warn('⚠️ Cleanup warning:', cleanupErr)
    }

    // Print summary table
    console.log('\n' + '='.repeat(80))
    console.log('📊 LAYER 3: PIPELINE QUEUE REGISTRATION BENCHMARK SUMMARY')
    console.log('='.repeat(80))
    console.table([
        {
            Pipeline: 'Supabase Batch Registration Queue',
            'Total Docs': opts.documentCount,
            Concurrency: opts.concurrency,
            RPS: throughputRps,
            'P50 (ms)': stats.p50,
            'P95 (ms)': stats.p95,
            'P99 (ms)': stats.p99,
            Failures: acceptanceFailures,
            'Queue Integrity': isIntegrityValid ? '100% Retained' : 'Degraded',
            Cost: '$0.00 (Zero Token Mock)',
        },
    ])

    const isPass = acceptanceFailures === 0 && isIntegrityValid
    console.log(`\nOverall Layer 3 Status: ${isPass ? '✅ PASS - Pipeline queue absorbed batch with zero dropped rows' : '⚠️ WARN - Pipeline experienced degradation'}\n`)

    return {
        documentCount: opts.documentCount,
        concurrency: opts.concurrency,
        stats,
        acceptanceFailures,
        registeredCount,
        isPass,
    }
}

if (process.env.MERGEWORKS_STRESS_ENTRY === 'stress-test-pipeline.ts') {
    void runPipelineStressTest().catch((err) => {
        console.error('Fatal pipeline stress test error:', err)
        process.exit(1)
    })
}
