import { ThumbsDown, ThumbsUp } from 'lucide-react'

export type Message = {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
}

function renderSimpleMarkdown(text: string) {
    return text.split('\n').map((line, i) => {
        let processed = line
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code class="rounded bg-foreground/10 px-1 py-0.5 text-[11px] font-mono">$1</code>')

        if (/^#{1,3}\s/.test(line)) {
            const content = line.replace(/^#{1,3}\s+/, '')
            return <p key={i} className="font-bold text-xs uppercase tracking-wide text-foreground mt-2 mb-1" dangerouslySetInnerHTML={{ __html: content }} />
        }

        if (/^\s*[-*]\s/.test(line)) {
            const content = line.replace(/^\s*[-*]\s+/, '')
            return (
                <div key={i} className="flex items-start gap-1.5 ml-1 my-0.5">
                    <span className="text-primary text-[10px] mt-1">•</span>
                    <span dangerouslySetInnerHTML={{ __html: content }} />
                </div>
            )
        }

        if (!line.trim()) {
            return <div key={i} className="h-1.5" />
        }

        return <p key={i} dangerouslySetInnerHTML={{ __html: processed }} />
    })
}

function relativeTime(ts: number): string {
    const sec = Math.floor((Date.now() - ts) / 1000)
    if (sec < 60) return 'just now'
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min}m ago`
    const hrs = Math.floor(min / 60)
    return `${hrs}h ago`
}

export type ChatMessageBubbleProps = {
    msg: Message
    rating?: 'up' | 'down'
    onRatingChange?: (id: string, rating: 'up' | 'down') => void
}

export default function ChatMessageBubble({ msg, rating, onRatingChange }: ChatMessageBubbleProps) {
    return (
        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%]">
                <div
                    className={`rounded-lg px-3 py-2 text-sm ${msg.role === 'user'
                        ? 'bg-primary text-primary-foreground whitespace-pre-wrap'
                        : 'bg-muted text-foreground space-y-0.5'
                        }`}
                >
                    {msg.role === 'assistant' ? renderSimpleMarkdown(msg.content) : msg.content}
                </div>
                <div className="mt-1 flex items-center gap-1">
                    <span className="text-[9px] text-muted-foreground/60">{relativeTime(msg.timestamp)}</span>
                    {msg.role === 'assistant' && onRatingChange && (
                        <>
                            <button
                                onClick={() => onRatingChange(msg.id, 'up')}
                                className={`rounded p-0.5 transition-colors ${rating === 'up' ? 'text-green-600' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
                                title="Helpful"
                                aria-label="Rate this answer helpful"
                                aria-pressed={rating === 'up'}
                            >
                                <ThumbsUp className="h-3 w-3" />
                            </button>
                            <button
                                onClick={() => onRatingChange(msg.id, 'down')}
                                className={`rounded p-0.5 transition-colors ${rating === 'down' ? 'text-red-600' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
                                title="Not helpful"
                                aria-label="Rate this answer not helpful"
                                aria-pressed={rating === 'down'}
                            >
                                <ThumbsDown className="h-3 w-3" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
