type WorkspaceTab = 'overview' | 'diligence' | 'valuation' | 'returns' | 'growth' | 'structure' | 'documents' | 'errors'

type DealWorkspaceNavProps = {
    activeTab: WorkspaceTab
    onTabChange: (tab: WorkspaceTab) => void
}

const tabs: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'diligence', label: 'Diligence' },
    { id: 'valuation', label: 'Valuation' },
    { id: 'returns', label: 'Returns' },
    { id: 'growth', label: 'Growth' },
    { id: 'structure', label: 'Deal Structure' },
    { id: 'documents', label: 'Projects' },
    { id: 'errors', label: 'Errors' },
]

export type { WorkspaceTab }

export default function DealWorkspaceNav({ activeTab, onTabChange }: DealWorkspaceNavProps) {
    return (
        <nav id="deal-workspace" aria-label="Deal workspace" className="sticky top-3 z-20 overflow-x-auto rounded-xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur">
            <div className="flex min-w-max gap-1" role="tablist" aria-label="Deal workspace sections">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            className={isActive
                                ? 'rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm'
                                : 'rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'}
                            onClick={() => onTabChange(tab.id)}
                        >
                            {tab.label}
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}
