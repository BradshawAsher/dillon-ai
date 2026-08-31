import React from 'react'
import { Globe } from 'lucide-react'
import { cn } from './shadcn/utils'
import { getDataSource, type DataSource } from './dataSource'

export default function DataSourceToggle() {
    const current = getDataSource()
    const [currentView, setCurrentView] = React.useState<'landing' | 'dashboard'>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            if (params.get('view') === 'dashboard' || params.get('app') === 'true') {
                return 'dashboard'
            }
        }
        return 'landing'
    })

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleLocationChange = () => {
                const params = new URLSearchParams(window.location.search)
                if (params.get('view') === 'dashboard' || params.get('app') === 'true') {
                    setCurrentView('dashboard')
                } else {
                    setCurrentView('landing')
                }
            }
            window.addEventListener('popstate', handleLocationChange)
            return () => window.removeEventListener('popstate', handleLocationChange)
        }
    }, [])

    const handleLandingClick = () => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            url.search = ''
            window.history.pushState({ view: 'landing' }, '', url.pathname)
            window.dispatchEvent(new PopStateEvent('popstate'))
            setCurrentView('landing')
        }
    }

    const handleModeClick = (mode: DataSource) => {
        try {
            window.localStorage.setItem('dueDiligenceDashboard.dataSource', mode)
        } catch {}

        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            const isAlreadyDashboard = url.searchParams.get('view') === 'dashboard' || url.searchParams.get('app') === 'true'
            url.searchParams.set('view', 'dashboard')
            url.hash = 'upload-section'

            if (isAlreadyDashboard) {
                window.location.reload()
            } else {
                window.location.href = url.toString()
            }
        }
    }

    const isLanding = currentView === 'landing'

    return (
        <div className="fixed bottom-3 right-3 z-50 flex max-w-[calc(100vw-1.5rem)] items-center gap-1 rounded-full border border-border/80 bg-card/95 p-1.5 shadow-2xl backdrop-blur-md sm:bottom-4 sm:right-4">
            <span className="pl-2 pr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Data
            </span>

            {/* Landing Page Button */}
            <button
                type="button"
                title="View Product Landing Page"
                onClick={handleLandingClick}
                className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer',
                    isLanding
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
            >
                <Globe className="h-3.5 w-3.5" />
                Landing Page
            </button>
            
            {/* Example Mode Button */}
            <button
                type="button"
                title="Switch to Example Mock Data"
                onClick={() => handleModeClick('mock')}
                className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer',
                    !isLanding && current === 'mock'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
            >
                <span className={cn('h-2 w-2 rounded-full', !isLanding && current === 'mock' ? 'bg-white' : 'bg-amber-500')} />
                Example Mode
            </button>

            {/* Live n8n Button */}
            <button
                type="button"
                title="Switch to Live n8n Production Webhooks"
                onClick={() => handleModeClick('live')}
                className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer',
                    !isLanding && current === 'live'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
            >
                <span className={cn('h-2 w-2 rounded-full', !isLanding && current === 'live' ? 'bg-white' : 'bg-emerald-500')} />
                Live n8n
            </button>
        </div>
    )
}
