import { ChangeEvent, DragEvent, useRef, useState } from 'react'
import { FileText, FolderKanban, Upload } from 'lucide-react'

import { Button } from '../lib/shadcn/button'
import { cn } from '../lib/shadcn/utils'

const ACCEPTED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.xlsm', '.xltx', '.csv', '.ppt', '.pptx', '.txt'])
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB per file — accommodates large Excel financial models

type FileDropzoneProps = {
    selectedFiles: File[]
    onFileSelect: (files: File[]) => void
    className?: string
}

export default function FileDropzone({ selectedFiles, onFileSelect, className }: FileDropzoneProps) {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const folderInputRef = useRef<HTMLInputElement | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [hasNumbersFile, setHasNumbersFile] = useState(false)
    const [rejectedNames, setRejectedNames] = useState<string[]>([])
    const [oversizedNames, setOversizedNames] = useState<string[]>([])

    const processFileList = (fileArray: File[]) => {
        const accepted: File[] = []
        const rejected: string[] = []
        const oversized: string[] = []
        let numbersDetected = false

        for (const file of fileArray) {
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
        processFileList(Array.from(fileList ?? []))
    }

    const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (_event: DragEvent<HTMLLabelElement>) => {
        setIsDragging(false)
    }

    const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
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
            processFileList(extractedFiles)
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
            <label
                className={cn(
                    'flex min-h-[96px] flex-1 cursor-pointer flex-col items-stretch justify-between gap-4 rounded-lg border border-dashed border-border bg-background px-4 py-4 transition-colors sm:flex-row sm:items-center',
                    isDragging && 'border-primary bg-accent/40'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* File input for individual files */}
                <input
                    ref={inputRef}
                    type="file"
                    className="sr-only"
                    onChange={handleChange}
                    accept=".pdf,.doc,.docx,.xlsx,.xls,.xlsm,.xltx,.csv,.ppt,.pptx,.txt"
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

                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                        {selectedFiles.length > 0 ? <FileText className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                            {selectedFiles.length > 0
                                ? `${selectedFiles.length} document${selectedFiles.length === 1 ? '' : 's'} selected`
                                : 'Drop a deal packet or folder here'}
                        </p>
                        <p className="break-words text-sm text-muted-foreground">
                            {selectedFiles.length > 0
                                ? selectedFiles.map((file) => {
                                      const pathLabel = file.webkitRelativePath || file.name
                                      return `${pathLabel} (${Math.max(1, Math.round(file.size / 1024))} KB)`
                                  }).join(' • ')
                                : 'Supports dragging entire deal folders or individual files. Supports PDF, Excel (.xlsx, .xlsm), Word, CSV, and text files.'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto font-medium"
                        onClick={(event) => {
                            event.preventDefault()
                            inputRef.current?.click()
                        }}
                    >
                        Browse files
                    </Button>
                    <Button
                        id="browse-vdr-btn"
                        data-browse-vdr="true"
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full sm:w-auto font-semibold gap-1"
                        title="Upload an entire data room folder containing subdirectories"
                        onClick={(event) => {
                            event.preventDefault()
                            folderInputRef.current?.click()
                        }}
                    >
                        <FolderKanban className="h-3.5 w-3.5" />
                        <span>Browse Folder / Data Room</span>
                    </Button>
                </div>
            </label>
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
