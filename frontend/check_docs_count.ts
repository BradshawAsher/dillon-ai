import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eubmgtgwckksptffpogk.supabase.co'
const supabaseKey = 'REDACTED_LEGACY_ANON_KEY'

async function checkDocsPerBusiness() {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: docs, error } = await supabase.from('documents').select('project_id, file_name, status')
    if (error) {
        console.error("Error fetching docs:", error)
        return
    }

    const projectCounts: Record<string, { total: number, files: string[] }> = {}
    docs.forEach(d => {
        const pid = d.project_id || 'unknown'
        if (!projectCounts[pid]) projectCounts[pid] = { total: 0, files: [] }
        projectCounts[pid].total++
        projectCounts[pid].files.push(d.file_name)
    })

    console.log("Documents per project in Supabase `documents` table:")
    console.table(Object.entries(projectCounts).map(([pid, info]) => ({
        projectId: pid,
        totalDocs: info.total,
        sampleFiles: info.files.slice(0, 3).join(', ')
    })))
}

checkDocsPerBusiness()
