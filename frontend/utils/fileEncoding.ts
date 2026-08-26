export async function readFileAsBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => {
      reject(new Error(`Unable to read file: ${file.name}`))
    }

    reader.onload = () => {
      const result = reader.result

      if (typeof result !== 'string') {
        reject(new Error(`Unexpected file reader result for: ${file.name}`))
        return
      }

      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Reconstructs a File from a base64 payload previously produced by
 * readFileAsBase64. Used to restore a pending upload after the workspace
 * switches from Example to Live mode (the selection survives the reload via
 * sessionStorage).
 */
export function base64ToFile(base64: string, name: string, type: string): File {
  // Tolerate a full data-URI ("data:...;base64,AAAA") as well as a bare
  // base64 payload, so callers don't have to strip the prefix themselves.
  const commaIndex = base64.indexOf(',')
  const rawPayload = base64.startsWith('data:') && commaIndex >= 0 ? base64.slice(commaIndex + 1) : base64
  // Tolerate URL-safe base64 ("-"/"_" instead of "+"/"/") and stray whitespace
  // (some encoders wrap lines), then re-pad to a multiple of four so atob does
  // not throw "Invalid character" on an otherwise valid payload.
  const normalized = rawPayload.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new File([bytes], name, { type })
}
