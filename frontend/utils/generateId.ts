// Client-side unique-id generator for ephemeral UI entities (chat messages,
// tool-call records, EBITDA adjustments, etc.).
//
// The `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` pattern had been
// copy-pasted a dozen times across DealChatPanel and EbitdaReconstructionCard.
// Centralizing it keeps the id shape consistent and gives one place to harden
// collision resistance later.

/**
 * Returns a reasonably unique id of the form `<prefix>-<epochMs>-<rand>`.
 * These are for local React keys / transient records, not for anything that
 * needs cryptographic uniqueness or server persistence.
 *
 * @param prefix short namespace, e.g. 'chat', 'tool', 'adj'
 */
export function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}
