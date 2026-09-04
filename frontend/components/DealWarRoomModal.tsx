import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../lib/shadcn/card'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Badge } from '../lib/shadcn/badge'
import {
    Radio,
    CheckCircle2,
    X,
    Send,
    AlertCircle,
    BellRing,
    Loader2,
    Sliders,
    MessageSquare,
    Check,
} from 'lucide-react'
import {
    getWarRoomConfig,
    saveWarRoomConfig,
    detectPlatformFromUrl,
    dispatchWarRoomAlert,
    testWarRoomWebhook,
    type WarRoomConfig,
    type WarRoomDealSummary,
} from '../services/dealWarRoomService'

export interface DealWarRoomModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string
    projectName: string
    summary: WarRoomDealSummary
}

export default function DealWarRoomModal({
    open,
    onOpenChange,
    projectId,
    projectName,
    summary,
}: DealWarRoomModalProps) {
    const [config, setConfig] = useState<WarRoomConfig>(() => getWarRoomConfig(projectId))
    const [isTesting, setIsTesting] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
    const [isBroadcasting, setIsBroadcasting] = useState(false)
    const [broadcastResult, setBroadcastResult] = useState<{ success: boolean; message: string } | null>(null)
    const [isSaved, setIsSaved] = useState(false)

    useEffect(() => {
        if (open) {
            setConfig(getWarRoomConfig(projectId))
            setTestResult(null)
            setBroadcastResult(null)
            setIsSaved(false)
        }
    }, [open, projectId])

    useEffect(() => {
        if (!open) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onOpenChange(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open, onOpenChange])

    if (!open) return null

    const detectedPlatform = detectPlatformFromUrl(config.webhookUrl)

    const handleSave = () => {
        saveWarRoomConfig(config)
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 2500)
    }

    const handleTestConnection = async () => {
        if (!config.webhookUrl.trim()) {
            setTestResult({ success: false, message: 'Please enter a webhook URL first.' })
            return
        }
        setIsTesting(true)
        setTestResult(null)
        try {
            const res = await testWarRoomWebhook(config.webhookUrl, projectName)
            if (res.success) {
                setTestResult({ success: true, message: 'Test ping received! Channel verified.' })
            } else {
                setTestResult({ success: false, message: res.error || 'Connection failed.' })
            }
        } catch (err: any) {
            setTestResult({ success: false, message: err?.message || 'Failed to send test alert.' })
        } finally {
            setIsTesting(false)
        }
    }

    const handleBroadcastNow = async () => {
        if (!config.webhookUrl.trim()) {
            setBroadcastResult({ success: false, message: 'Please enter a webhook URL first.' })
            return
        }
        setIsBroadcasting(true)
        setBroadcastResult(null)
        try {
            // Save config before dispatching
            saveWarRoomConfig(config)
            const res = await dispatchWarRoomAlert(projectId, summary, config)
            if (res.success) {
                setBroadcastResult({ success: true, message: 'Deal summary successfully broadcast to War Room!' })
            } else {
                setBroadcastResult({ success: false, message: res.error || 'Broadcast failed.' })
            }
        } catch (err: any) {
            setBroadcastResult({ success: false, message: err?.message || 'Broadcast failed.' })
        } finally {
            setIsBroadcasting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <Card className="w-full max-w-2xl bg-card border-border shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                <button
                    type="button"
                    aria-label="Close dialog"
                    onClick={() => onOpenChange(false)}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <CardHeader className="border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <Radio className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                Deal War Room Bot
                                <Badge variant="outline" className="text-xs font-normal border-primary/30 text-primary">
                                    Slack & Teams
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Connect live diligence findings, synthesis verdicts, and red flags directly to your deal channel.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-5">
                    {/* Webhook Configuration */}
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="webhook-url" className="text-xs font-medium text-foreground">
                                    Incoming Webhook URL <span className="text-destructive">*</span>
                                </Label>
                                {config.webhookUrl.trim() && (
                                    <Badge variant="secondary" className="text-[10px] tracking-wide uppercase font-semibold">
                                        {detectedPlatform === 'teams' ? 'Microsoft Teams' : 'Slack'} Detected
                                    </Badge>
                                )}
                            </div>
                            <Input
                                id="webhook-url"
                                placeholder="https://hooks.slack.com/services/... or https://*.webhook.office.com/..."
                                value={config.webhookUrl}
                                onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                                className="font-mono text-xs bg-background/50"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Paste the Incoming Webhook URL from your deal's Slack or Microsoft Teams channel.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="channel-name" className="text-xs font-medium text-foreground">
                                    Channel Name (Optional)
                                </Label>
                                <Input
                                    id="channel-name"
                                    placeholder="#deal-room or Deal War Room"
                                    value={config.channelName || ''}
                                    onChange={(e) => setConfig({ ...config, channelName: e.target.value })}
                                    className="text-xs bg-background/50"
                                />
                            </div>

                            <div className="flex items-end pb-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTestConnection}
                                    disabled={isTesting || !config.webhookUrl.trim()}
                                    className="w-full text-xs h-9 gap-2 border-primary/30 hover:bg-primary/5 text-primary"
                                >
                                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                                    Send Test Handshake
                                </Button>
                            </div>
                        </div>

                        {testResult && (
                            <div className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                <span>{testResult.message}</span>
                            </div>
                        )}
                    </div>

                    {/* Notification Triggers */}
                    <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-muted/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-primary" />
                                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Automated Notification Rules</h4>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.enabled}
                                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 accent-primary"
                                />
                                <span className="text-xs font-medium text-foreground">Enable Bot</span>
                            </label>
                        </div>

                        <div className="space-y-2 pt-1">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.notifyOnSynthesisVerdict}
                                    onChange={(e) => setConfig({ ...config, notifyOnSynthesisVerdict: e.target.checked })}
                                    className="mt-0.5 w-3.5 h-3.5 rounded border-border text-primary accent-primary"
                                />
                                <div>
                                    <p className="text-xs font-medium text-foreground">Synthesis Buy/Pass Verdict</p>
                                    <p className="text-[11px] text-muted-foreground">Alerts when multi-document synthesis reaches 🟢 BUY, 🟡 CAUTION, or 🔴 PASS.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.notifyOnCriticalRedFlags}
                                    onChange={(e) => setConfig({ ...config, notifyOnCriticalRedFlags: e.target.checked })}
                                    className="mt-0.5 w-3.5 h-3.5 rounded border-border text-primary accent-primary"
                                />
                                <div>
                                    <p className="text-xs font-medium text-foreground">Critical Red Flags & Revenue Discrepancies</p>
                                    <p className="text-[11px] text-muted-foreground">Alerts if tax-to-P&L variance exceeds 10%, or severe customer concentration is detected.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.notifyOnValuationBridgeChange}
                                    onChange={(e) => setConfig({ ...config, notifyOnValuationBridgeChange: e.target.checked })}
                                    className="mt-0.5 w-3.5 h-3.5 rounded border-border text-primary accent-primary"
                                />
                                <div>
                                    <p className="text-xs font-medium text-foreground">Valuation Bridge Haircuts & Escrow Sizing</p>
                                    <p className="text-[11px] text-muted-foreground">Alerts when unverified add-backs or legal risks adjust the recommended purchase price.</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {broadcastResult && (
                        <div className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${broadcastResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                            {broadcastResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                            <span>{broadcastResult.message}</span>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="border-t border-border/50 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={handleBroadcastNow}
                        disabled={isBroadcasting || !config.webhookUrl.trim()}
                        className="w-full sm:w-auto text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                        {isBroadcasting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Broadcast Current Deal Summary Now
                    </Button>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="text-xs"
                        >
                            Close
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSave}
                            className="text-xs gap-1.5"
                        >
                            {isSaved ? <Check className="w-3.5 h-3.5" /> : null}
                            {isSaved ? 'Saved' : 'Save Settings'}
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
