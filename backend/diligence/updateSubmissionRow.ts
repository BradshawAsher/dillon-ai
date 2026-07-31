import { supabase } from '../supabaseClient'

type Params = { requestID: string; action: 'nonconsidered' | 'considered'; environment?: 'production' | 'test' }

export default async function updateSubmissionRow(req: { params: Params; user: User }) {
  const requestID = req.params.requestID?.trim()
  if (!requestID) throw new Error('requestID is required')
  if (!['nonconsidered', 'considered'].includes(req.params.action)) throw new Error('action must be nonconsidered or considered')

  const isConsidered = req.params.action === 'considered'

  const { error } = await supabase
    .from('documents')
    .update({ is_considered: isConsidered })
    .eq('request_id', requestID)

  if (error) throw new Error(`Supabase write failed: ${error.message}`)
  return { ok: true }
}
