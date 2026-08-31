import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { Badge, type BadgeProps } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { severityBadgeClass } from '../utils/severityBadge'

type StructuredFinding = {
  text: string
  confidence: number | null
  severity: string
  impact: string
  status: string
}

export type InsightColorTheme =
  | 'destructive'
  | 'warning'
  | 'success'
  | 'indigo'
  | 'sky'
  | 'violet'
  | 'teal'
  | 'orange'
  | 'fuchsia'
  | 'default'

type ExpandableInsightGroupProps = {
  title: string
  items: string[]
  children?: ReactNode
  itemCount?: number
  icon?: ReactNode
  badgeVariant?: BadgeProps['variant']
  colorTheme?: InsightColorTheme
  className?: string
  itemClassName?: string
  emptyLabel: string
  defaultOpen?: boolean
  onItemClick?: (item: string, index: number) => void
  findings?: StructuredFinding[]
}

const LONG_ITEM_LENGTH = 350

function confidenceBadge(confidence: number | null) {
  if (confidence === null || confidence === undefined) return null
  const num = typeof confidence === 'number' ? confidence : Number(confidence)
  if (!Number.isFinite(num)) return null
  const pct = num <= 1 && num > 0 ? Math.round(num * 100) : Math.round(num)
  if (pct <= 0) return null
  const label = pct >= 85 ? 'High' : pct >= 60 ? 'Med' : 'Low'
  const color = pct >= 85
    ? 'border-green-500/30 text-green-600 dark:text-green-400'
    : pct >= 60
      ? 'border-amber-500/30 text-amber-600 dark:text-amber-400'
      : 'border-destructive/30 text-destructive'
  return <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none ${color}`}>{label} {pct}%</span>
}

function severityBadge(severity: string) {
  if (!severity) return null
  return <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none ${severityBadgeClass(severity)}`}>{severity}</span>
}

function resolveTheme(colorTheme?: InsightColorTheme, badgeVariant?: BadgeProps['variant']): InsightColorTheme {
  if (colorTheme) return colorTheme
  if (badgeVariant === 'destructive') return 'destructive'
  if (badgeVariant === 'warning') return 'warning'
  if (badgeVariant === 'success') return 'success'
  return 'default'
}

function getContainerStyle(theme: InsightColorTheme, customClass?: string) {
  let base = ''
  switch (theme) {
    case 'destructive': base = 'border-destructive/30 bg-destructive/5'; break
    case 'warning': base = 'border-warning/30 bg-warning/5'; break
    case 'success': base = 'border-success/30 bg-success/5'; break
    case 'indigo': base = 'border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-950/20 dark:border-indigo-800/40'; break
    case 'sky': base = 'border-sky-500/30 bg-sky-500/5 dark:bg-sky-950/20 dark:border-sky-800/40'; break
    case 'violet': base = 'border-violet-500/30 bg-violet-500/5 dark:bg-violet-950/20 dark:border-violet-800/40'; break
    case 'teal': base = 'border-teal-500/30 bg-teal-500/5 dark:bg-teal-950/20 dark:border-teal-800/40'; break
    case 'orange': base = 'border-orange-500/30 bg-orange-500/5 dark:bg-orange-950/20 dark:border-orange-800/40'; break
    case 'fuchsia': base = 'border-fuchsia-500/30 bg-fuchsia-500/5 dark:bg-fuchsia-950/20 dark:border-fuchsia-800/40'; break
    default: base = 'border-border bg-card'; break
  }
  return customClass ? `${base} ${customClass}` : base
}

function getHeaderStyle(theme: InsightColorTheme) {
  switch (theme) {
    case 'destructive': return 'border-destructive/30 bg-destructive/10 hover:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30'
    case 'warning': return 'border-warning/30 bg-warning/10 hover:bg-warning/20 dark:bg-warning/20 dark:hover:bg-warning/30'
    case 'success': return 'border-success/30 bg-success/10 hover:bg-success/20 dark:bg-success/20 dark:hover:bg-success/30'
    case 'indigo': return 'border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40'
    case 'sky': return 'border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 dark:bg-sky-950/30 dark:hover:bg-sky-900/40'
    case 'violet': return 'border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 dark:bg-violet-950/30 dark:hover:bg-violet-900/40'
    case 'teal': return 'border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 dark:bg-teal-950/30 dark:hover:bg-teal-900/40'
    case 'orange': return 'border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 dark:bg-orange-950/30 dark:hover:bg-orange-900/40'
    case 'fuchsia': return 'border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 dark:bg-fuchsia-950/30 dark:hover:bg-fuchsia-900/40'
    default: return 'border-border bg-background/70 hover:bg-muted/70'
  }
}

function getItemStyle(theme: InsightColorTheme, isClickable?: boolean, itemClassName?: string) {
  let base = ''
  switch (theme) {
    case 'destructive':
      base = `border-destructive/30 bg-destructive/10 text-foreground dark:bg-destructive/20 ${isClickable ? 'transition-colors hover:border-destructive/60 hover:bg-destructive/20' : ''}`
      break
    case 'warning':
      base = `border-warning/30 bg-warning/10 text-foreground dark:bg-warning/20 ${isClickable ? 'transition-colors hover:border-warning/60 hover:bg-warning/20' : ''}`
      break
    case 'success':
      base = `border-success/30 bg-success/10 text-foreground dark:bg-success/20 ${isClickable ? 'transition-colors hover:border-success/60 hover:bg-success/20' : ''}`
      break
    case 'indigo':
      base = `border-indigo-500/25 bg-indigo-500/10 text-foreground dark:bg-indigo-950/30 ${isClickable ? 'transition-colors hover:border-indigo-500/60 hover:bg-indigo-500/15' : ''}`
      break
    case 'sky':
      base = `border-sky-500/25 bg-sky-500/10 text-foreground dark:bg-sky-950/30 ${isClickable ? 'transition-colors hover:border-sky-500/60 hover:bg-sky-500/15' : ''}`
      break
    case 'violet':
      base = `border-violet-500/25 bg-violet-500/10 text-foreground dark:bg-violet-950/30 ${isClickable ? 'transition-colors hover:border-violet-500/60 hover:bg-violet-500/15' : ''}`
      break
    case 'teal':
      base = `border-teal-500/25 bg-teal-500/10 text-foreground dark:bg-teal-950/30 ${isClickable ? 'transition-colors hover:border-teal-500/60 hover:bg-teal-500/15' : ''}`
      break
    case 'orange':
      base = `border-orange-500/25 bg-orange-500/10 text-foreground dark:bg-orange-950/30 ${isClickable ? 'transition-colors hover:border-orange-500/60 hover:bg-orange-500/15' : ''}`
      break
    case 'fuchsia':
      base = `border-fuchsia-500/25 bg-fuchsia-500/10 text-foreground dark:bg-fuchsia-950/30 ${isClickable ? 'transition-colors hover:border-fuchsia-500/60 hover:bg-fuchsia-500/15' : ''}`
      break
    default:
      base = `border-border bg-background/80 text-foreground ${isClickable ? 'transition-colors hover:border-primary/40 hover:bg-muted/30' : ''}`
      break
  }
  return itemClassName ? `${base} ${itemClassName}` : base
}

function getIndexColor(theme: InsightColorTheme) {
  switch (theme) {
    case 'destructive': return 'text-destructive font-semibold'
    case 'warning': return 'text-warning font-semibold'
    case 'success': return 'text-success font-semibold'
    case 'indigo': return 'text-indigo-600 dark:text-indigo-400 font-semibold'
    case 'sky': return 'text-sky-600 dark:text-sky-400 font-semibold'
    case 'violet': return 'text-violet-600 dark:text-violet-400 font-semibold'
    case 'teal': return 'text-teal-600 dark:text-teal-400 font-semibold'
    case 'orange': return 'text-orange-600 dark:text-orange-400 font-semibold'
    case 'fuchsia': return 'text-fuchsia-600 dark:text-fuchsia-400 font-semibold'
    default: return 'text-muted-foreground font-medium'
  }
}

function getBadgeStyle(theme: InsightColorTheme, badgeVariant?: BadgeProps['variant']) {
  if (badgeVariant && ['destructive', 'warning', 'success'].includes(badgeVariant)) {
    return { variant: badgeVariant, className: '' }
  }
  switch (theme) {
    case 'destructive': return { variant: 'destructive' as const, className: '' }
    case 'warning': return { variant: 'warning' as const, className: '' }
    case 'success': return { variant: 'success' as const, className: '' }
    case 'indigo': return { variant: 'outline' as const, className: 'border-indigo-500/30 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' }
    case 'sky': return { variant: 'outline' as const, className: 'border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300' }
    case 'violet': return { variant: 'outline' as const, className: 'border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300' }
    case 'teal': return { variant: 'outline' as const, className: 'border-teal-500/30 bg-teal-500/15 text-teal-700 dark:text-teal-300' }
    case 'orange': return { variant: 'outline' as const, className: 'border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-300' }
    case 'fuchsia': return { variant: 'outline' as const, className: 'border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300' }
    default: return { variant: badgeVariant || 'outline', className: '' }
  }
}

export default function ExpandableInsightGroup({
  title,
  items,
  children,
  itemCount,
  icon,
  badgeVariant,
  colorTheme,
  className = '',
  itemClassName = '',
  emptyLabel,
  defaultOpen = false,
  onItemClick,
  findings,
}: ExpandableInsightGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(() => new Set())
  const theme = resolveTheme(colorTheme, badgeVariant)
  const badgeStyle = getBadgeStyle(theme, badgeVariant)

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
    <section className={`rounded-lg border p-4 ${getContainerStyle(theme, className)}`}>
      <button
        type="button"
        className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${getHeaderStyle(theme)}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <Badge variant={badgeStyle.variant} className={badgeStyle.className}>{itemCount ?? items.length}</Badge>
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
              const finding = findings?.[index]

              return (
                <li
                  key={`${title}-${item}-${index}`}
                  className={`rounded-md border text-sm leading-6 ${getItemStyle(theme, isClickable, itemClassName)}`}
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
                      <span className={`mr-2 ${getIndexColor(theme)}`}>{index + 1}.</span>
                      {isLong && !isExpanded ? item.slice(0, LONG_ITEM_LENGTH).replace(/\s\S*$/, '') + '…' : item}
                    </div>
                    {finding ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {confidenceBadge(finding?.confidence ?? null)}
                        {severityBadge(finding?.severity)}
                        {finding?.impact ? <span className="text-[10px] text-muted-foreground">{finding.impact}</span> : null}
                      </div>
                    ) : null}
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


