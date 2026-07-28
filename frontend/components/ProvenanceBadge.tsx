import { Badge } from '../lib/shadcn/badge'
import { getProvenanceCategory, type EvidenceItem } from '../utils/evidence'

type Props = {
    provenance?: string
    status?: string
    formula?: string
    documentUrl?: string
    documentId?: string
    sourceFile?: string
    className?: string
}

export function ProvenanceBadgeFromEvidence({ evidence, className }: { evidence: EvidenceItem; className?: string }) {
    return (
        <ProvenanceBadge
            provenance={evidence.provenance}
            status={evidence.status}
            formula={evidence.formula}
            documentUrl={evidence.documentUrl}
            documentId={evidence.documentId}
            sourceFile={evidence.sourceFile}
            className={className}
        />
    )
}

export default function ProvenanceBadge({
    provenance,
    status,
    formula,
    documentUrl,
    documentId,
    sourceFile,
    className,
}: Props) {
    const presentation = getProvenanceCategory({
        provenance,
        status,
        formula,
        documentUrl,
        documentId,
        sourceFile,
    })

    return (
        <Badge
            variant={presentation.variant}
            className={className}
            title={`Data origin: ${presentation.label}`}
        >
            {presentation.label}
        </Badge>
    )
}
