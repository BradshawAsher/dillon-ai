type Params = { projectId: string; checklistJson?: string; questionsJson?: string }

export default async function saveProjectActionTracker(req: { params: Params; user: User }) {
  if (!req.params.projectId?.trim()) throw new Error('projectId is required')
  const response = await n8nFinancialAgent.rawRequest<unknown>({
    path: 'webhook/dd-project-action-tracker',
    method: 'POST',
    bodyType: 'form-data',
    formData: Object.entries({ ...req.params, updatedBy: req.user.email ?? '' }).map(([key, value]) => ({ key, value: value ?? '' })),
  })
  return response.data
}
