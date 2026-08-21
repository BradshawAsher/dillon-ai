import { useState } from 'react'
import { Check, Copy, ExternalLink, Link2, Mail, X } from 'lucide-react'
import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { copyToClipboard } from '../utils/clipboard'
import { buildDealEmailDraft } from '../utils/dealEmailDraft'
import { getSubmissionInsightTone } from '../utils/aiSubmissionData'

export interface DealEmailDraftModalProps {
    isOpen: boolean
    onClose: () => void
    model?: DealModel
    synthesis?: ProjectSynthesisItem
    projectName?: string
    projectId?: string
}

export default function DealEmailDraftModal({
    isOpen,
    onClose,
    model,
    synthesis,
    projectName,
    projectId,
}: DealEmailDraftModalProps) {
    const [copiedModalEmail, setCopiedModalEmail] = useState(false)
    const [copiedModalSubject, setCopiedModalSubject] = useState(false)
    const [copiedModalLink, setCopiedModalLink] = useState(false)

    if (!isOpen) return null

    const emailDraft = buildDealEmailDraft({
        model,
        synthesis,
        projectName: projectName || synthesis?.projectName || synthesis?.companyName,
        projectKey: projectId || synthesis?.projectId || model?.projectId,
    })

    const handleCopyFullEmail = async () => {
        if (await copyToClipboard(`Subject: ${emailDraft.subject}\n\n${emailDraft.body}`)) {
            setCopiedModalEmail(true)
            setTimeout(() => setCopiedModalEmail(false), 2000)
        }
    }

    const handleCopySubject = async () => {
        if (await copyToClipboard(emailDraft.subject)) {
            setCopiedModalSubject(true)
            setTimeout(() => setCopiedModalSubject(false), 2000)
        }
    }

    const handleCopyLink = async () => {
        if (await copyToClipboard(emailDraft.permalink)) {
            setCopiedModalLink(true)
            setTimeout(() => setCopiedModalLink(false), 2000)
        }
    }

    const handleOpenMailto = () => {
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`
        window.open(mailtoUrl, '_blank')
    }

    const modalBadgeTone = getSubmissionInsightTone(
        emailDraft.posture === 'RED' ? 'RED' : emailDraft.posture === 'YELLOW' ? 'YELLOW' : emailDraft.posture === 'GREEN' ? 'GREEN' : 'YELLOW'
    )

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div 
                className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-labelledby="email-modal-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-md bg-indigo-500/10 p-1.5 text-indigo-600 dark:text-indigo-400">
                            <Mail className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 id="email-modal-title" className="text-base font-bold text-foreground">
                                Deal Update Email Draft
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Ready to send to investment committee, partners, or deal team
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={modalBadgeTone} className="text-xs font-bold">
                            {emailDraft.posture === 'RED' ? '🔴 ESCALATE' : emailDraft.posture === 'YELLOW' ? '🟡 RENEGOTIATE' : emailDraft.posture === 'GREEN' ? '🟢 PROCEED' : '⚪ PENDING'}
                        </Badge>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            aria-label="Close dialog"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                    {/* Subject line box */}
                    <div className="rounded-lg border border-border bg-muted/30 p-3.5">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Subject Line</span>
                            <button
                                type="button"
                                onClick={handleCopySubject}
                                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                            >
                                {copiedModalSubject ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                <span>{copiedModalSubject ? 'Copied' : 'Copy Subject'}</span>
                            </button>
                        </div>
                        <p className="text-xs font-semibold text-foreground select-all">{emailDraft.subject}</p>
                    </div>

                    {/* Full Email Body box */}
                    <div className="rounded-lg border border-border bg-muted/20 p-3.5">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email Body & Overview Link</span>
                            <button
                                type="button"
                                onClick={handleCopyLink}
                                className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                            >
                                {copiedModalLink ? <Check className="h-3 w-3 text-green-600" /> : <Link2 className="h-3 w-3" />}
                                <span>{copiedModalLink ? 'Link Copied' : 'Copy Overview Link'}</span>
                            </button>
                        </div>
                        <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed select-text font-normal">
                            {emailDraft.body}
                        </pre>
                    </div>
                </div>

                {/* Footer action bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border bg-muted/40 px-5 py-3">
                    <span className="text-[11px] text-muted-foreground">
                        Generated with Dillon AI live synthesis data
                    </span>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={handleOpenMailto}
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted shadow-2xs"
                            title="Open draft directly in default mail client"
                        >
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Open in Mail</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleCopyFullEmail}
                            className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 shadow-2xs"
                            title="Copy complete subject and body to clipboard"
                        >
                            {copiedModalEmail ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copiedModalEmail ? 'Email Copied!' : 'Copy Full Email'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
