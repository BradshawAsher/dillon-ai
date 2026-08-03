import React, { useEffect, useState } from 'react'
import { Keyboard, X } from 'lucide-react'
import { Button } from '../lib/shadcn/button'

const SHORTCUTS = [
    { keys: ['Esc'], description: 'Close evidence drawer / chat panel' },
    { keys: ['?'], description: 'Toggle this shortcuts dialog' },
    { keys: ['Ctrl', 'K'], description: 'Open command palette' },
    { keys: ['C'], description: 'Open AI chat assistant' },
    { keys: ['Ctrl', 'Shift', 'P'], description: 'Open Projects portfolio panel' },
] as const

export default function KeyboardShortcutsDialog() {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const target = e.target as HTMLElement
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
                e.preventDefault()
                setIsOpen(prev => !prev)
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen])

    return (
        <>
            <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() => setIsOpen(true)}
                title="Keyboard shortcuts (?)"
            >
                <Keyboard className="h-3.5 w-3.5" />
            </Button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="fixed left-1/2 top-12 sm:top-16 z-[100] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-primary/20 bg-background p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Keyboard className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close</span>
                            </Button>
                        </div>

                        <div className="mt-4 space-y-3">
                            {SHORTCUTS.map(shortcut => (
                                <div key={shortcut.description} className="flex items-center justify-between gap-4 py-1">
                                    <span className="text-sm text-muted-foreground font-medium">{shortcut.description}</span>
                                    <div className="flex gap-1 shrink-0">
                                        {shortcut.keys.map(key => (
                                            <kbd key={key} className="rounded-md border border-border/80 bg-muted px-2 py-0.5 text-xs font-mono font-semibold text-foreground shadow-sm">
                                                {key}
                                            </kbd>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="mt-5 border-t border-border pt-3 text-xs text-muted-foreground">
                            Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">?</kbd> anywhere to toggle this shortcuts dialog.
                        </p>
                    </div>
                </>
            )}
        </>
    )
}
