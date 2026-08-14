export type ErrorCategory = 'RATE_LIMIT' | 'AUTH_CREDENTIAL' | 'SCHEMA_PARSING' | 'SYSTEM_GENERAL'

export type ClassifiedError = {
    category: ErrorCategory
    badgeLabel: string
    badgeColorClass: string
    title: string
    description: string
    actionGuidance: string
    isRetryable: boolean
}

/**
 * Categorizes raw error messages into distinct, actionable failure types:
 * 1. RATE_LIMIT (HTTP 429, Quota, TPM/RPM limits, Provider overloaded)
 * 2. AUTH_CREDENTIAL (HTTP 401/403, missing keys, invalid credentials)
 * 3. SCHEMA_PARSING (JSON parse errors, missing required structured output fields)
 * 4. SYSTEM_GENERAL (Uncaught server errors, network timeouts, unknown failures)
 */
export function classifyError(errorMessage?: string | null): ClassifiedError {
    const msg = (errorMessage || '').trim().toLowerCase()

    if (/rate|429|quota|tpm|rpm|overloaded|too many requests|tokens per min|limit reached/.test(msg)) {
        return {
            category: 'RATE_LIMIT',
            badgeLabel: 'RATE LIMIT / QUOTA (429)',
            badgeColorClass: 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/40',
            title: 'LLM Provider Rate Limit or Quota Exceeded (429)',
            description: errorMessage || 'API rate limit or tokens-per-minute quota exceeded.',
            actionGuidance: 'This is a temporary provider throttling issue. Automated backoff retries are active, or you can click "Run synthesis now" in 60 seconds once the quota window resets.',
            isRetryable: true,
        }
    }

    if (/credential|auth|401|403|unauthor|forbidden|not found|invalid api key|header/.test(msg)) {
        return {
            category: 'AUTH_CREDENTIAL',
            badgeLabel: 'AUTH / CREDENTIAL ERROR',
            badgeColorClass: 'bg-red-500/15 text-red-900 dark:text-red-200 border-red-500/40',
            title: 'API Credential or Authentication Failed',
            description: errorMessage || 'Failed header authentication or invalid API key binding.',
            actionGuidance: 'Check your API credential configuration in n8n or the dashboard settings modal.',
            isRetryable: false,
        }
    }

    if (/json|parse|structured output|schema|parser|syntaxerror|invalid response/.test(msg)) {
        return {
            category: 'SCHEMA_PARSING',
            badgeLabel: 'SCHEMA PARSE ISSUE',
            badgeColorClass: 'bg-purple-500/15 text-purple-900 dark:text-purple-200 border-purple-500/40',
            title: 'Structured Output Schema Validation Error',
            description: errorMessage || 'Model response did not conform to expected JSON structure.',
            actionGuidance: 'The extraction or synthesis model produced non-conforming JSON output. Inspect parser schema logs.',
            isRetryable: true,
        }
    }

    return {
        category: 'SYSTEM_GENERAL',
        badgeLabel: 'SYSTEM EXECUTION ISSUE',
        badgeColorClass: 'bg-destructive/15 text-destructive border-destructive/30',
        title: 'Workflow System Execution Error',
        description: errorMessage || 'An unexpected error occurred during execution.',
        actionGuidance: 'Review the failed node in the Workflow Errors tab or re-trigger synthesis.',
        isRetryable: true,
    }
}
