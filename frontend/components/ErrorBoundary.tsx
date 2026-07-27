import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
  /** Optional custom fallback. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** Short label used in the default fallback copy, e.g. "dashboard". */
  label?: string
}

type ErrorBoundaryState = {
  error: Error | null
}

/**
 * Catches render/lifecycle errors in the subtree so a single failing card
 * shows a recoverable message instead of unmounting the entire dashboard.
 * React error boundaries must be class components.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep a console trail for support; no external telemetry is wired up.
    console.error('ErrorBoundary caught an error', error, info.componentStack)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state

    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset)
      }

      const label = this.props.label ?? 'view'

      return (
        <div
          role="alert"
          className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground"
        >
          <p className="font-medium">Something went wrong loading this {label}.</p>
          <p className="mt-1 text-muted-foreground">
            The rest of the workspace is still usable. You can retry this section below.
          </p>
          {error.message ? (
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
              {error.message}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={this.reset}
            className="mt-3 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
