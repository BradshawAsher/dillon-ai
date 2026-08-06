import { supabase } from './backend/supabaseClient'
import * as fs from 'fs'

async function run() {
  const { data, error } = await supabase
    .from('documents')
    .select('file_name, extracted_json, status')
    .eq('project_id', 'project-20260806-a44a8d3b')

  if (error) {
    console.error(error)
    return
  }

  const documents = (data || []).map((d) => ({
    fileName: d.file_name,
    extractedJson: typeof d.extracted_json === 'string' ? d.extracted_json : JSON.stringify(d.extracted_json),
    status: d.status,
  }))

  const payload = {
    business: 'WidgetCo Forensic Set',
    projectId: 'project-20260806-a44a8d3b',
    evaluatedAt: new Date().toISOString(),
    documents,
  }

  fs.writeFileSync('test_sets/results/widgetco_actual_run.json', JSON.stringify(payload, null, 2))
  console.log('Successfully saved widgetco_actual_run.json with', documents.length, 'documents!')
}

run().catch(console.error)
