import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../lib/shadcn/card'
import { Button } from '../lib/shadcn/button'
import { Badge } from '../lib/shadcn/badge'
import { Radio, Send, Settings, CheckCircle2, BellRing, Loader2, ArrowUpRight } from 'lucide-react'
import DealWarRoomModal from './DealWarRoomModal'
import {
    getWarRoomConfig,
    detectPlatformFromUrl,
    dispatchWarRoomAlert,
    type WarRoomDealSummary,
    type WarRoomConfig,
} from '../services/dealWarRoomService'
import { computeValuationBridge } from '../utils/valuationBridge'

export interface DealWarRoomCardProps {
    projectId: string
    projectName: string
    model?: any
    synthesis?: any
    documents?: any[]
}

export default function DealWarRoomCard({
    projectId,
    projectName,
    model,
    synthesis,
    documents,
}: DealWarRoomCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [config, setConfig] = useState<WarRoomConfig>(() => getWarRoomConfig(projectId))
    const [isBroadcasting, setIsBroadcasting] = useState(false)
    const [broadcastStatus, setBroadcastStatus] = useState<'success' | 'error' | null>(null)

    useEffect(() => {
        setConfig(getWarRoomConfig(projectId))
    }, [projectId, isModalOpen])

    const isConnected = Boolean(config.webhookUrl.trim() && config.enabled)
    const platform = detectPlatformFromUrl(config.webhookUrl)

    const bridge = useMemo(() => {
        return computeValuationBridge(model, synthesis)
    }, [model, synthesis])

    const dealSummary: WarRoomDealSummary = useMemo(() => {
        const askingPrice = model?.askingPrice ?? model?.purchasePrice ?? null
        const ebitda = model?.documentedFactsJson ? undefined : null
        return {
            projectName: projectName || 'Active Deal',
            dealName: projectName,
            askingPrice,
            purchasePrice: model?.purchasePrice ?? askingPrice,
            ebitda,
            normalizedEbitda: bridge.normalizedEbitda || null,
            entryMultiple: bridge.entryMultiple || null,
            riskLevel: synthesis?.finalRiskLevel || 'MODERATE',
            trafficLight: synthesis?.finalTrafficLight || 'YELLOW',
            recommendation: synthesis?.finalRecommendation || undefined,
            redFlags: synthesis?.redFlags || [],
            valuationBridgeDeductions: bridge.totalEvDeduction || null,
            specialEscrow: bridge.totalSpecialEscrow || null,
            counterOffer: bridge.defensibleCounterOffer || null,
            dashboardUrl: typeof window !== 'undefined' ? window.location.href.split('#')[0] : 'https://app.mergeworks.com',
        }
    }, [projectName, model, synthesis, bridge])

    const handleBroadcast = async () => {
        if (!config.webhookUrl.trim()) {
            setIsModalOpen(true)
            return
        }
        setIsBroadcasting(true)
        setBroadcastStatus(null)
        try {
            const res = await dispatchWarRoomAlert(projectId, dealSummary, config)
            if (res.success) {
                setBroadcastStatus('success')
                setConfig(getWarRoomConfig(projectId))
                setTimeout(() => setBroadcastStatus(null), 3000)
            } else {
                setBroadcastStatus('error')
                setTimeout(() => setBroadcastStatus(null), 4000)
            }
        } catch {
            setBroadcastStatus('error')
            setTimeout(() => setBroadcastStatus(null), 4000)
        } finally {
            setIsBroadcasting(false)
        }
    }

    return (
        <Card id="overview-war-room" className="scroll-mt-6 border-border/70 bg-card/60 backdrop-blur-sm shadow-sm transition-all hover:border-border">
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
                            <Radio className={`w-4 h-4 ${isConnected ? 'animate-pulse' : ''}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-base font-semibold text-foreground">Deal War Room Bot</CardTitle>
                                {isConnected ? (
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-medium gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {platform === 'teams' ? 'Teams' : 'Slack'} Connected
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                                        Not Connected
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="text-xs">
                                Real-time deal team broadcasting to Slack &amp; Microsoft Teams channels.
                            </CardDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isConnected ? (
                            <>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleBroadcast}
                                    disabled={isBroadcasting}
                                    className="text-xs h-8 gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                >
                                    {isBroadcasting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                    {broadcastStatus === 'success' ? 'Broadcast Dispatched!' : 'Broadcast to War Room'}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setIsModalOpen(true)}
                                    className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
                                    title="Configure War Room Settings"
                                >
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setIsModalOpen(true)}
                                className="text-xs h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                            >
                                <BellRing className="w-3 h-3" />
                                Connect Slack / Teams
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0 text-xs text-muted-foreground">
                {isConnected ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px]">
                        <span>
                            Channel: <span className="font-mono text-foreground">{config.channelName || (platform === 'teams' ? 'MS Teams Channel' : '#slack-channel')}</span>
                            {' • '}
                            Trigger: <span className="text-foreground">Verdicts &amp; Red Flags</span>
                        </span>
                        <span>
                            {config.lastAlertSentAt ? (
                                <>Last broadcast: <span className="text-foreground">{new Date(config.lastAlertSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></>
                            ) : (
                                <span>Ready to broadcast</span>
                            )}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/40 text-[11px]">
                        <p>Keep sponsors and IC members informed instantly when phantom revenue, unverified add-backs, or Buy/Pass verdicts are detected.</p>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="text-primary hover:underline flex items-center gap-0.5 shrink-0"
                        >
                            Setup Webhook <ArrowUpRight className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </CardContent>

            <DealWarRoomModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                projectId={projectId}
                projectName={projectName}
                summary={dealSummary}
            />
        </Card>
    )
}
