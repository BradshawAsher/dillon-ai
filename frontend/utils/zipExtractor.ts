/**
 * Production-grade, zero-dependency browser-native ZIP extraction utility
 * Uses native Web Streams DecompressionStream('deflate-raw')
 */

export interface ZipExtractionResult {
    files: File[]
    skippedUnsupportedCount: number
    ignoredNoiseCount: number
    totalEntriesFound: number
    zipName: string
}

const MIME_MAP: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
    '.xlsb': 'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
    '.xltx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
    '.csv': 'text/csv',
    '.tsv': 'text/tab-separated-values',
    '.txt': 'text/plain',
    '.rtf': 'application/rtf',
    '.odt': 'application/vnd.oasis.opendocument.text',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.key': 'application/x-iwork-keynote-sffkey',
    '.eml': 'message/rfc822',
    '.msg': 'application/vnd.ms-outlook',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.webp': 'image/webp',
    '.mov': 'video/quicktime',
    '.mp4': 'video/mp4',
    '.m4v': 'video/x-m4v',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
}

/**
 * Lower-cased extension (including the leading dot) of a path's final segment,
 * or '' when the base name has no dot. Deriving it from the base name — not the
 * whole path — avoids two bugs in the naive `path.slice(path.lastIndexOf('.'))`:
 * a dotless name like "Makefile" would slice to its last character ("e"), and a
 * dotless file inside a dotted folder ("v1.2/ledger") would pick up ".2/ledger".
 */
export function fileExtension(path: string): string {
    const base = path.replace(/\\/g, '/').split('/').pop() ?? ''
    const dot = base.lastIndexOf('.')
    // A leading-dot dotfile ("._x", ".DS_Store") has no real extension.
    return dot > 0 ? base.slice(dot).toLowerCase() : ''
}

function getMimeType(fileName: string): string {
    return MIME_MAP[fileExtension(fileName)] || 'application/octet-stream'
}

function isNoisePath(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/')
    const parts = normalized.split('/')
    const baseName = parts[parts.length - 1]

    if (normalized.includes('__MACOSX/')) return true
    if (baseName.startsWith('._')) return true
    if (baseName === '.DS_Store') return true
    if (baseName.toLowerCase() === 'thumbs.db') return true
    if (baseName.toLowerCase() === 'desktop.ini') return true
    return false
}

/**
 * Extracts supported diligence files from a ZIP archive ArrayBuffer
 */
export async function extractZipArchive(
    zipFile: File,
    acceptedExtensions: Set<string>
): Promise<ZipExtractionResult> {
    const arrayBuffer = await zipFile.arrayBuffer()
    const view = new DataView(arrayBuffer)
    const uint8 = new Uint8Array(arrayBuffer)
    const files: File[] = []
    let skippedUnsupportedCount = 0
    let ignoredNoiseCount = 0
    let totalEntriesFound = 0

    // 1. Locate End of Central Directory (EOCD) record by scanning backwards from EOF
    let eocdOffset = -1
    const maxScanLength = Math.min(65557, arrayBuffer.byteLength)
    for (let i = arrayBuffer.byteLength - 22; i >= arrayBuffer.byteLength - maxScanLength; i--) {
        if (view.getUint32(i, true) === 0x06054b50) {
            eocdOffset = i
            break
        }
    }

    if (eocdOffset !== -1) {
        // Read via Central Directory for maximum spec compliance
        const totalEntries = view.getUint16(eocdOffset + 10, true)
        const centralDirOffset = view.getUint32(eocdOffset + 16, true)

        let currOffset = centralDirOffset
        for (let entryIdx = 0; entryIdx < totalEntries && currOffset + 46 <= arrayBuffer.byteLength; entryIdx++) {
            if (view.getUint32(currOffset, true) !== 0x02014b50) {
                break
            }

            totalEntriesFound++
            const method = view.getUint16(currOffset + 10, true)
            const compSize = view.getUint32(currOffset + 20, true)
            const nameLen = view.getUint16(currOffset + 28, true)
            const extraLen = view.getUint16(currOffset + 30, true)
            const commentLen = view.getUint16(currOffset + 32, true)
            const localHeaderOffset = view.getUint32(currOffset + 42, true)

            const nameBytes = uint8.subarray(currOffset + 46, currOffset + 46 + nameLen)
            const rawPath = new TextDecoder('utf-8').decode(nameBytes).replace(/\\/g, '/')

            currOffset += 46 + nameLen + extraLen + commentLen

            // Skip directories and noise files
            if (rawPath.endsWith('/') || isNoisePath(rawPath)) {
                ignoredNoiseCount++
                continue
            }

            const ext = fileExtension(rawPath)
            if (!acceptedExtensions.has(ext)) {
                skippedUnsupportedCount++
                continue
            }

            // Read local header to get data offset
            if (localHeaderOffset + 30 > arrayBuffer.byteLength) continue
            if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) continue

            const localNameLen = view.getUint16(localHeaderOffset + 26, true)
            const localExtraLen = view.getUint16(localHeaderOffset + 28, true)
            const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen

            if (dataOffset + compSize > arrayBuffer.byteLength) continue
            const compData = uint8.subarray(dataOffset, dataOffset + compSize)

            let decompressedBytes: Uint8Array | null = null

            try {
                if (method === 0) {
                    decompressedBytes = compData
                } else if (method === 8) {
                    const ds = new DecompressionStream('deflate-raw')
                    const writer = ds.writable.getWriter()
                    writer.write(compData)
                    writer.close()
                    const response = new Response(ds.readable)
                    const buf = await response.arrayBuffer()
                    decompressedBytes = new Uint8Array(buf)
                }
            } catch (err) {
                console.warn(`Failed decompressing ${rawPath} from zip:`, err)
            }

            if (decompressedBytes) {
                const parts = rawPath.split('/')
                const fileName = parts[parts.length - 1]
                const mimeType = getMimeType(fileName)
                const extractedBlob = new Blob([decompressedBytes as unknown as BlobPart], { type: mimeType })
                const extractedFile = new File([extractedBlob], fileName, {
                    type: mimeType,
                    lastModified: Date.now(),
                })

                // Attach virtual webkitRelativePath for hierarchical display
                Object.defineProperty(extractedFile, 'webkitRelativePath', {
                    value: rawPath,
                    writable: false,
                })

                files.push(extractedFile)
            }
        }
    } else {
        // Fallback: sequential scan of local headers
        let offset = 0
        while (offset + 30 <= arrayBuffer.byteLength) {
            if (view.getUint32(offset, true) !== 0x04034b50) break

            totalEntriesFound++
            const method = view.getUint16(offset + 8, true)
            const compSize = view.getUint32(offset + 18, true)
            const nameLen = view.getUint16(offset + 26, true)
            const extraLen = view.getUint16(offset + 28, true)

            const nameBytes = uint8.subarray(offset + 30, offset + 30 + nameLen)
            const rawPath = new TextDecoder('utf-8').decode(nameBytes).replace(/\\/g, '/')
            const dataOffset = offset + 30 + nameLen + extraLen

            if (rawPath.endsWith('/') || isNoisePath(rawPath)) {
                ignoredNoiseCount++
                offset = dataOffset + compSize
                continue
            }

            const ext = fileExtension(rawPath)
            if (!acceptedExtensions.has(ext)) {
                skippedUnsupportedCount++
                offset = dataOffset + compSize
                continue
            }

            const compData = uint8.subarray(dataOffset, dataOffset + compSize)
            let decompressedBytes: Uint8Array | null = null

            try {
                if (method === 0) {
                    decompressedBytes = compData
                } else if (method === 8) {
                    const ds = new DecompressionStream('deflate-raw')
                    const writer = ds.writable.getWriter()
                    writer.write(compData)
                    writer.close()
                    const response = new Response(ds.readable)
                    const buf = await response.arrayBuffer()
                    decompressedBytes = new Uint8Array(buf)
                }
            } catch (err) {
                console.warn(`Failed decompressing ${rawPath} in fallback:`, err)
            }

            if (decompressedBytes) {
                const parts = rawPath.split('/')
                const fileName = parts[parts.length - 1]
                const mimeType = getMimeType(fileName)
                const extractedBlob = new Blob([decompressedBytes as unknown as BlobPart], { type: mimeType })
                const extractedFile = new File([extractedBlob], fileName, {
                    type: mimeType,
                    lastModified: Date.now(),
                })

                Object.defineProperty(extractedFile, 'webkitRelativePath', {
                    value: rawPath,
                    writable: false,
                })

                files.push(extractedFile)
            }

            offset = dataOffset + compSize
        }
    }

    return {
        files,
        skippedUnsupportedCount,
        ignoredNoiseCount,
        totalEntriesFound,
        zipName: zipFile.name,
    }
}
