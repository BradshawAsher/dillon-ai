import { cn } from './shadcn/utils'
import { getDataSource, setDataSource, type DataSource } from './dataSource'

const options: Array<{ value: DataSource; label: string; hint: string }> = [
  {
    value: 'mock',
    label: 'Mock',
    hint: 'In-memory sample data — no network calls',
  },
  {
    value: 'live',
    label: 'Live n8n',
    hint: 'Real webhooks — submitting a file triggers the production workflow',
  },
]

export default function DataSourceToggle() {
  const current = getDataSource()

  return (
    <div className="fixed bottom-3 right-3 z-50 flex max-w-[calc(100vw-1.5rem)] items-center gap-1 rounded-full border border-border bg-card p-1 shadow-retool-md sm:bottom-4 sm:right-4">
      <span className="pl-2.5 pr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Data
      </span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.hint}
          onClick={() => {
            if (option.value !== current) {
              setDataSource(option.value)
            }
          }}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
            option.value === current
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              option.value === 'live' ? 'bg-success' : 'bg-warning',
              option.value === current ? 'opacity-100' : 'opacity-50'
            )}
          />
          {option.label}
        </button>
      ))}
    </div>
  )
}
