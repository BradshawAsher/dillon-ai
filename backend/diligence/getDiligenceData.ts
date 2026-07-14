type DbFinding = {
  id: string
  finding_type: 'Red Flag' | 'Green Flag'
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  summary: string
  source_citation: string
  source_excerpt: string
  confidence_score: number
  workstream: string
  owner: string
  validated: boolean
  analyst_notes: string
}

export type DiligenceFinding = {
  id: string
  findingType: 'Red Flag' | 'Green Flag'
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  summary: string
  sourceCitation: string
  sourceExcerpt: string
  confidenceScore: number
  workstream: string
  owner: string
  validated: boolean
  analystNotes: string
}

export default async function getDiligenceData(_req: { params: Record<string, never>; user: User }) {
  const result = await retoolDb.query<DbFinding>(`
    SELECT
      id,
      finding_type,
      severity,
      summary,
      source_citation,
      source_excerpt,
      confidence_score,
      workstream,
      owner,
      validated,
      analyst_notes
    FROM diligence_findings
    ORDER BY id
  `)

  return result.data.map((row) => ({
    id: row.id,
    findingType: row.finding_type,
    severity: row.severity,
    summary: row.summary,
    sourceCitation: row.source_citation,
    sourceExcerpt: row.source_excerpt,
    confidenceScore: row.confidence_score,
    workstream: row.workstream,
    owner: row.owner,
    validated: row.validated,
    analystNotes: row.analyst_notes,
  }))
}
