export function downloadTextFile(fileName: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoke on the next tick rather than synchronously. Some browsers (older
  // Firefox/Safari) start the download asynchronously after click(), and
  // revoking the object URL in the same frame can cancel an in-flight save.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Longest slug we emit — well under the common 255-byte filesystem limit,
 *  leaving room for a caller-added suffix and extension. */
export const MAX_FILE_SAFE_NAME_LENGTH = 100

export function fileSafeName(value: string) {
  // Fold accented letters to their ASCII base first (Café -> Cafe) so a
  // diacritic isn't dropped as a separator, which would truncate "Café" to
  // "caf" instead of "cafe".
  const folded = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  const slug = folded.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  // Truncate overly long names, then re-trim any trailing hyphen the cut left
  // behind so we never emit "long-name-".
  const capped = slug.slice(0, MAX_FILE_SAFE_NAME_LENGTH).replace(/-+$/, '')
  return capped || 'report'
}
