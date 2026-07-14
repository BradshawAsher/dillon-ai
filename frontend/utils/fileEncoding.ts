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
