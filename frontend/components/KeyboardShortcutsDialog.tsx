import { useEffect, useState } from 'react'
import { Keyboard } from 'lucide-react'

import { Button } from '../lib/shadcn/button'

const SHORTCUTS = [
    { keys: ['Esc'], description: 'Close evidence drawer / chat panel' },
    { keys: ['?'], description: 'Open this shortcuts dialog' },
    { keys: ['Ctrl', 'K'], description: 'Jump to project search (coming soon)' },
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
                className="h-7 w-7 p-0 text-muted-foreground"
                onClick={() => setIsOpen(true)}
                title="Keyboard shortcuts (?)"
            >
                <Keyboard className="h-3.5 w-3.5" />
            </Button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsOpen(false)} />
                    <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-foreground">Keyboard shortcuts</h2>
                        <div className="mt-4 space-y-3">
                            {SHORTCUTS.map(shortcut => (
                                <div key={shortcut.description} className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                                    <div className="flex gap-1">
                                        {shortcut.keys.map(key => (
                                            <kbd key={key} className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono text-foreground">
                                                {key}
                                            </kbd>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-xs text-muted-foreground">Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">?</kbd> anywhere to toggle this dialog.</p>
                    </div>
                </>
            )}
        </>
    )
}
