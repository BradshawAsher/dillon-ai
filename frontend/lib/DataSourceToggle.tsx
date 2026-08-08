import React from 'react'
import { Globe } from 'lucide-react'
import { cn } from './shadcn/utils'
import { getDataSource, setDataSource, type DataSource } from './dataSource'

export default function DataSourceToggle() {
    const current = getDataSource()

    const handleLandingClick = () => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            url.searchParams.delete('view')
            url.searchParams.delete('app')
            window.history.pushState({ view: 'landing' }, '', url.pathname)
            window.dispatchEvent(new PopStateEvent('popstate'))
        }
    }

    const handleModeClick = (mode: DataSource) => {
        if (current !== mode) {
            setDataSource(mode)
        } else if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            if (params.get('view') !== 'dashboard') {
                const url = new URL(window.location.href)
                url.searchParams.set('view', 'dashboard')
                window.history.pushState({ view: 'dashboard' }, '', url.toString())
                window.dispatchEvent(new PopStateEvent('popstate'))
            }
        }
    }

    return (
        <div className="fixed bottom-3 right-3 z-50 flex max-w-[calc(100vw-1.5rem)] items-center gap-1 rounded-full border border-border/80 bg-card/95 p-1.5 shadow-2xl backdrop-blur-md sm:bottom-4 sm:right-4">
            <span className="pl-2 pr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Data
            </span>
            
            {/* Example Mode Button */}
            <button
                type="button"
                title="Switch to Example Mock Data"
                onClick={() => handleModeClick('mock')}
                className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all',
                    current === 'mock'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
            >
                <span className={cn('h-2 w-2 rounded-full', current === 'mock' ? 'bg-white' : 'bg-amber-500')} />
                Example Mode
            </button>

            {/* Live n8n Button */}
            <button
                type="button"
                title="Switch to Live n8n Production Webhooks"
                onClick={() => handleModeClick('live')}
                className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all',
                    current === 'live'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
            >
                <span className={cn('h-2 w-2 rounded-full', current === 'live' ? 'bg-white' : 'bg-emerald-500')} />
                Live n8n
            </button>

            {/* Landing Page Button */}
            <button
                type="button"
                title="Return to Product Landing Page"
                onClick={handleLandingClick}
                className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all border border-primary/20 shadow-2xs"
            >
                <Globe className="h-3.5 w-3.5" />
                Landing Page
            </button>
        </div>
    )
}
