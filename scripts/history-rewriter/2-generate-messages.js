// scripts/history-rewriter/2-generate-messages.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('--- Generating Clean Conventional Commit Messages ---')

const harvestedPath = path.join(__dirname, 'harvested_commits.json')
if (!fs.existsSync(harvestedPath)) {
    console.error('harvested_commits.json not found! Run 1-harvest-commits.js first.')
    process.exit(1)
}

const commits = JSON.parse(fs.readFileSync(harvestedPath, 'utf-8'))
console.log(`Loaded ${commits.length} commits.`)

function deriveCommitMessage(c, index, allCommits) {
    const oldMsg = c.oldMessage.trim()
    const files = c.filesChanged || []
    const firstLine = oldMsg.split('\n')[0].trim()

    // If the message is already highly descriptive conventional commit, polish it
    const isAlreadyGoodConventional = /^(feat|fix|refactor|perf|test|docs|chore|eval|style|ci|build)(\([a-zA-Z0-9_-]+\))?:\s+.{10,}/i.test(firstLine)

    // Helper: detect scopes
    const hasFrontend = files.some(f => f.startsWith('frontend/'))
    const hasBackend = files.some(f => f.startsWith('backend/') || f.startsWith('api/'))
    const hasEvals = files.some(f => f.includes('eval') || f.includes('test_sets') || f.includes('ground_truth') || f.includes('benchmark'))
    const hasDocs = files.every(f => f.endsWith('.md') || f.startsWith('docs/'))
    const hasTodos = files.some(f => f.includes('TODO') || f.includes('todo') || f.includes('FAILURE_CASES'))
    const hasScripts = files.some(f => f.startsWith('scripts/'))
    const hasN8n = files.some(f => f.toLowerCase().includes('n8n') || f.includes('workflow'))
    const hasSupabase = files.some(f => f.toLowerCase().includes('supabase') || f.includes('migration'))

    // Component-level scopes
    const components = files.map(f => {
        const m = f.match(/frontend\/components\/(?:views\/)?([A-Za-z0-9_-]+)/)
        return m ? m[1] : null
    }).filter(Boolean)

    let primaryScope = 'core'
    if (components.length > 0) {
        const comp = components[0].toLowerCase()
        if (comp.includes('toc') || comp.includes('sidebar')) primaryScope = 'toc'
        else if (comp.includes('synthesis')) primaryScope = 'synthesis'
        else if (comp.includes('header') || comp.includes('cockpit')) primaryScope = 'header'
        else if (comp.includes('kpi') || comp.includes('dealoverview')) primaryScope = 'kpi'
        else if (comp.includes('intake') || comp.includes('upload') || comp.includes('dropzone')) primaryScope = 'intake'
        else if (comp.includes('evidence') || comp.includes('citation')) primaryScope = 'evidence'
        else if (comp.includes('chat') || comp.includes('faq')) primaryScope = 'chat'
        else if (comp.includes('spending') || comp.includes('vendor')) primaryScope = 'spending'
        else if (comp.includes('model') || comp.includes('valuation')) primaryScope = 'valuation'
        else if (comp.includes('eval') || comp.includes('benchmark')) primaryScope = 'evals'
        else primaryScope = comp.replace(/card|panel|tab|view|modal/g, '') || 'ui'
    } else if (hasEvals) {
        primaryScope = 'evals'
    } else if (hasBackend) {
        primaryScope = 'pipeline'
    } else if (hasDocs && !hasFrontend && !hasBackend) {
        primaryScope = hasTodos ? 'todos' : 'docs'
    } else if (hasScripts) {
        primaryScope = 'scripts'
    } else if (hasFrontend) {
        primaryScope = 'ui'
    }

    // Identify action type: feat / fix / docs / eval / chore / refactor / wip
    let type = 'feat'
    const lowMsg = oldMsg.toLowerCase()

    if (hasDocs && !hasFrontend && !hasBackend && !hasScripts) {
        type = hasTodos ? 'chore' : 'docs'
    } else if (hasEvals && !hasFrontend && !hasBackend) {
        type = 'eval'
    } else if (lowMsg.includes('fix') || lowMsg.includes('bug') || lowMsg.includes('issue') || lowMsg.includes('correct') || lowMsg.includes('resolve') || lowMsg.includes('patch')) {
        type = 'fix'
    } else if (lowMsg.includes('refactor') || lowMsg.includes('clean') || lowMsg.includes('organize') || lowMsg.includes('reorganize')) {
        type = 'refactor'
    } else if (lowMsg.includes('perf') || lowMsg.includes('speed') || lowMsg.includes('fast')) {
        type = 'perf'
    } else if (lowMsg.includes('test') || lowMsg.includes('ground truth')) {
        type = 'eval'
    } else if (lowMsg.includes('wip') || lowMsg.includes('working') || lowMsg === 'a' || lowMsg === 'yes' || lowMsg === 'work') {
        // Intermediate commit
        type = (c.numStatSummary.added > 50 || c.numStatSummary.deleted > 50) ? 'refactor' : 'fix'
    }

    // Build specific meaningful message description
    let subject = ''

    if (isAlreadyGoodConventional) {
        return firstLine
    }

    // Special cases based on commit content & files
    if (files.length === 1 && files[0].includes('TODO')) {
        return `chore(todos): update project milestones and outstanding tasks`
    }
    if (files.length === 1 && files[0] === 'GEMINI.md') {
        return `docs(gemini): update agent instructions and protocol guidelines`
    }
    if (files.length === 1 && files[0] === 'FAILURE_CASES.md') {
        return `eval(reports): update failure cases tracker and regression log`
    }
    if (files.length === 1 && files[0].endsWith('package.json')) {
        return `chore(deps): update project dependencies and build scripts`
    }

    // Specific thematic heuristics
    if (lowMsg.includes('dillon')) {
        return 'feat(branding): update Dillon AI brand identity and diligence cockpit headers'
    }
    if (lowMsg === 'ui improvements' || lowMsg.includes('beautif')) {
        return 'feat(ui): polish card layouts, visual hierarchy, and component aesthetics'
    }
    if (lowMsg.includes('refinement') || lowMsg.includes('polish')) {
        return `refactor(${primaryScope}): polish component styling, type safety, and error handling`
    }
    if (lowMsg.includes('more cards') || lowMsg.includes('cards')) {
        return 'feat(kpi): add interactive diligence cards, valuation charts, and summary metrics'
    }
    if (lowMsg.includes('vercel')) {
        return 'ci(vercel): configure production deployment and serverless build settings'
    }

    // Generate descriptive summary based on files and oldMsg
    const fileBaseNames = files.slice(0, 3).map(f => path.basename(f, path.extname(f)))

    if (primaryScope === 'toc') {
        if (type === 'fix') subject = 'prevent layout overlap and improve responsive section navigation'
        else subject = 'enhance table of contents layout, width controls, and section anchors'
    } else if (primaryScope === 'synthesis') {
        if (type === 'fix') subject = 'resolve synthesis verdict rendering and multi-hop conflict extraction'
        else subject = 'add project synthesis pass with negotiation levers and verdict badges'
    } else if (primaryScope === 'header') {
        if (type === 'fix') subject = 'fix header layout clearance and eliminate backdrop scroll flicker'
        else subject = 'update diligence cockpit header with live stage and pipeline status'
    } else if (primaryScope === 'kpi' || primaryScope === 'valuation') {
        if (type === 'fix') subject = 'align financial metrics and adjusted EBITDA calculations'
        else subject = 'implement financial valuation model, sensitivity tables, and KPI cards'
    } else if (primaryScope === 'evidence') {
        if (type === 'fix') subject = 'resolve source document citation links and snippet drawer preview'
        else subject = 'integrate evidence citations drawer with direct snippet inspection'
    } else if (primaryScope === 'evals') {
        if (files.some(f => f.includes('ground_truth'))) {
            const docName = files.find(f => f.includes('ground_truth'))
            const cleanName = path.basename(docName || '', '.json').replace(/_/g, ' ')
            subject = `update ground truth specifications for ${cleanName || 'benchmark test suite'}`
        } else {
            subject = 'enhance evaluation runner, regression gates, and scoring thresholds'
        }
    } else if (primaryScope === 'pipeline') {
        if (type === 'fix') subject = 'fix document submission processing and polling state recovery'
        else subject = 'integrate multi-document intake pipeline with n8n and Supabase endpoints'
    } else if (primaryScope === 'spending') {
        subject = 'implement spending analytics, vendor concentration charts, and categorization'
    } else if (primaryScope === 'chat') {
        subject = 'integrate AI deal diligence chat panel and question answering workflow'
    } else if (primaryScope === 'intake') {
        subject = 'enhance document drag-and-drop intake, classification badges, and status tracker'
    } else {
        // General fallback with meaningful context
        if (oldMsg.length > 5 && !['work', 'working', 'yes', 'a', 'fix', 'update', 'test'].includes(lowMsg)) {
            const cleanOld = firstLine.replace(/^(feat|fix|chore|docs|refactor):\s*/i, '').trim()
            subject = cleanOld.charAt(0).toLowerCase() + cleanOld.slice(1)
        } else {
            const targetNames = fileBaseNames.join(', ')
            subject = `update ${targetNames || 'core application components'}`
        }
    }

    // Clean up subject format
    subject = subject.replace(/\.+$/, '').trim()
    if (subject.length > 72) {
        subject = subject.substring(0, 72).replace(/\s+\S*$/, '')
    }

    return `${type}(${primaryScope}): ${subject}`
}

const mapping = []

for (let i = 0; i < commits.length; i++) {
    const c = commits[i]
    const newMsg = deriveCommitMessage(c, i, commits)

    mapping.push({
        index: c.index,
        sha: c.sha,
        shortSha: c.sha.substring(0, 7),
        oldMessage: c.oldMessage,
        newMessage: newMsg,
        author: c.author,
        committer: c.committer,
        treeSha: c.treeSha,
        parents: c.parents,
        filesChanged: c.filesChanged,
        stats: c.numStatSummary
    })
}

const mappingPath = path.join(__dirname, 'commits_mapping.json')
fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf-8')

// Create human-readable markdown preview table
const previewLines = [
    '# Commits Mapping Preview',
    '',
    `Total Commits: **${mapping.length}**`,
    '',
    '| # | Short SHA | Old Message | New Conventional Commit Message | Files Changed |',
    '| :--- | :--- | :--- | :--- | :--- |'
]

for (const m of mapping.slice(0, 50)) {
    const oldBrief = m.oldMessage.split('\n')[0].replace(/\|/g, '/').substring(0, 40)
    const newBrief = m.newMessage.replace(/\|/g, '/')
    previewLines.push(`| ${m.index} | \`${m.shortSha}\` | ${oldBrief} | **${newBrief}** | ${m.filesChanged.length} |`)
}

previewLines.push(`| ... | ... | *(${mapping.length - 100} commits omitted from markdown summary)* | ... | ... |`)

for (const m of mapping.slice(-50)) {
    const oldBrief = m.oldMessage.split('\n')[0].replace(/\|/g, '/').substring(0, 40)
    const newBrief = m.newMessage.replace(/\|/g, '/')
    previewLines.push(`| ${m.index} | \`${m.shortSha}\` | ${oldBrief} | **${newBrief}** | ${m.filesChanged.length} |`)
}

const previewPath = path.join(__dirname, 'commits_mapping_preview.md')
fs.writeFileSync(previewPath, previewLines.join('\n'), 'utf-8')

console.log(`Generated mapping for all ${mapping.length} commits!`)
console.log(`Saved mapping JSON: ${mappingPath}`)
console.log(`Saved preview Markdown: ${previewPath}`)
