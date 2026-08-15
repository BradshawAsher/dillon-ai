// scripts/history-rewriter/4-verify-integrity.js
import { execSync } from 'child_process'

console.log('=== VERIFYING REWRITTEN REPOSITORY INTEGRITY ===\n')

let allPassed = true

function check(label, fn) {
    process.stdout.write(`- ${label}... `)
    try {
        const result = fn()
        if (result.pass) {
            console.log(`[PASS] ${result.details || ''}`)
        } else {
            console.log(`[FAIL] ${result.details || ''}`)
            allPassed = false
        }
    } catch (e) {
        console.log(`[ERROR] ${e.message}`)
        allPassed = false
    }
}

// 1. Commit count check
check('Commit count parity', () => {
    const mainCount = parseInt(execSync('git rev-list --count main', { encoding: 'utf-8' }).trim(), 10)
    const rewrittenCount = parseInt(execSync('git rev-list --count main-rewritten', { encoding: 'utf-8' }).trim(), 10)
    return {
        pass: mainCount === rewrittenCount && mainCount > 0,
        details: `main: ${mainCount}, main-rewritten: ${rewrittenCount}`
    }
})

// 2. Tree SHA check on latest commit
check('Root tree hash equivalence', () => {
    const catMain = execSync('git cat-file -p main', { encoding: 'utf-8' })
    const catRewritten = execSync('git cat-file -p main-rewritten', { encoding: 'utf-8' })
    
    const treeMain = catMain.match(/^tree\s+([0-9a-f]{40})/m)?.[1]
    const treeRewritten = catRewritten.match(/^tree\s+([0-9a-f]{40})/m)?.[1]

    return {
        pass: treeMain === treeRewritten && Boolean(treeMain),
        details: `tree SHA: ${treeMain}`
    }
})

// 3. Exact working directory diff
check('Zero code diff between branches', () => {
    const diff = execSync('git diff main..main-rewritten', { encoding: 'utf-8' }).trim()
    return {
        pass: diff.length === 0,
        details: diff.length === 0 ? '0 files different (Byte-for-byte identical)' : `${diff.length} bytes diff found!`
    }
})

// 4. Inspect latest 10 rewritten commit messages
check('Rewritten commit message structure', () => {
    const log = execSync('git log -10 --oneline main-rewritten', { encoding: 'utf-8' }).trim()
    console.log('\n\n--- Latest 10 Rewritten Commits ---')
    console.log(log)
    console.log('-----------------------------------\n')
    return {
        pass: true,
        details: '10 latest commits inspected'
    }
})

if (allPassed) {
    console.log(' SUCCESS: All integrity checks passed! The rewritten history is 100% byte-for-byte code identical.')
} else {
    console.error(' FAILED: Integrity check failures detected!')
    process.exit(1)
}
