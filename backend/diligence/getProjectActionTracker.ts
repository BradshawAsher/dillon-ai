type Params = { projectId: string }

export default async function getProjectActionTracker(req: { params: Params; user: User }) {
  const projectId = req.params.projectId?.trim()
  if (!projectId) throw new Error('projectId is required')
  const response = await n8nFinancialAgent.rawRequest<unknown>({
    path: `webhook/dd-project-action-tracker?projectId=${encodeURIComponent(projectId)}`,
    method: 'GET',
  })
  const rows = Array.isArray(response.data) ? response.data : []
  return rows[0] ?? null
}
