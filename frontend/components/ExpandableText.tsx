import { useEffect, useRef, useState } from 'react'

import { Button } from '../lib/shadcn/button'

type ExpandableTextProps = {
    text: string
    maxHeight?: number
    className?: string
}

export default function ExpandableText({ text, maxHeight = 120, className = '' }: ExpandableTextProps) {
    const contentRef = useRef<HTMLDivElement>(null)
    const [isOverflowing, setIsOverflowing] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)

    useEffect(() => {
        const element = contentRef.current
        if (!element) return

        const checkOverflow = () => {
            setIsOverflowing(element.scrollHeight > maxHeight)
        }

        checkOverflow()

        // Re-check after fonts load or layout shifts
        const resizeObserver = new ResizeObserver(checkOverflow)
        resizeObserver.observe(element)
        return () => resizeObserver.disconnect()
    }, [text, maxHeight])

    return (
        <div className={className}>
            <div className="relative">
                <div
                    ref={contentRef}
                    className="whitespace-pre-wrap text-sm leading-6 text-foreground"
                    style={!isExpanded && isOverflowing ? { maxHeight: `${maxHeight}px`, overflow: 'hidden' } : undefined}
                >
                    {text}
                </div>
                {!isExpanded && isOverflowing ? (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" />
                ) : null}
            </div>
            {isOverflowing ? (
                <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="mt-1 h-auto px-0 py-0 text-xs"
                    onClick={() => setIsExpanded((current) => !current)}
                >
                    {isExpanded ? 'Show less' : 'Show more'}
                </Button>
            ) : null}
        </div>
    )
}
