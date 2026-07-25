import { useEffect, useState } from 'react'

type PipelineStatus = 'idle' | 'polling' | 'processing' | 'error'

type Props = {
    isPolling: boolean
    hasActiveSubmissions: boolean
    hasErrors: boolean
}

export default function PipelineStatusIndicator({ isPolling, hasActiveSubmissions, hasErrors }: Props) {
    const [pulse, setPulse] = useState(false)

    const status: PipelineStatus = hasErrors ? 'error' : hasActiveSubmissions ? 'processing' : isPolling ? 'polling' : 'idle'

    useEffect(() => {
        if (status === 'polling' || status === 'processing') {
            const interval = setInterval(() => setPulse(p => !p), 1500)
            return () => clearInterval(interval)
        }
        setPulse(false)
    }, [status])

    const dotColor = status === 'error' ? 'bg-destructive' : status === 'processing' ? 'bg-amber-500' : status === 'polling' ? 'bg-green-500' : 'bg-muted-foreground/40'
    const label = status === 'error' ? 'Pipeline error' : status === 'processing' ? 'Processing docs' : status === 'polling' ? 'Live' : 'Idle'

    return (
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5">
            <span className="relative flex h-2.5 w-2.5">
                {(status === 'polling' || status === 'processing') && (
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotColor}`} />
                )}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor} ${pulse && status !== 'idle' ? 'opacity-100' : 'opacity-80'}`} />
            </span>
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
    )
}
