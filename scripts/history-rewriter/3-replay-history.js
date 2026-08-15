// scripts/history-rewriter/3-replay-history.js
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('--- Replaying Git Commit Graph with Clean Messages ---')

const mappingPath = path.join(__dirname, 'commits_mapping.json')
if (!fs.existsSync(mappingPath)) {
    console.error('commits_mapping.json not found! Run 2-generate-messages.js first.')
    process.exit(1)
}

const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'))
console.log(`Loaded mapping for ${mapping.length} commits. Starting replay...`)

const oldToNew = new Map()
const targetBranch = 'main-rewritten'

const startTime = Date.now()

for (let i = 0; i < mapping.length; i++) {
    const c = mapping[i]

    // Determine new parent SHAs
    const newParents = []
    for (const oldP of c.parents) {
        if (oldToNew.has(oldP)) {
            newParents.push(oldToNew.get(oldP))
        } else {
            newParents.push(oldP)
        }
    }

    // Prepare git commit-tree arguments
    const args = ['commit-tree', c.treeSha]
    for (const p of newParents) {
        args.push('-p', p)
    }
    args.push('-m', c.newMessage)

    // Prepare exact timestamps and author info
    const env = {
        ...process.env,
        GIT_AUTHOR_NAME: c.author.name || 'BradshawAsher',
        GIT_AUTHOR_EMAIL: c.author.email || 'bradshaw.asher@gmail.com',
        GIT_AUTHOR_DATE: `${c.author.time} +0000`,
        GIT_COMMITTER_NAME: c.committer.name || 'BradshawAsher',
        GIT_COMMITTER_EMAIL: c.committer.email || 'bradshaw.asher@gmail.com',
        GIT_COMMITTER_DATE: `${c.committer.time} +0000`
    }

    const res = spawnSync('git', args, { env, encoding: 'utf-8' })
    if (res.status !== 0 || !res.stdout) {
        console.error(`Failed on commit #${c.index} (${c.sha}):`, res.stderr)
        process.exit(1)
    }

    const newSha = res.stdout.trim()
    oldToNew.set(c.sha, newSha)

    if (i % 50 === 0 || i === mapping.length - 1) {
        console.log(`Progress: ${i + 1}/${mapping.length} commits rewritten...`)
    }
}

const finalOldSha = mapping[mapping.length - 1].sha
const finalNewSha = oldToNew.get(finalOldSha)

console.log(`\nReplay complete in ${((Date.now() - startTime) / 1000).toFixed(2)}s!`)
console.log(`Final old commit: ${finalOldSha}`)
console.log(`Final new commit: ${finalNewSha}`)

// Update ref refs/heads/main-rewritten to point to finalNewSha
const refRes = spawnSync('git', ['update-ref', `refs/heads/${targetBranch}`, finalNewSha], { encoding: 'utf-8' })
if (refRes.status !== 0) {
    console.error('Failed to update ref:', refRes.stderr)
    process.exit(1)
}

console.log(`Successfully created and pointed branch '${targetBranch}' to ${finalNewSha}`)
