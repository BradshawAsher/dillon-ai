import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { Badge, type BadgeProps } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'

type ExpandableInsightGroupProps = {
  title: string
  items: string[]
  children?: ReactNode
  itemCount?: number
  icon?: ReactNode
  badgeVariant?: BadgeProps['variant']
  className?: string
  itemClassName?: string
  emptyLabel: string
  defaultOpen?: boolean
}

const LONG_ITEM_LENGTH = 320

export default function ExpandableInsightGroup({
  title,
  items,
  children,
  itemCount,
  icon,
  badgeVariant = 'outline',
  className = '',
  itemClassName = '',
  emptyLabel,
  defaultOpen = false,
}: ExpandableInsightGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(() => new Set())

  function toggleItem(index: number) {
    setExpandedItems((current) => {
      const next = new Set(current)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <section className={`rounded-lg border p-4 ${className}`}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <Badge variant={badgeVariant}>{itemCount ?? items.length}</Badge>
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {isOpen ? (
        children ? (
          <div className="mt-3 max-h-[28rem] overflow-y-auto pr-1">{children}</div>
        ) : items.length > 0 ? (
          <ol className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {items.map((item, index) => {
              const isLong = item.length > LONG_ITEM_LENGTH
              const isExpanded = expandedItems.has(index)

              return (
                <li key={`${title}-${item}-${index}`} className={`rounded-md border bg-background/80 p-3 text-sm leading-6 text-foreground ${itemClassName}`}>
                  <div className={isLong && !isExpanded ? 'max-h-24 overflow-hidden' : undefined}>
                    <span className="mr-2 font-medium text-muted-foreground">{index + 1}.</span>
                    {item}
                  </div>
                  {isLong ? (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="mt-1 h-auto px-0 py-0 text-xs"
                      onClick={() => toggleItem(index)}
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </Button>
                  ) : null}
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="mt-3 rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</p>
        )
      ) : null}
    </section>
  )
}
