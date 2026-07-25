import { useState } from 'react'
import { UserCircle } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Input } from '../lib/shadcn/input'
import { parseDocumentedFacts } from '../utils/evidence'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

type BuyerProfile = {
    buyerType: string
    industryExperience: string
    capitalAvailable: string
    acquisitionGoal: string
    managementPreference: string
}

function getAcquisitionFitReasons(profile: BuyerProfile, model: DealModel, synthesis?: ProjectSynthesisItem): string[] {
    const reasons: string[] = []
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const revenue = facts.revenue?.status === 'confirmed' && typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
    const ebitda = facts.ebitda_sde?.status === 'confirmed' && typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
    const price = model.purchasePrice ?? model.askingPrice

    if (profile.buyerType.toLowerCase().includes('first') && synthesis?.redFlags && synthesis.redFlags.length > 3) {
        reasons.push('Elevated risk for a first-time buyer — multiple red flags may require experienced operational management.')
    }

    if (profile.buyerType.toLowerCase().includes('strategic') && ebitda && revenue && ebitda / revenue > 0.2) {
        reasons.push('Healthy margins suggest strong cash flow generation — good fit for strategic integration.')
    }

    if (profile.capitalAvailable && price) {
        const capital = Number(profile.capitalAvailable.replace(/[^0-9.]/g, ''))
        if (capital > 0 && capital < price * 0.3) {
            reasons.push('Available capital may be below the typical 30% equity requirement. Consider SBA or seller financing.')
        }
        if (capital > 0 && capital >= price) {
            reasons.push('Sufficient capital for an all-cash deal — strongest negotiation position.')
        }
    }

    if (profile.acquisitionGoal.toLowerCase().includes('cash flow') && ebitda && ebitda > 0) {
        reasons.push(`Current EBITDA of $${(ebitda / 1_000_000).toFixed(1)}M supports a cash-flow acquisition strategy.`)
    }

    if (profile.managementPreference.toLowerCase().includes('hands-off') && synthesis?.openQuestions && synthesis.openQuestions.length > 2) {
        reasons.push('Multiple open questions suggest a hands-off approach may leave value on the table. Consider key-person risk.')
    }

    if (profile.industryExperience && synthesis?.greenFlags) {
        const industryMatch = synthesis.greenFlags.some((f) => f.toLowerCase().includes(profile.industryExperience.toLowerCase()))
        if (industryMatch) reasons.push('Your industry experience aligns with identified strengths in this target.')
    }

    if (reasons.length === 0 && (profile.buyerType || profile.acquisitionGoal)) {
        reasons.push('Fill in more buyer details and upload financial documents to see fit analysis.')
    }

    return reasons
}

const storageKey = 'mergeworks.buyerProfile'

export default function BuyerProfileCard({ model, synthesis }: Props) {
    const [profile, setProfile] = useState<BuyerProfile>(() => {
        try {
            const stored = window.localStorage.getItem(storageKey)
            if (stored) return JSON.parse(stored) as BuyerProfile
        } catch {}
        return { buyerType: '', industryExperience: '', capitalAvailable: '', acquisitionGoal: '', managementPreference: '' }
    })
    const [isEditing, setIsEditing] = useState(!profile.buyerType)

    const save = (updated: BuyerProfile) => {
        setProfile(updated)
        try { window.localStorage.setItem(storageKey, JSON.stringify(updated)) } catch {}
    }

    const reasons = getAcquisitionFitReasons(profile, model, synthesis)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <UserCircle className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Buyer profile</CardTitle>
                        </div>
                        <CardDescription>Define the buyer&apos;s characteristics to see explainable acquisition-fit reasoning. No opaque scores — only transparent logic.</CardDescription>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => setIsEditing(!isEditing)}>
                        {isEditing ? 'Done' : 'Edit profile'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
                {isEditing ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Buyer type</span>
                            <Input value={profile.buyerType} onChange={(e) => save({ ...profile, buyerType: e.target.value })} placeholder="e.g., First-time buyer, Strategic, PE-backed" />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Industry experience</span>
                            <Input value={profile.industryExperience} onChange={(e) => save({ ...profile, industryExperience: e.target.value })} placeholder="e.g., SaaS, Manufacturing, Healthcare" />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Capital available</span>
                            <Input value={profile.capitalAvailable} onChange={(e) => save({ ...profile, capitalAvailable: e.target.value })} placeholder="e.g., $500K, $2M" />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Acquisition goal</span>
                            <Input value={profile.acquisitionGoal} onChange={(e) => save({ ...profile, acquisitionGoal: e.target.value })} placeholder="e.g., Cash flow, Growth platform, Bolt-on" />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Management preference</span>
                            <Input value={profile.managementPreference} onChange={(e) => save({ ...profile, managementPreference: e.target.value })} placeholder="e.g., Owner-operator, Hands-off, Hybrid" />
                        </label>
                    </div>
                ) : profile.buyerType ? (
                    <div className="flex flex-wrap gap-2">
                        {profile.buyerType && <Badge variant="outline">{profile.buyerType}</Badge>}
                        {profile.industryExperience && <Badge variant="outline">{profile.industryExperience}</Badge>}
                        {profile.capitalAvailable && <Badge variant="outline">{profile.capitalAvailable}</Badge>}
                        {profile.acquisitionGoal && <Badge variant="outline">{profile.acquisitionGoal}</Badge>}
                        {profile.managementPreference && <Badge variant="outline">{profile.managementPreference}</Badge>}
                    </div>
                ) : null}

                {reasons.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">Acquisition-fit reasoning</p>
                        {reasons.map((reason) => (
                            <div key={reason} className="rounded-md border border-border bg-muted/20 p-3 text-sm text-foreground">
                                {reason}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
