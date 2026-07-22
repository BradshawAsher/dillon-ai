import type { ReactNode } from 'react'

type SectionHeaderProps = {
    step: number
    title: string
    description?: string
    action?: ReactNode
}

// A calm, numbered divider that separates the major zones of the diligence
// workspace so categories read as distinct rather than one long wall.
export default function SectionHeader({ step, title, description, action }: SectionHeaderProps) {
    return (
        <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {step}
                </span>
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
                    {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
                </div>
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
        </div>
    )
}
