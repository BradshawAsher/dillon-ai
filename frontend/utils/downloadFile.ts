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

export function fileSafeName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'report'
}
