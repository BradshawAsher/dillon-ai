import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'harvested_commits.json'), 'utf-8'))

console.log(`Total commits: ${data.length}`)

// Show a distribution of commit messages
const messageSamples = data.map(c => ({
    index: c.index,
    sha: c.sha.substring(0, 7),
    oldMsg: c.oldMessage.split('\n')[0].substring(0, 70),
    fileCount: c.filesChanged.length,
    firstFile: c.filesChanged[0] || 'none'
}))

console.log('\n--- First 10 Commits ---')
console.table(messageSamples.slice(0, 10))

console.log('\n--- Commits 100-110 ---')
console.table(messageSamples.slice(100, 110))

console.log('\n--- Commits 250-260 ---')
console.table(messageSamples.slice(250, 260))

console.log('\n--- Last 10 Commits ---')
console.table(messageSamples.slice(-10))
