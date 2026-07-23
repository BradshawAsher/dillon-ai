import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ClipboardList, Plus, Trash2 } from 'lucide-react'

import { useGetProjectActionTracker, useSaveProjectActionTracker } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Input } from '../lib/shadcn/input'
import { Textarea } from '../lib/shadcn/textarea'

type Question = { id: string; question: string; owner: string; priority: 'High' | 'Medium' | 'Low'; status: 'Open' | 'In progress' | 'Answered'; response: string; thesisImpact: string }
function keyFor(projectId: string) { return `mergeworks.managementQuestions.${projectId}` }
function createQuestion(question = ''): Question { return { id: crypto.randomUUID(), question, owner: '', priority: 'Medium', status: 'Open', response: '', thesisImpact: '' } }
function parseQuestions(value: string | undefined) { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed as Question[] : [] } catch { return [] as Question[] } }

export default function ManagementQuestionTracker({ projectId, suggestedQuestions }: { projectId: string; suggestedQuestions: string[] }) {
    const [questions, setQuestions] = useState<Question[]>([])
    const [sharedReady, setSharedReady] = useState(false)
    const [loadedProjectId, setLoadedProjectId] = useState('')
    const lastProject = useRef('')
    const { data: sharedTracker, trigger: loadSharedTracker } = useGetProjectActionTracker()
    const { trigger: saveSharedTracker } = useSaveProjectActionTracker()

    useEffect(() => {
        setSharedReady(false)
        setLoadedProjectId('')
        lastProject.current = projectId
        void loadSharedTracker({ projectId }).result.then(() => setLoadedProjectId(projectId))
    }, [projectId, loadSharedTracker])
    useEffect(() => {
        if (lastProject.current !== projectId || loadedProjectId !== projectId) return
        const shared = sharedTracker?.projectId === projectId ? parseQuestions(sharedTracker.questionsJson) : []
        let local: Question[] = []
        try { local = parseQuestions(window.localStorage.getItem(keyFor(projectId)) || '[]') } catch {}
        const existing = new Set([...shared, ...local].map((item) => item.question.trim().toLowerCase()))
        setQuestions([...shared, ...local.filter((item) => !shared.some((sharedItem) => sharedItem.id === item.id)), ...suggestedQuestions.filter((question) => !existing.has(question.trim().toLowerCase())).map(createQuestion)])
        setSharedReady(true)
    }, [loadedProjectId, projectId, sharedTracker, suggestedQuestions])
    useEffect(() => { try { window.localStorage.setItem(keyFor(projectId), JSON.stringify(questions)) } catch {} }, [projectId, questions])
    useEffect(() => {
        if (!sharedReady || !projectId) return
        const timer = window.setTimeout(() => { void saveSharedTracker({ projectId, checklistJson: sharedTracker?.checklistJson || '{}', questionsJson: JSON.stringify(questions) }).result }, 500)
        return () => window.clearTimeout(timer)
    }, [projectId, questions, saveSharedTracker, sharedReady, sharedTracker?.checklistJson])

    const update = (id: string, changes: Partial<Question>) => setQuestions((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item))
    const answered = questions.filter((item) => item.status === 'Answered').length
    return <Card className="overflow-hidden"><CardHeader className="border-b border-border bg-card/80"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Management-question tracker</CardTitle></div><CardDescription className="mt-1">Turn synthesis questions into owned follow-up work. Shared per project when the tracker API is available.</CardDescription></div><Badge variant={answered === questions.length && questions.length > 0 ? 'success' : 'outline'}>{answered}/{questions.length} answered</Badge></div></CardHeader><CardContent className="space-y-3 p-4"><div className="flex justify-end"><Button type="button" size="sm" variant="outline" onClick={() => setQuestions((current) => [...current, createQuestion()])}><Plus className="h-4 w-4" />Add question</Button></div>{questions.length ? questions.map((item) => <div key={item.id} className="space-y-3 rounded-lg border border-border bg-muted/20 p-3"><div className="flex gap-2"><Textarea value={item.question} onChange={(event) => update(item.id, { question: event.target.value })} placeholder="Question for management" className="min-h-[64px]" /><Button type="button" size="icon" variant="ghost" aria-label="Remove question" onClick={() => setQuestions((current) => current.filter((question) => question.id !== item.id))}><Trash2 className="h-4 w-4" /></Button></div><div className="grid gap-2 sm:grid-cols-3"><Input value={item.owner} onChange={(event) => update(item.id, { owner: event.target.value })} placeholder="Owner" /><select value={item.priority} onChange={(event) => update(item.id, { priority: event.target.value as Question['priority'] })} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option>High</option><option>Medium</option><option>Low</option></select><select value={item.status} onChange={(event) => update(item.id, { status: event.target.value as Question['status'] })} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option>Open</option><option>In progress</option><option>Answered</option></select></div><Textarea value={item.response} onChange={(event) => update(item.id, { response: event.target.value })} placeholder="Management response or requested evidence" /><Input value={item.thesisImpact} onChange={(event) => update(item.id, { thesisImpact: event.target.value })} placeholder="Resulting impact on the deal thesis" />{item.status === 'Answered' ? <p className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" />Answered — review the stated thesis impact.</p> : null}</div>) : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No questions yet. Add one or wait for project synthesis to surface management follow-ups.</p>}</CardContent></Card>
}
