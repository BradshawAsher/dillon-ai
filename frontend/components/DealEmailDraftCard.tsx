import { useMemo, useState } from 'react'
import { copyToClipboard } from '../utils/clipboard'
import { Check, Copy, ExternalLink, Link2, Mail } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardInfoPopover from './common/CardInfoPopover'
import { buildDealEmailDraft } from '../utils/dealEmailDraft'
import { getSubmissionInsightTone } from '../utils/aiSubmissionData'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    projectName: string
}

export default function DealEmailDraftCard({ model, synthesis, projectName }: Props) {
    const [copiedEmail, setCopiedEmail] = useState(false)
    const [copiedLink, setCopiedLink] = useState(false)

    const email = useMemo(() => {
        return buildDealEmailDraft({
            model,
            synthesis,
            projectName,
            projectKey: synthesis?.projectId || model?.projectId,
        })
    }, [model, synthesis, projectName])

    const handleCopyEmail = async () => {
        if (await copyToClipboard(`Subject: ${email.subject}\n\n${email.body}`)) {
            setCopiedEmail(true)
            setTimeout(() => setCopiedEmail(false), 2000)
        }
    }

    const handleCopyLink = async () => {
        if (await copyToClipboard(email.permalink)) {
            setCopiedLink(true)
            setTimeout(() => setCopiedLink(false), 2000)
        }
    }

    const handleOpenMailto = () => {
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`
        window.open(mailtoUrl, '_blank')
    }

    const badgeTone = getSubmissionInsightTone(email.posture === 'RED' ? 'RED' : email.posture === 'YELLOW' ? 'YELLOW' : email.posture === 'GREEN' ? 'GREEN' : 'YELLOW')

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Team update draft</CardTitle>
                        <CardInfoPopover cardId="deal-email-draft" />
                        <Badge variant={badgeTone} className="ml-1 text-[11px] font-bold">
                            {email.posture === 'RED' ? '🔴 ESCALATE' : email.posture === 'YELLOW' ? '🟡 RENEGOTIATE' : email.posture === 'GREEN' ? '🟢 PROCEED' : '⚪ PENDING'}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground shadow-2xs"
                            title="Copy permanent Overview link to clipboard"
                        >
                            {copiedLink ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Link2 className="h-3.5 w-3.5" />}
                            <span>{copiedLink ? 'Link Copied' : 'Copy Deal Link'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenMailto}
                            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground shadow-2xs"
                            title="Open prefilled draft in default mail app"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Open in Mail</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleCopyEmail}
                            className="flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20 shadow-2xs"
                            title="Copy entire email to clipboard"
                        >
                            {copiedEmail ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copiedEmail ? 'Email Copied!' : 'Copy Full Email'}</span>
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Subject Line</span>
                        <button
                            type="button"
                            onClick={async () => {
                                if (await copyToClipboard(email.subject)) {
                                    setCopiedEmail(true)
                                    setTimeout(() => setCopiedEmail(false), 2000)
                                }
                            }}
                            className="text-[11px] text-primary hover:underline font-medium"
                        >
                            Copy Subject
                        </button>
                    </div>
                    <p className="text-xs font-semibold text-foreground">{email.subject}</p>
                </div>

                <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email Body Preview</span>
                        <span className="text-[11px] text-muted-foreground">Includes Overview Permalink</span>
                    </div>
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed select-text">{email.body}</pre>
                </div>
            </CardContent>
        </Card>
    )
}
