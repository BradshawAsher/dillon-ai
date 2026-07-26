import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

type Props = {
    text: string
    maxLength?: number
    bulletColor?: string
    onClick?: () => void
}

export default function TruncatedListItem({ text, maxLength = 80, bulletColor = 'bg-muted-foreground', onClick }: Props) {
    const [expanded, setExpanded] = useState(false)
    const isLong = text.length > maxLength

    const shortText = isLong ? text.slice(0, maxLength).replace(/\s\S*$/, '') + '…' : text

    if (!isLong) {
        return (
            <li className="flex items-start gap-2 text-sm">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${bulletColor}`} />
                <button type="button" className="text-left text-foreground hover:text-primary transition-colors" onClick={onClick}>
                    {text}
                </button>
            </li>
        )
    }

    return (
        <li className="flex items-start gap-2 text-sm">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${bulletColor}`} />
            <div className="min-w-0 flex-1">
                <button
                    type="button"
                    className="text-left text-foreground hover:text-primary transition-colors"
                    onClick={() => {
                        if (expanded && onClick) onClick()
                        else setExpanded(!expanded)
                    }}
                >
                    {expanded ? text : shortText}
                </button>
                {!expanded && (
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="ml-1 inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                    >
                        more <ChevronDown className="h-3 w-3" />
                    </button>
                )}
                {expanded && (
                    <button
                        type="button"
                        onClick={() => setExpanded(false)}
                        className="ml-1 text-xs text-muted-foreground hover:underline"
                    >
                        less
                    </button>
                )}
            </div>
        </li>
    )
}
