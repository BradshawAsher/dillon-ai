type Params = { requestIDs: string[]; environment?: 'production' | 'test' }

export default async function stopBatchSubmission(req: { params: Params; user: User }) {
    const requestIDs = Array.isArray(req.params.requestIDs)
        ? req.params.requestIDs.map((value) => String(value).trim()).filter((value) => value.length > 0)
        : []

    if (requestIDs.length === 0) {
        throw new Error('requestIDs is required')
    }

    const path = req.params.environment === 'test'
        ? 'webhook-test/dd-document-consideration'
        : 'webhook/dd-document-consideration'

    for (const requestID of requestIDs) {
        await n8nFinancialAgent.rawRequest<{ ok?: boolean; requestID?: string; action?: string }>({
            path,
            method: 'POST',
            bodyType: 'form-data',
            formData: [
                { key: 'requestID', value: requestID },
                { key: 'action', value: 'stop' },
            ],
        })
    }

    return { ok: true, stopped: requestIDs.length, requestIDs }
}
