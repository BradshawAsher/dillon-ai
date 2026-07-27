import { useState, useEffect, useCallback } from 'react'
import { Bell, BellRing, Hash, Mail, MessageSquare, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'

type AlertTrigger = 'red-flag' | 'synthesis-complete' | 'document-failed' | 'high-risk' | 'valuation-gap' | 'custom'
type AlertChannel = 'email' | 'slack' | 'in-app'
type AlertFrequency = 'immediate' | 'daily-digest' | 'weekly-digest'

type AlertRule = {
    id: string
    name: string
    trigger: AlertTrigger
    channel: AlertChannel
    frequency: AlertFrequency
    severity: 'critical' | 'high' | 'medium' | 'all'
    enabled: boolean
    destination: string
    createdAt: string
}

const TRIGGER_LABELS: Record<AlertTrigger, { label: string; description: string; icon: React.ReactNode }> = {
    'red-flag': { label: 'Red Flag Detected', description: 'When synthesis identifies a new red flag', icon: <span className="text-red-500">🚩</span> },
    'synthesis-complete': { label: 'Synthesis Complete', description: 'When project synthesis finishes', icon: <span>✅</span> },
    'document-failed': { label: 'Document Failed', description: 'When a document processing fails', icon: <span className="text-amber-500">⚠️</span> },
    'high-risk': { label: 'High Risk Signal', description: 'When risk level reaches HIGH or CRITICAL', icon: <span className="text-red-600">🔴</span> },
    'valuation-gap': { label: 'Valuation Gap Alert', description: 'When asking price exceeds fair value by >20%', icon: <span>📊</span> },
    'custom': { label: 'Custom Condition', description: 'Define your own trigger criteria', icon: <span>⚙️</span> },
}

const CHANNEL_OPTIONS: { value: AlertChannel; label: string; icon: React.ReactNode }[] = [
    { value: 'email', label: 'Email', icon: <Mail className="h-3.5 w-3.5" /> },
    { value: 'slack', label: 'Slack', icon: <Hash className="h-3.5 w-3.5" /> },
    { value: 'in-app', label: 'In-App', icon: <BellRing className="h-3.5 w-3.5" /> },
]

const FREQUENCY_OPTIONS: { value: AlertFrequency; label: string }[] = [
    { value: 'immediate', label: 'Immediate' },
    { value: 'daily-digest', label: 'Daily Digest' },
    { value: 'weekly-digest', label: 'Weekly Digest' },
]

const SEVERITY_OPTIONS: { value: AlertRule['severity']; label: string; color: string }[] = [
    { value: 'critical', label: 'Critical only', color: 'bg-red-500' },
    { value: 'high', label: 'High & above', color: 'bg-orange-500' },
    { value: 'medium', label: 'Medium & above', color: 'bg-amber-500' },
    { value: 'all', label: 'All severities', color: 'bg-blue-500' },
]

const STORAGE_KEY = 'mw-alert-rules'

function loadRules(): AlertRule[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function saveRules(rules: AlertRule[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}

const DEFAULT_RULES: AlertRule[] = [
    {
        id: 'default-redflag',
        name: 'Critical Red Flags',
        trigger: 'red-flag',
        channel: 'email',
        frequency: 'immediate',
        severity: 'critical',
        enabled: true,
        destination: '',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'default-synth',
        name: 'Synthesis Completed',
        trigger: 'synthesis-complete',
        channel: 'in-app',
        frequency: 'immediate',
        severity: 'all',
        enabled: true,
        destination: '',
        createdAt: new Date().toISOString(),
    },
]

export default function AlertRulesCard({ synthesis }: { synthesis?: ProjectSynthesisItem }) {
    const [rules, setRules] = useState<AlertRule[]>(() => {
        const stored = loadRules()
        return stored.length > 0 ? stored : DEFAULT_RULES
    })
    const [showAddForm, setShowAddForm] = useState(false)
    const [newTrigger, setNewTrigger] = useState<AlertTrigger>('red-flag')
    const [newChannel, setNewChannel] = useState<AlertChannel>('email')
    const [newFrequency, setNewFrequency] = useState<AlertFrequency>('immediate')
    const [newSeverity, setNewSeverity] = useState<AlertRule['severity']>('high')
    const [newDestination, setNewDestination] = useState('')
    const [newName, setNewName] = useState('')

    useEffect(() => {
        saveRules(rules)
    }, [rules])

    const toggleRule = useCallback((id: string) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
    }, [])

    const deleteRule = useCallback((id: string) => {
        setRules(prev => prev.filter(r => r.id !== id))
    }, [])

    const addRule = useCallback(() => {
        const rule: AlertRule = {
            id: `rule-${Date.now()}`,
            name: newName || TRIGGER_LABELS[newTrigger].label,
            trigger: newTrigger,
            channel: newChannel,
            frequency: newFrequency,
            severity: newSeverity,
            enabled: true,
            destination: newDestination,
            createdAt: new Date().toISOString(),
        }
        setRules(prev => [...prev, rule])
        setShowAddForm(false)
        setNewName('')
        setNewDestination('')
    }, [newName, newTrigger, newChannel, newFrequency, newSeverity, newDestination])

    const activeCount = rules.filter(r => r.enabled).length
    const redFlagCount = synthesis?.redFlags?.length ?? 0

    return (
        <Card className="overflow-hidden border-primary/20">
            <CardHeader className="border-b border-border bg-gradient-to-r from-amber-500/5 to-orange-500/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-amber-500/10 p-2">
                            <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Alert Rules</CardTitle>
                            <p className="mt-0.5 text-xs text-muted-foreground">Configure automated notifications for deal events</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                            <BellRing className="h-3 w-3" />
                            {activeCount} active
                        </Badge>
                        {redFlagCount > 0 && (
                            <Badge variant="destructive" className="gap-1">
                                {redFlagCount} flags
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {/* Existing rules */}
                <div className="divide-y divide-border">
                    {rules.map(rule => (
                        <div key={rule.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${rule.enabled ? '' : 'opacity-50'}`}>
                            <button
                                type="button"
                                onClick={() => toggleRule(rule.id)}
                                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                                title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                            >
                                {rule.enabled ? (
                                    <ToggleRight className="h-5 w-5 text-success" />
                                ) : (
                                    <ToggleLeft className="h-5 w-5" />
                                )}
                            </button>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">{TRIGGER_LABELS[rule.trigger].icon}</span>
                                    <span className="text-sm font-medium text-foreground">{rule.name}</span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <Badge variant="outline" className="text-[10px]">
                                        {CHANNEL_OPTIONS.find(c => c.value === rule.channel)?.icon}
                                        <span className="ml-1">{CHANNEL_OPTIONS.find(c => c.value === rule.channel)?.label}</span>
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px]">{FREQUENCY_OPTIONS.find(f => f.value === rule.frequency)?.label}</Badge>
                                    <Badge variant="outline" className="text-[10px]">
                                        <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${SEVERITY_OPTIONS.find(s => s.value === rule.severity)?.color}`} />
                                        {SEVERITY_OPTIONS.find(s => s.value === rule.severity)?.label}
                                    </Badge>
                                    {rule.destination && (
                                        <Badge variant="secondary" className="text-[10px] max-w-[160px] truncate">
                                            {rule.channel === 'slack' ? <MessageSquare className="mr-1 h-2.5 w-2.5" /> : <Mail className="mr-1 h-2.5 w-2.5" />}
                                            {rule.destination}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => deleteRule(rule.id)}
                                className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                title="Delete rule"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    {rules.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No alert rules configured. Add one below to get started.
                        </div>
                    )}
                </div>

                {/* Add new rule form */}
                {showAddForm ? (
                    <div className="border-t border-border bg-muted/20 p-4 space-y-3">
                        <p className="text-sm font-semibold text-foreground">New Alert Rule</p>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">Rule name</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder={TRIGGER_LABELS[newTrigger].label}
                                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Trigger</label>
                                <select
                                    value={newTrigger}
                                    onChange={e => setNewTrigger(e.target.value as AlertTrigger)}
                                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Channel</label>
                                <select
                                    value={newChannel}
                                    onChange={e => setNewChannel(e.target.value as AlertChannel)}
                                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    {CHANNEL_OPTIONS.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Severity</label>
                                <select
                                    value={newSeverity}
                                    onChange={e => setNewSeverity(e.target.value as AlertRule['severity'])}
                                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    {SEVERITY_OPTIONS.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Frequency</label>
                                <select
                                    value={newFrequency}
                                    onChange={e => setNewFrequency(e.target.value as AlertFrequency)}
                                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    {FREQUENCY_OPTIONS.map(f => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {newChannel !== 'in-app' && (
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">
                                    {newChannel === 'email' ? 'Email address' : 'Slack channel / webhook URL'}
                                </label>
                                <input
                                    type="text"
                                    value={newDestination}
                                    onChange={e => setNewDestination(e.target.value)}
                                    placeholder={newChannel === 'email' ? 'analyst@company.com' : '#deal-alerts or webhook URL'}
                                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground italic">
                            {TRIGGER_LABELS[newTrigger].description}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                            <Button type="button" size="sm" onClick={addRule}>
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                Add rule
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="border-t border-border px-4 py-3">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(true)} className="gap-1.5">
                            <Plus className="h-3.5 w-3.5" />
                            Add alert rule
                        </Button>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Alert delivery requires a webhook integration (coming soon). Rules are saved locally and ready to connect.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
