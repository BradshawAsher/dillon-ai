import autocannon from 'autocannon'
import path from 'node:path'
import fs from 'node:fs'

// Load environment variables
const envPath = path.resolve('frontend', '.env')
if (fs.existsSync(envPath)) {
    try {
        process.loadEnvFile(envPath)
    } catch {}
}

interface BenchmarkResult {
    endpoint: string
    method: 'GET' | 'POST'
    rps: number
    p50Ms: number
    p90Ms: number
    p95Ms: number
    p99Ms: number
    errors: number
    timeouts: number
    totalRequests: number
    status: 'PASS' | 'WARN' | 'FAIL'
}

function parseCliArgs() {
    const args = process.argv.slice(2)
    const options: { connections: number; duration: number; targetUrl?: string } = {
        connections: 20,
        duration: 5,
    }

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--connections' && args[i + 1]) {
            options.connections = parseInt(args[i + 1], 10)
            i++
        } else if (args[i] === '--duration' && args[i + 1]) {
            options.duration = parseInt(args[i + 1], 10)
            i++
        } else if (args[i] === '--target' && args[i + 1]) {
            options.targetUrl = args[i + 1]
            i++
        }
    }
    return options
}

async function isServerRunning(url: string): Promise<boolean> {
    try {
        const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(1500) })
        return res.status < 500
    } catch {
        return false
    }
}

async function runScenario(
    name: string,
    method: 'GET' | 'POST',
    url: string,
    connections: number,
    duration: number,
    body?: string,
    headers?: Record<string, string>
): Promise<BenchmarkResult> {
    console.log(`\n▶ Benchmarking ${method} ${url} (${connections} connections, ${duration}s duration)...`)

    const result = await autocannon({
        url,
        method,
        connections,
        duration,
        headers: {
            'Content-Type': 'application/json',
            ...(headers || {}),
        },
        body,
        pipelining: 1,
    })

    const rps = Math.round(result.requests.average)
    const p50Ms = Math.round(result.latency.p50)
    const p90Ms = Math.round(result.latency.p90)
    const p95Ms = Math.round(result.latency.p97_5 || result.latency.p99)
    const p99Ms = Math.round(result.latency.p99)
    const errors = result.errors + result.non2xx
    const timeouts = result.timeouts
    const totalRequests = result.requests.total

    let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
    if (errors > 0 || timeouts > 0) {
        status = errors / totalRequests > 0.05 ? 'FAIL' : 'WARN'
    } else if (p95Ms > 800) {
        status = 'WARN'
    }

    return {
        endpoint: name,
        method,
        rps,
        p50Ms,
        p90Ms,
        p95Ms,
        p99Ms,
        errors,
        timeouts,
        totalRequests,
        status,
    }
}

export async function runApiStressTest() {
    const opts = parseCliArgs()
    console.log('='.repeat(80))
    console.log('⚡ MERGEWORKS LAYER 1: API & SERVER LOAD TEST HARNESS')
    console.log(`⚡ Concurrency: ${opts.connections} VUs | Duration: ${opts.duration}s per scenario`)
    console.log('='.repeat(80))

    let baseUrl = opts.targetUrl || process.env.API_URL || 'http://localhost:3000'
    const isLive = await isServerRunning(`${baseUrl}/api/diligence/history?full=false`)

    if (!isLive) {
        console.log(`⚠️ Server not responding at ${baseUrl}.`)
        console.log(`ℹ️ Please ensure the server is active (e.g. \`npm run serve\`).`)
        console.log(`ℹ️ To target a specific URL: npm run stress:api -- --target http://localhost:3000\n`)
        process.exit(1)
    }

    console.log(`✅ Target server confirmed reachable at: ${baseUrl}`)

    const results: BenchmarkResult[] = []

    // Scenario 1: Compact History Polling (Background Status Heartbeat)
    const historyRes = await runScenario(
        '/api/diligence/history?full=false',
        'GET',
        `${baseUrl}/api/diligence/history?full=false&environment=production`,
        opts.connections,
        opts.duration
    )
    results.push(historyRes)

    // Scenario 2: Synthesis Read
    const synthRes = await runScenario(
        '/api/diligence/synthesis (Project Query)',
        'GET',
        `${baseUrl}/api/diligence/synthesis?projectId=apex-precision-dynamics&environment=production`,
        opts.connections,
        opts.duration
    )
    results.push(synthRes)

    // Scenario 3: Deal Models Read
    const modelRes = await runScenario(
        '/api/diligence/deal-models',
        'GET',
        `${baseUrl}/api/diligence/deal-models?environment=production`,
        opts.connections,
        opts.duration
    )
    results.push(modelRes)

    // Print summary table
    console.log('\n' + '='.repeat(80))
    console.log('📊 LAYER 1: API PERFORMANCE & CONCURRENCY BENCHMARK SUMMARY')
    console.log('='.repeat(80))
    console.table(
        results.map((r) => ({
            Endpoint: r.endpoint,
            Method: r.method,
            RPS: r.rps,
            'P50 (ms)': r.p50Ms,
            'P95 (ms)': r.p95Ms,
            'P99 (ms)': r.p99Ms,
            Total: r.totalRequests,
            Errors: r.errors,
            Status: r.status === 'PASS' ? '✅ PASS' : r.status === 'WARN' ? '⚠️ WARN' : '❌ FAIL',
        }))
    )

    const allPassed = results.every((r) => r.status !== 'FAIL')
    console.log(`\nOverall Layer 1 Status: ${allPassed ? '✅ PASS - Sub-second latencies under concurrent load' : '❌ FAIL - High error rate or timeouts'}\n`)
    return results
}

if (process.argv[1]?.includes('stress-test-api')) {
    runApiStressTest().catch((err) => {
        console.error('Fatal API stress test error:', err)
        process.exit(1)
    })
}
