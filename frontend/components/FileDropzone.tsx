import { ChangeEvent, DragEvent, useRef, useState } from 'react'
import { FileText, Upload } from 'lucide-react'

import { Button } from '../lib/shadcn/button'
import { cn } from '../lib/shadcn/utils'

type FileDropzoneProps = {
    selectedFiles: File[]
    onFileSelect: (files: File[]) => void
    className?: string
}

export default function FileDropzone({ selectedFiles, onFileSelect, className }: FileDropzoneProps) {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const updateFiles = (fileList: FileList | null) => {
        const nextFiles = Array.from(fileList ?? [])
        onFileSelect(nextFiles)
    }

    const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (_event: DragEvent<HTMLLabelElement>) => {
        setIsDragging(false)
    }

    const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault()
        setIsDragging(false)
        updateFiles(event.dataTransfer.files)
    }

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        updateFiles(event.target.files)
        event.target.value = ''
    }

    return (
        <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-stretch', className)}>
            <label
                className={cn(
                    'flex min-h-[96px] flex-1 cursor-pointer items-center justify-between gap-4 rounded-lg border border-dashed border-border bg-background px-4 py-4 transition-colors',
                    isDragging && 'border-primary bg-accent/40'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="sr-only"
                    onChange={handleChange}
                    accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.ppt,.pptx,.txt"
                    multiple
                />

                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                        {selectedFiles.length > 0 ? <FileText className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                            {selectedFiles.length > 0
                                ? `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} selected`
                                : 'Drop a deal packet here or browse'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {selectedFiles.length > 0
                                ? selectedFiles.map((file) => `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`).join(' • ')
                                : 'Supports PDF, Excel, Word, PowerPoint, CSV, and text files. Upload one or more documents into a shared project.'}
                        </p>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={(event) => {
                        event.preventDefault()
                        inputRef.current?.click()
                    }}
                >
                    Browse files
                </Button>
            </label>
        </div>
    )
}
