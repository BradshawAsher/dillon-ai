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
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new File([bytes], name, { type })
}
