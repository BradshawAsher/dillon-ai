// Escapes the five HTML-significant characters so a string can be safely
// interpolated into markup rendered via dangerouslySetInnerHTML. Chat and
// synthesis text can echo untrusted document content (e.g. "<img
// src=x onerror=...>"); escaping before any markdown transform ensures only the
// tags we generate ourselves are ever treated as real HTML.
export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}
