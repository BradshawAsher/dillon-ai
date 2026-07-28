import { Suspense, type ReactNode } from 'react'

import ErrorBoundary from './ErrorBoundary'

type SafeSuspenseProps = {
  children: ReactNode
  /** Shown while the lazy chunk loads. Defaults to a subtle skeleton. */
  fallback?: ReactNode
  /** Label used by the error fallback copy, e.g. "analysis". */
  label?: string
}

function DefaultSkeleton() {
  return (
    <div
      className="animate-pulse rounded-xl border border-border bg-muted/20 p-4"
      aria-hidden="true"
    >
      <div className="h-4 w-1/3 rounded bg-muted" />
      <div className="mt-3 h-3 w-2/3 rounded bg-muted" />
      <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
    </div>
  )
}

/**
 * Pairs a Suspense boundary with an ErrorBoundary so a lazy-loaded card that
 * fails to load or throws while rendering is isolated to its own section
 * instead of blanking the whole dashboard. Replaces bare `<Suspense fallback=
 * {null}>` around lazy card groups.
 */
export default function SafeSuspense({ children, fallback, label }: SafeSuspenseProps) {
  return (
    <ErrorBoundary label={label ?? 'section'}>
      <Suspense fallback={fallback ?? <DefaultSkeleton />}>{children}</Suspense>
    </ErrorBoundary>
  )
}
