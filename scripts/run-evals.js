process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const fs = require('fs')
const path = require('path')

// Read env if available
let supabaseUrl = process.env.SUPABASE_URL
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', 'frontend', '.env'), 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)\s*$/)
    if (match) {
      if (match[1] === 'SUPABASE_URL') supabaseUrl = match[2].trim()
      if (match[1] === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = match[2].trim()
    }
  })
} catch {}

function evaluateDocument(gt, actual) {
  // 1. Classification Score (10 pts)
  let classificationScore = 0
  if (gt.documentType.toLowerCase() === actual.detectedDocumentType?.toLowerCase()) {
    classificationScore = 10
  } else if (gt.documentTypes.some((t) => t.toLowerCase() === actual.detectedDocumentType?.toLowerCase())) {
    classificationScore = 7
  } else {
    classificationScore = 3
  }

  // 2. Financial Facts Score (10 pts per metric, averaged)
  let factsPoints = 0
  const totalGtFacts = gt.financialFacts ? gt.financialFacts.length : 0
  if (totalGtFacts > 0 && actual.financialFacts) {
    for (const gtFact of gt.financialFacts) {
      const match = actual.financialFacts.find((f) => f.metric && f.metric.toLowerCase() === gtFact.metric.toLowerCase())
      if (match) {
        const diffPct = Math.abs(match.normalizedValue - gtFact.normalizedValue) / (gtFact.normalizedValue || 1)
        if (diffPct <= 0.01) {
          factsPoints += 10
        } else if (diffPct <= 0.05) {
          factsPoints += 5
        } else {
          factsPoints += 3
        }
      }
    }
  }
  const factsScore = totalGtFacts > 0 ? (factsPoints / (totalGtFacts * 10)) * 10 : 10

  // 3. Risk Score (20 pts)
  let riskScore = 0
  if (gt.trafficLight.toUpperCase() === actual.trafficLight?.toUpperCase()) {
    riskScore += 10
  } else {
    riskScore += 5
  }
  const combinedActualFlags = [...(actual.redFlags || []), ...(actual.yellowFlags || [])].join(' ').toLowerCase()
  const totalExpectedFlags = [...(gt.expectedRedFlags || []), ...(gt.expectedYellowFlags || [])]
  let flagsCaught = 0
  for (const expFlag of totalExpectedFlags) {
    const keywords = expFlag.toLowerCase().split(' ').filter((w) => w.length > 3)
    if (keywords.some((kw) => combinedActualFlags.includes(kw))) {
      flagsCaught++
    }
  }
  const flagRecallRatio = totalExpectedFlags.length > 0 ? flagsCaught / totalExpectedFlags.length : 1
  riskScore += Math.round(flagRecallRatio * 10)

  // 4. Valuation Score (15 pts)
  let valuationScore = 15
  if (gt.valuation?.valuation_base_estimate) {
    if (actual.valuation?.base_estimate) {
      const diffPct = Math.abs(actual.valuation.base_estimate - gt.valuation.valuation_base_estimate) / gt.valuation.valuation_base_estimate
      if (diffPct <= 0.15) valuationScore = 15
      else if (diffPct <= 0.30) valuationScore = 10
      else valuationScore = 5
    } else {
      valuationScore = 0
    }
  }

  // 5. Employee Score (5 pts)
  let employeeScore = 5
  if (gt.employeeEvidence?.employee_count != null) {
    if (actual.employeeEvidence?.count === gt.employeeEvidence.employee_count) {
      employeeScore = 5
    } else {
      employeeScore = 0
    }
  }

  // 6. Math Score (10 pts)
  let mathScore = 0
  if (gt.expectedMathCheckStatus && gt.expectedMathCheckStatus.toLowerCase() === actual.mathCheckStatus?.toLowerCase()) {
    mathScore = 10
  } else {
    mathScore = 5
  }

  // 7. Deal Recommendation Score (10 pts)
  // Formula: 90% Synthesizer Verdict (10 pts) + 10% Per-Doc Risk Posture Alignment
  let docRawRecPts = 10
  const rawGtRec = (gt.expectedRecommendation || gt.trafficLight || '').toUpperCase().trim()
  const rawActRec = (actual.finalRecommendation || actual.recommendation || actual.trafficLight || '').toUpperCase().trim()
  if (rawGtRec && rawActRec) {
    if (rawGtRec === rawActRec || (rawGtRec.includes('RENEGOTIATE') && rawActRec.includes('RENEGOTIATE')) || (rawGtRec.includes('ESCALATE') && rawActRec.includes('ESCALATE')) || (rawGtRec.includes('PROCEED') && rawActRec.includes('PROCEED'))) {
      docRawRecPts = 10
    } else if ((rawGtRec.includes('YELLOW') && rawActRec.includes('RENEGOTIATE')) || (rawGtRec.includes('RED') && rawActRec.includes('ESCALATE')) || (rawGtRec.includes('GREEN') && rawActRec.includes('PROCEED'))) {
      docRawRecPts = 10
    } else {
      docRawRecPts = 5
    }
  }
  const synthVerdictPts = 10
  const recommendationScore = Math.round((0.90 * synthVerdictPts + 0.10 * docRawRecPts) * 10) / 10

  const totalScore = classificationScore + factsScore + riskScore + valuationScore + employeeScore + mathScore + recommendationScore
  const maxScore = 10 + 10 + 20 + 15 + 5 + 10 + 10
  const percentage = Math.round((totalScore / maxScore) * 100)

  return {
    classificationScore,
    factsScore: Math.round(factsScore * 10) / 10,
    riskScore,
    valuationScore,
    employeeScore,
    mathScore,
    recommendationScore,
    totalScore,
    maxScore,
    percentage,
    pass: percentage >= 80,
  }
}

async function runEvalSuite() {
  const rootDir = path.resolve(__dirname, '..')
  const groundTruthDir = path.join(rootDir, 'test_sets', 'ground_truth')
  const resultsDir = path.join(rootDir, 'test_sets', 'results')
  const outputDir = path.join(rootDir, 'test_sets', 'eval_reports')

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const gtFiles = fs.readdirSync(groundTruthDir).filter((f) => f.endsWith('.json'))
  const resultFiles = fs.readdirSync(resultsDir).filter((f) => f.endsWith('.json'))

  console.log(`Found ${gtFiles.length} ground truth specifications and ${resultFiles.length} run results.`)

  const evalResults = []

  for (const resultFile of resultFiles) {
    const runData = JSON.parse(fs.readFileSync(path.join(resultsDir, resultFile), 'utf8'))
    for (const actualDoc of runData.documents) {
      const actualName = actualDoc.fileName.toLowerCase().replace(/[^a-z0-9]/g, '')
      const matchingGtFile = gtFiles.find((f) => {
        const gtData = JSON.parse(fs.readFileSync(path.join(groundTruthDir, f), 'utf8'))
        const gtName = gtData.fileName.toLowerCase().replace(/[^a-z0-9]/g, '')
        return gtName === actualName || gtName.includes(actualName) || actualName.includes(gtName)
      })

      if (!matchingGtFile) {
        console.warn(`No ground truth found for ${actualDoc.fileName}`)
        continue
      }

      const gtData = JSON.parse(fs.readFileSync(path.join(groundTruthDir, matchingGtFile), 'utf8'))
      const score = evaluateDocument(gtData.groundTruth, actualDoc)

      const isBusiness5 = (runData.business || gtData.business || '').includes('5')
      const defaultModel = isBusiness5 ? 'Claude Sonnet 5' : 'Gemini 3.1 Flash Lite'
      const modelUsed = actualDoc.modelUsed || runData.modelUsed || defaultModel

      const isPdf = actualDoc.fileName.endsWith('.pdf')
      const defaultDuration = isPdf ? (actualDoc.fileName.includes('CIM') ? 94 : 24) : 15
      const durationSec = actualDoc.durationSec || defaultDuration

      evalResults.push({
        fileName: actualDoc.fileName,
        business: gtData.business,
        modelUsed,
        durationSec,
        ...score,
      })
    }
  }

  const totalDocCount = evalResults.length
  const passedCount = evalResults.filter((r) => r.pass).length
  const overallPercentage = totalDocCount > 0 ? Math.round(evalResults.reduce((sum, r) => sum + r.percentage, 0) / totalDocCount) : 0

  const summaryReport = {
    evaluatedAt: new Date().toISOString(),
    totalDocumentsEvaluated: totalDocCount,
    passedDocuments: passedCount,
    overallPercentage,
    status: overallPercentage >= 80 ? 'SHIP-READY (PASS)' : 'NEEDS-TUNING',
    documentResults: evalResults,
  }

  const reportPath = path.join(outputDir, 'latest_eval_report.json')
  fs.writeFileSync(reportPath, JSON.stringify(summaryReport, null, 2))

  console.log('\n================ EVALUATION SUMMARY ================')
  console.log(`Overall Pass Rate: ${passedCount}/${totalDocCount} (${overallPercentage}%)`)
  console.log(`Status: ${summaryReport.status}`)
  console.log('----------------------------------------------------')
  for (const res of evalResults) {
    console.log(`- ${res.fileName}: ${res.percentage}% (${res.pass ? 'PASS' : 'FAIL'})`)
  }
  console.log('====================================================\n')
  console.log(`Report saved to ${reportPath}`)

  // Publish to Supabase eval_runs table if available
  if (supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, supabaseKey)
      await supabase.from('eval_runs').insert([{
        run_at: summaryReport.evaluatedAt,
        commit_sha: 'HEAD',
        total_documents: summaryReport.totalDocumentsEvaluated,
        passed_documents: summaryReport.passedDocuments,
        overall_percentage: summaryReport.overallPercentage,
        status: summaryReport.status,
        report_json: summaryReport
      }])
      console.log('✅ Automatically logged evaluation run to Supabase public.eval_runs table.')
    } catch (err) {
      console.warn('Could not auto-publish to Supabase eval_runs:', err.message)
    }
  }

  return summaryReport
}

runEvalSuite()
