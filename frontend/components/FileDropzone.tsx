import { ChangeEvent, DragEvent, useRef, useState } from 'react'
import { Archive, FileText, FolderKanban, Loader2, Trash2, Upload } from 'lucide-react'

import { Button } from '../lib/shadcn/button'
import { cn } from '../lib/shadcn/utils'
import { extractZipArchive } from '../utils/zipExtractor'

export const ACCEPTED_EXTENSIONS = new Set([
    '.pdf',
    '.doc',
    '.docx',
    '.xlsx',
    '.xls',
    '.xlsm',
    '.xlsb',
    '.xltx',
    '.csv',
    '.tsv',
    '.ppt',
    '.pptx',
    '.key',
    '.txt',
    '.rtf',
    '.odt',
    '.eml',
    '.msg',
    '.png',
    '.jpg',
    '.jpeg',
    '.tiff',
    '.tif',
    '.webp',
    '.mov',
    '.mp4',
    '.m4v',
    '.webm',
    '.mp3',
    '.m4a',
    '.wav',
    '.aac',
])
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB per file — accommodates large Excel financial models and high-res scans

type FileDropzoneProps = {
    selectedFiles: File[]
    onFileSelect: (files: File[]) => void
    className?: string
}

export default function FileDropzone({ selectedFiles, onFileSelect, className }: FileDropzoneProps) {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const folderInputRef = useRef<HTMLInputElement | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isExtractingZip, setIsExtractingZip] = useState(false)
    const [zipExtractionNotice, setZipExtractionNotice] = useState<string | null>(null)
    const [hasNumbersFile, setHasNumbersFile] = useState(false)
    const [rejectedNames, setRejectedNames] = useState<string[]>([])
    const [oversizedNames, setOversizedNames] = useState<string[]>([])

    const processFileList = async (fileArray: File[]) => {
        const directFiles: File[] = []
        const zipFiles: File[] = []

        for (const file of fileArray) {
            if (file.name.toLowerCase().endsWith('.zip')) {
                zipFiles.push(file)
            } else {
                directFiles.push(file)
            }
        }

        let extractedFromZips: File[] = []
        let totalZipsUnpacked = 0

        if (zipFiles.length > 0) {
            setIsExtractingZip(true)
            for (const zf of zipFiles) {
                try {
                    const res = await extractZipArchive(zf, ACCEPTED_EXTENSIONS)
                    extractedFromZips = extractedFromZips.concat(res.files)
                    totalZipsUnpacked++
                } catch (err) {
                    console.error('Failed to extract zip:', err)
                }
            }
            setIsExtractingZip(false)
            if (extractedFromZips.length > 0) {
                setZipExtractionNotice(`Extracted ${extractedFromZips.length} document${extractedFromZips.length === 1 ? '' : 's'} from ${totalZipsUnpacked} VDR ZIP archive${totalZipsUnpacked === 1 ? '' : 's'}`)
            }
        }

        const allCandidates = [...directFiles, ...extractedFromZips]
        const accepted: File[] = []
        const rejected: string[] = []
        const oversized: string[] = []
        let numbersDetected = false

        for (const file of allCandidates) {
            if (file.name === 'manifest.json') continue // Skip internal benchmark manifest
            const ext = file.name.includes('.') ? ('.' + file.name.split('.').pop()!.toLowerCase()) : ''
            if (ext === '.numbers') {
                numbersDetected = true
                rejected.push(file.name)
            } else if (!ACCEPTED_EXTENSIONS.has(ext)) {
                rejected.push(file.name)
            } else if (file.size > MAX_FILE_SIZE_BYTES) {
                oversized.push(`${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`)
            } else {
                accepted.push(file)
            }
        }
        setHasNumbersFile(numbersDetected)
        setRejectedNames(rejected)
        setOversizedNames(oversized)
        onFileSelect(accepted)
    }

    const updateFiles = (fileList: FileList | null) => {
        void processFileList(Array.from(fileList ?? []))
    }

    const handleDragOver = (event: DragEvent<HTMLElement>) => {
        event.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (_event: DragEvent<HTMLElement>) => {
        setIsDragging(false)
    }

    const handleDrop = async (event: DragEvent<HTMLElement>) => {
        event.preventDefault()
        setIsDragging(false)

        const extractedFiles: File[] = []
        const items = Array.from(event.dataTransfer.items || [])

        async function traverseEntry(entry: any) {
            if (!entry) return
            if (entry.isFile) {
                await new Promise<void>((resolve) => {
                    entry.file((file: File) => {
                        extractedFiles.push(file)
                        resolve()
                    }, () => resolve())
                })
            } else if (entry.isDirectory) {
                const dirReader = entry.createReader()
                const readEntries = (): Promise<any[]> =>
                    new Promise((resolve) => {
                        dirReader.readEntries((results: any[]) => resolve(results || []), () => resolve([]))
                    })

                let entries = await readEntries()
                while (entries.length > 0) {
                    for (const childEntry of entries) {
                        await traverseEntry(childEntry)
                    }
                    entries = await readEntries()
                }
            }
        }

        const promises = items.map((item) => {
            const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null
            if (entry) {
                return traverseEntry(entry)
            } else if (item.kind === 'file') {
                const f = item.getAsFile()
                if (f) extractedFiles.push(f)
            }
            return Promise.resolve()
        })

        await Promise.all(promises)

        if (extractedFiles.length > 0) {
            void processFileList(extractedFiles)
        } else {
            updateFiles(event.dataTransfer.files)
        }
    }

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        updateFiles(event.target.files)
        event.target.value = ''
    }

    return (
        <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-stretch', className)}>
            <div
                role="region"
                aria-label="File upload dropzone"
                className={cn(
                    'flex min-h-[96px] flex-1 cursor-pointer flex-col items-stretch justify-between gap-4 rounded-lg border border-dashed border-border bg-background px-4 py-4 transition-colors sm:flex-row sm:items-center',
                    isDragging && 'border-primary bg-accent/40',
                    isExtractingZip && 'border-primary/70 bg-primary/5'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={(e) => {
                    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.dropzone-body-click')) {
                        inputRef.current?.click()
                    }
                }}
            >
                {/* File input for individual files */}
                <input
                    ref={inputRef}
                    type="file"
                    className="sr-only"
                    onChange={handleChange}
                    accept=".pdf,.doc,.docx,.xlsx,.xls,.xlsm,.xlsb,.xltx,.csv,.tsv,.ppt,.pptx,.key,.txt,.rtf,.odt,.eml,.msg,.zip,.png,.jpg,.jpeg,.tiff,.tif,.webp,.mov,.mp4,.m4v,.webm,.mp3,.m4a,.wav,.aac,application/zip,application/x-zip-compressed,image/png,image/jpeg,image/webp,image/tiff,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/x-m4a,audio/aac"
                    multiple
                />

                {/* Folder input for full directory data rooms */}
                <input
                    ref={folderInputRef}
                    type="file"
                    className="sr-only"
                    onChange={handleChange}
                    // @ts-expect-error webkitdirectory is standard in HTML5 browsers but missing in JSX types
                    webkitdirectory=""
                    directory=""
                />

                <div className="dropzone-body-click flex min-w-0 items-start gap-3 sm:items-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                        {isExtractingZip ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : selectedFiles.length > 0 ? (
                            <FileText className="h-5 w-5" />
                        ) : (
                            <Upload className="h-5 w-5" />
                        )}
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                            {isExtractingZip
                                ? 'Unpacking VDR ZIP archive...'
                                : selectedFiles.length > 0
                                ? `${selectedFiles.length} document${selectedFiles.length === 1 ? '' : 's'} selected`
                                : 'Drop a deal packet, folder, or VDR ZIP here'}
                        </p>
                        <p className="break-words text-sm text-muted-foreground">
                            {isExtractingZip
                                ? 'Decompressing documents and preserving folder hierarchy...'
                                : selectedFiles.length > 0
                                ? selectedFiles.map((file) => {
                                      const pathLabel = file.webkitRelativePath || file.name
                                      return `${pathLabel} (${Math.max(1, Math.round(file.size / 1024))} KB)`
                                  }).join(' • ')
                                : 'Supports dragging entire deal folders, VDR ZIP archives, or individual files. Supports PDF, Excel (.xlsx, .xlsb, .xlsm), Word, CSV, TSV, Emails (.eml, .msg), Legal (.rtf), Images, Presentations, and Management Call Audio/Video (.mov, .mp4, .mp3, .m4a).'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* Unified Action: Browse Files or VDR Folder */}
                    <div className="inline-flex w-full sm:w-auto rounded-lg border border-border/80 bg-background/80 shadow-2xs overflow-hidden p-0.5">
                        <Button
                            id="browse-files-btn"
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-xs font-semibold hover:bg-accent hover:text-accent-foreground rounded-md gap-1.5 cursor-pointer"
                            title="Select one or more files from your computer"
                            onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                inputRef.current?.click()
                            }}
                        >
                            <Upload className="h-3.5 w-3.5 text-primary" />
                            <span>Browse Files</span>
                        </Button>
                        <div className="w-[1px] bg-border my-1" />
                        <Button
                            id="browse-vdr-btn"
                            data-browse-vdr="true"
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-xs font-semibold hover:bg-primary/10 hover:text-primary rounded-md gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
                            title="Select an entire data room folder containing subdirectories"
                            onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                folderInputRef.current?.click()
                            }}
                        >
                            <FolderKanban className="h-3.5 w-3.5 text-amber-500" />
                            <span>Browse Folder</span>
                        </Button>
                    </div>

                    {selectedFiles.length > 0 && (
                        <Button
                            id="clear-files-btn"
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-8 w-full sm:w-auto text-xs font-medium gap-1 bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30 cursor-pointer"
                            title="Clear all selected files"
                            onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                if (inputRef.current) inputRef.current.value = ''
                                if (folderInputRef.current) folderInputRef.current.value = ''
                                setRejectedNames([])
                                setOversizedNames([])
                                setHasNumbersFile(false)
                                setZipExtractionNotice(null)
                                onFileSelect([])
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Clear</span>
                        </Button>
                    )}
                </div>
            </div>
            {zipExtractionNotice ? (
                <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                    <Archive className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{zipExtractionNotice}</span>
                </div>
            ) : null}
            {hasNumbersFile ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
                    <strong>🍎 Apple .numbers File Detected:</strong> Apple Numbers uses a proprietary package format. Please open the file in Apple Numbers and select <strong>File &rarr; Export To &rarr; Excel (.xlsx)</strong> or <strong>PDF</strong> before uploading.
                </div>
            ) : null}
            {rejectedNames.length > 0 ? (
                <p className="text-sm text-destructive">
                    Unsupported file type{rejectedNames.length > 1 ? 's' : ''} skipped: {rejectedNames.join(', ')}
                </p>
            ) : null}
            {oversizedNames.length > 0 ? (
                <p className="text-sm text-destructive">
                    Oversized file{oversizedNames.length > 1 ? 's' : ''} skipped (&gt;50 MB limit): {oversizedNames.join(', ')}
                </p>
            ) : null}
        </div>
    )
}
