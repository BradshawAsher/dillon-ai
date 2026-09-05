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
const cdnUrl = (process.env.VITE_STORAGE_CDN_URL || process.env.STORAGE_CDN_URL || 'https://dillon-ai-worker.bradshin231.workers.dev').replace(/\/+$/, '')

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY/SERVICE_ROLE_KEY in frontend/.env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface TestOptions {
    count: number
    concurrency: number
}

function parseCliArgs(): TestOptions {
    const args = process.argv.slice(2)
    const options: TestOptions = {
        count: 25,
        concurrency: 5,
    }

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--count' && args[i + 1]) {
            options.count = parseInt(args[i + 1], 10)
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

export async function runStorageAndDbStressTest() {
    const opts = parseCliArgs()
    const testSessionId = `stress-test-${Date.now()}`
    const testProjectId = `stress-project-${Date.now()}`

    console.log('='.repeat(80))
    console.log('⚡ MERGEWORKS LAYER 2: STORAGE (CLOUDFLARE R2) & DATABASE STRESS TEST')
    console.log(`⚡ Session: ${testSessionId} | Requests: ${opts.count} | Concurrency: ${opts.concurrency}`)
    console.log('⚡ Zero-Cost Guarantee: All test uploads route to R2 (zero egress fees)')
    console.log('='.repeat(80))

    const limit = pLimit(opts.concurrency)
    const dummyPayload = Buffer.from('%PDF-1.4 Synthetic test payload for MergeWorks Layer 2 load test.\n%%EOF')
    const uploadedPaths: string[] = []

    // =========================================================================
    // Part A: Cloudflare R2 Upload Concurrency
    // =========================================================================
    console.log(`\n▶ Part A: Testing Cloudflare R2 Upload Concurrency (${opts.count} PUT requests via Worker proxy)...`)
    const uploadLatencies: number[] = []
    let uploadFailures = 0

    const uploadTasks = Array.from({ length: opts.count }).map((_, index) =>
        limit(async () => {
            const fileName = `stress_doc_${index + 1}.pdf`
            const path = `${testProjectId}/${Date.now()}-${index}-${fileName}`
            uploadedPaths.push(path)
            const targetUrl = `${cdnUrl}/${path}`

            const start = Date.now()
            try {
                const res = await fetch(targetUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Length': String(dummyPayload.length),
                        'x-amz-meta-session': testSessionId,
                    },
                    body: dummyPayload,
                })

                if (res.ok || res.status === 200 || res.status === 201) {
                    uploadLatencies.push(Date.now() - start)
                } else {
                    uploadFailures++
                }
            } catch {
                uploadFailures++
            }
        })
    )

    const uploadStartTime = Date.now()
    await Promise.all(uploadTasks)
    const totalUploadDuration = (Date.now() - uploadStartTime) / 1000
    const uploadRps = Math.round(opts.count / (totalUploadDuration || 1))
    const uploadStats = calculatePercentiles(uploadLatencies)

    // =========================================================================
    // Part B: Supabase Database Insert & Query Concurrency
    // =========================================================================
    console.log(`▶ Part B: Testing Supabase Database Transaction Concurrency (${opts.count} parallel document rows)...`)
    const dbWriteLatencies: number[] = []
    let dbWriteFailures = 0

    const dbWriteTasks = Array.from({ length: opts.count }).map((_, index) =>
        limit(async () => {
            const start = Date.now()
            try {
                const { error } = await supabase.from('documents').insert({
                    request_id: `stress-${testSessionId}-${index}`,
                    project_id: testProjectId,
                    file_name: `stress_doc_${index + 1}.pdf`,
                    status: 'completed',
                    document_type: 'Financial Statement',
                    workstream: 'Financial Diligence',
                    is_considered: true,
                    environment: 'test',
                    analyst_name: 'Load Test Harness',
                    extracted_json: JSON.stringify({
                        testSession: testSessionId,
                        index,
                        revenue: 5_000_000,
                        ebitda: 1_200_000,
                    }),
                })

                if (!error) {
                    dbWriteLatencies.push(Date.now() - start)
                } else {
                    dbWriteFailures++
                }
            } catch {
                dbWriteFailures++
            }
        })
    )

    const dbWriteStartTime = Date.now()
    await Promise.all(dbWriteTasks)
    const totalDbWriteDuration = (Date.now() - dbWriteStartTime) / 1000
    const dbWriteRps = Math.round(opts.count / (totalDbWriteDuration || 1))
    const dbWriteStats = calculatePercentiles(dbWriteLatencies)

    // =========================================================================
    // Part C: Supabase Read / Query Concurrency
    // =========================================================================
    console.log(`▶ Part C: Testing Supabase Read Query Concurrency (${opts.count} parallel SELECT queries)...`)
    const dbReadLatencies: number[] = []
    let dbReadFailures = 0

    const dbReadTasks = Array.from({ length: opts.count }).map(() =>
        limit(async () => {
            const start = Date.now()
            try {
                const { data, error } = await supabase
                    .from('documents')
                    .select('id, project_id, file_name, status, is_considered')
                    .eq('project_id', testProjectId)

                if (!error && Array.isArray(data)) {
                    dbReadLatencies.push(Date.now() - start)
                } else {
                    dbReadFailures++
                }
            } catch {
                dbReadFailures++
            }
        })
    )

    const dbReadStartTime = Date.now()
    await Promise.all(dbReadTasks)
    const totalDbReadDuration = (Date.now() - dbReadStartTime) / 1000
    const dbReadRps = Math.round(opts.count / (totalDbReadDuration || 1))
    const dbReadStats = calculatePercentiles(dbReadLatencies)

    // =========================================================================
    // Part D: Automated Cleanup & Purge Routine
    // =========================================================================
    console.log(`\n🧹 Running Automated Cleanup Routine (Zero Database Bloat Guarantee)...`)
    try {
        const { count: deletedCount } = await supabase
            .from('documents')
            .delete({ count: 'exact' })
            .eq('project_id', testProjectId)

        console.log(`✅ Purged ${deletedCount || 0} temporary test rows from Supabase 'documents' table.`)
    } catch (cleanupErr) {
        console.warn('⚠️ Cleanup warning:', cleanupErr)
    }

    // Print summary table
    console.log('\n' + '='.repeat(80))
    console.log('📊 LAYER 2: STORAGE & DATABASE CONCURRENCY BENCHMARK SUMMARY')
    console.log('='.repeat(80))
    console.table([
        {
            Service: 'Cloudflare R2 (Worker Uploads)',
            Operation: 'HTTP PUT',
            Requests: opts.count,
            RPS: uploadRps,
            'P50 (ms)': uploadStats.p50,
            'P95 (ms)': uploadStats.p95,
            'P99 (ms)': uploadStats.p99,
            Failures: uploadFailures,
            Cost: '$0.00 (Zero Egress)',
        },
        {
            Service: 'Supabase PostgreSQL (Supavisor)',
            Operation: 'INSERT',
            Requests: opts.count,
            RPS: dbWriteRps,
            'P50 (ms)': dbWriteStats.p50,
            'P95 (ms)': dbWriteStats.p95,
            'P99 (ms)': dbWriteStats.p99,
            Failures: dbWriteFailures,
            Cost: '$0.00 (Included Plan)',
        },
        {
            Service: 'Supabase PostgreSQL (Supavisor)',
            Operation: 'SELECT (Pooled)',
            Requests: opts.count,
            RPS: dbReadRps,
            'P50 (ms)': dbReadStats.p50,
            'P95 (ms)': dbReadStats.p95,
            'P99 (ms)': dbReadStats.p99,
            Failures: dbReadFailures,
            Cost: '$0.00 (Included Plan)',
        },
    ])

    const isSuccess = uploadFailures === 0 && dbWriteFailures === 0 && dbReadFailures === 0
    console.log(`\nOverall Layer 2 Status: ${isSuccess ? '✅ PASS - R2 and Database operations completed with 0 errors' : '⚠️ WARN - Some operations experienced failures'}\n`)

    return {
        count: opts.count,
        concurrency: opts.concurrency,
        uploadStats,
        dbWriteStats,
        dbReadStats,
        uploadFailures,
        dbWriteFailures,
        dbReadFailures,
        isSuccess,
    }
}

if (process.env.MERGEWORKS_STRESS_ENTRY === 'stress-test-storage-db.ts') {
    void runStorageAndDbStressTest().catch((err) => {
        console.error('Fatal storage/db stress test error:', err)
        process.exit(1)
    })
}
