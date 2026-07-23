import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

const chartColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))']

export type ChartDatum = Record<string, string | number>

function compactMoney(value: number) {
    const absolute = Math.abs(value)
    if (absolute >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
    if (absolute >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (absolute >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
    if (!active || !payload?.length) return null
    return <div className="rounded-md border border-border bg-background px-3 py-2 text-xs shadow-sm"><p className="font-medium text-foreground">{label}</p>{payload.map((item) => <p key={item.name} className="mt-1 text-muted-foreground"><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: item.color }} />{item.name}: {typeof item.value === 'number' ? compactMoney(item.value) : '—'}</p>)}</div>
}

export function MoneyBarChart({ title, description, data, dataKey = 'value' }: { title: string; description: string; data: ChartDatum[]; dataKey?: string }) {
    if (!data.length) return null
    return <div className="rounded-xl border border-border bg-muted/20 p-4"><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><div className="mt-4 h-64" role="img" aria-label={`${title}. ${description}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><YAxis tickFormatter={compactMoney} tickLine={false} axisLine={false} width={64} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} /><Bar dataKey={dataKey} name="Value" radius={[5, 5, 0, 0]}>{data.map((entry, index) => <Cell key={String(entry.label)} fill={chartColors[index % chartColors.length]} />)}</Bar></BarChart></ResponsiveContainer></div></div>
}

export function CashFlowChart({ title, data }: { title: string; data: ChartDatum[] }) {
    if (!data.length) return null
    return <div className="rounded-xl border border-border bg-muted/20 p-4"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted-foreground">Annual cash flow, including the terminal sale in the final year.</p><div className="mt-4 h-64" role="img" aria-label={`${title}: annual cash flow by year`}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><YAxis tickFormatter={compactMoney} tickLine={false} axisLine={false} width={64} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} /><Bar dataKey="cashFlow" name="Cash flow" radius={[5, 5, 0, 0]}>{data.map((entry) => <Cell key={String(entry.label)} fill={Number(entry.cashFlow) < 0 ? 'hsl(var(--destructive))' : 'hsl(var(--chart-1))'} />)}</Bar></BarChart></ResponsiveContainer></div></div>
}

export function GrowthLineChart({ data }: { data: ChartDatum[] }) {
    if (!data.length) return null
    return <div className="rounded-xl border border-border bg-muted/20 p-4"><p className="text-sm font-semibold">Revenue path by case</p><p className="mt-1 text-xs text-muted-foreground">Projected revenue from the documented starting point and saved scenario assumptions.</p><div className="mt-4 h-64" role="img" aria-label="Projected bear, base, and bull revenue by year"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><YAxis tickFormatter={compactMoney} tickLine={false} axisLine={false} width={64} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ fontSize: 12 }} /><Line type="monotone" dataKey="Bear" stroke={chartColors[2]} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="Base" stroke={chartColors[0]} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="Bull" stroke={chartColors[1]} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></div>
}
