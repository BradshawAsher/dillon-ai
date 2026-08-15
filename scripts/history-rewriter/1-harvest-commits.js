// scripts/history-rewriter/1-harvest-commits.js
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('--- Ultra-fast Git Log Harvest ---')

// Format: Record separator (%x1e) followed by fields separated by null byte (%x00)
// %H: commit SHA, %P: parents, %an: author name, %ae: author email, %at: author time
// %cn: committer name, %ce: committer email, %ct: committer time, %T: tree SHA, %s: subject, %b: body
const format = '%x1e%H%x00%P%x00%an%x00%ae%x00%at%x00%cn%x00%ce%x00%ct%x00%T%x00%s%x00%b%x1f'

// Run single git command
const rawOutput = execSync(`git log --reverse --format="${format}" --numstat`, {
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024
})

const records = rawOutput.split('\x1e').filter(r => r.trim().length > 0)
console.log(`Parsed ${records.length} commit records from git log.`)

const harvested = []

for (let i = 0; i < records.length; i++) {
    const record = records[i]
    const [headerAndBody, numstatBlock] = record.split('\x1f')
    if (!headerAndBody) continue

    const fields = headerAndBody.split('\x00')
    const [
        commitSha,
        parentShas,
        authorName,
        authorEmail,
        authorTime,
        committerName,
        committerEmail,
        committerTime,
        treeSha,
        subject,
        body
    ] = fields

    const fullMessage = (subject || '') + (body ? '\n\n' + body.trim() : '')

    const filesChanged = []
    const numStatSummary = { added: 0, deleted: 0 }

    if (numstatBlock) {
        const lines = numstatBlock.trim().split('\n')
        for (const line of lines) {
            const parts = line.split('\t')
            if (parts.length >= 3) {
                const added = parts[0] === '-' ? 0 : parseInt(parts[0], 10) || 0
                const deleted = parts[1] === '-' ? 0 : parseInt(parts[1], 10) || 0
                const filePath = parts[2]
                filesChanged.push(filePath)
                numStatSummary.added += added
                numStatSummary.deleted += deleted
            }
        }
    }

    harvested.push({
        index: i + 1,
        sha: commitSha ? commitSha.trim() : '',
        treeSha: treeSha ? treeSha.trim() : '',
        parents: parentShas ? parentShas.trim().split(' ').filter(Boolean) : [],
        author: {
            name: authorName,
            email: authorEmail,
            time: parseInt(authorTime, 10),
            dateStr: new Date(parseInt(authorTime, 10) * 1000).toISOString()
        },
        committer: {
            name: committerName,
            email: committerEmail,
            time: parseInt(committerTime, 10),
            dateStr: new Date(parseInt(committerTime, 10) * 1000).toISOString()
        },
        oldMessage: fullMessage.trim(),
        filesChanged,
        numStatSummary
    })
}

const outputPath = path.join(__dirname, 'harvested_commits.json')
fs.writeFileSync(outputPath, JSON.stringify(harvested, null, 2), 'utf-8')

console.log(`Successfully harvested ${harvested.length} commits to ${outputPath}`)
