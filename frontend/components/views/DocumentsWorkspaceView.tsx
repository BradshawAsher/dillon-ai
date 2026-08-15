import React from 'react'
import SectionHeader from '../SectionHeader'
import ProjectPortfolioCard from '../ProjectPortfolioCard'

type DocumentsWorkspaceViewProps = {
    submissionHistory: any[]
    visibleProjectSyntheses: any[]
    selectedProjectKey: string
    handlePortfolioProjectSelect: (key: string) => void
    handleExcludeDocument: (requestId: any) => void
    handleIncludeDocument: (requestId: any) => void
    handleRetryFailedDocument: (requestId: any) => void
    handleRequeueNewProject: (requestId: any) => void
    retryingRequestId: string | null
    handleRunSynthesis: () => Promise<void>
    isCurrentProjectAwaitingSynthesis: boolean
    setSelectedProjectKey: (key: string) => void
}

export function DocumentsWorkspaceView({
    submissionHistory,
    visibleProjectSyntheses,
    selectedProjectKey,
    handlePortfolioProjectSelect,
    handleExcludeDocument,
    handleIncludeDocument,
    handleRetryFailedDocument,
    handleRequeueNewProject,
    retryingRequestId,
    handleRunSynthesis,
    isCurrentProjectAwaitingSynthesis,
    setSelectedProjectKey,
}: DocumentsWorkspaceViewProps) {
    return (
        <section id="project-portfolio" className="scroll-mt-6 space-y-4">
            <div id="documents-header" className="scroll-mt-6">
                <SectionHeader
                    step={1}
                    title="Document portfolio"
                    description="Every uploaded document grouped by project, with coverage and duplicates."
                />
            </div>
            <div id="documents-grid" className="scroll-mt-6">
                <ProjectPortfolioCard
                    rows={submissionHistory}
                    syntheses={visibleProjectSyntheses}
                    activeProjectKey={selectedProjectKey}
                    onProjectSelect={handlePortfolioProjectSelect}
                    onExcludeDocument={handleExcludeDocument}
                    onIncludeDocument={handleIncludeDocument}
                    onRetryDocument={handleRetryFailedDocument}
                    onRequeueNewProject={handleRequeueNewProject}
                    retryingRequestId={retryingRequestId}
                    onRunSynthesis={() => {
                        void handleRunSynthesis()
                    }}
                    runningSynthesis={isCurrentProjectAwaitingSynthesis}
                    onAddDocuments={(projectKey) => {
                        setSelectedProjectKey(projectKey)
                        setTimeout(() => {
                            document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth' })
                        }, 100)
                    }}
                />
            </div>
        </section>
    )
}
