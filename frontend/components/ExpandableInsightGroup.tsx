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
  onItemClick?: (item: string, index: number) => void
}

const LONG_ITEM_LENGTH = 100

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
  onItemClick,
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
        className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-background/70 px-3 py-2.5 text-left transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <Badge variant={badgeVariant}>{itemCount ?? items.length}</Badge>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary">
          {isOpen ? 'Hide' : 'Show'} details
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {isOpen ? (
        children ? (
          <div className="mt-3 max-h-[28rem] overflow-y-auto pr-1">{children}</div>
        ) : items.length > 0 ? (
          <ol className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {items.map((item, index) => {
              const isLong = item.length > LONG_ITEM_LENGTH
              const isExpanded = expandedItems.has(index)
              const isClickable = !!onItemClick

              return (
                <li
                  key={`${title}-${item}-${index}`}
                  className={`rounded-md border bg-background/80 text-sm leading-6 text-foreground ${isClickable ? 'transition-colors hover:border-primary/40 hover:bg-muted/30' : ''} ${itemClassName}`}
                >
                  <button
                    type="button"
                    className={`w-full p-3 text-left ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                    onClick={() => {
                      if (isClickable) {
                        onItemClick(item, index)
                      }
                    }}
                    tabIndex={isClickable ? 0 : -1}
                  >
                    <div>
                      <span className="mr-2 font-medium text-muted-foreground">{index + 1}.</span>
                      {isLong && !isExpanded ? item.slice(0, LONG_ITEM_LENGTH).replace(/\s\S*$/, '') + '…' : item}
                    </div>
                    {isClickable ? (
                      <span className="mt-1 block text-xs font-medium text-primary">View evidence →</span>
                    ) : null}
                  </button>
                  {isLong ? (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="mt-1 h-auto px-3 pb-3 pt-0 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleItem(index)
                      }}
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
