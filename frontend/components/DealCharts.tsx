import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    LabelList,
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
    return <div className="rounded-xl border border-border bg-muted/20 p-4"><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><div className="mt-4 h-64" role="img" aria-label={`${title}. ${description}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><YAxis tickFormatter={compactMoney} tickLine={false} axisLine={false} width={64} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} /><Bar dataKey={dataKey} name="Value" radius={[5, 5, 0, 0]}><LabelList dataKey="barLabel" position="top" fill="hsl(var(--warning))" fontSize={11} fontWeight={600} />{data.map((entry, index) => <Cell key={String(entry.label)} fill={chartColors[index % chartColors.length]} />)}</Bar></BarChart></ResponsiveContainer></div></div>
}

export function CashFlowChart({ title, data }: { title: string; data: ChartDatum[] }) {
    if (!data.length) return null
    return <div className="rounded-xl border border-border bg-muted/20 p-4"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted-foreground">Annual cash flow, including the terminal sale in the final year.</p><div className="mt-4 h-64" role="img" aria-label={`${title}: annual cash flow by year`}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><YAxis tickFormatter={compactMoney} tickLine={false} axisLine={false} width={64} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} /><Bar dataKey="cashFlow" name="Cash flow" radius={[5, 5, 0, 0]}>{data.map((entry) => <Cell key={String(entry.label)} fill={Number(entry.cashFlow) < 0 ? 'hsl(var(--destructive))' : 'hsl(var(--chart-1))'} />)}</Bar></BarChart></ResponsiveContainer></div></div>
}

export function CumulativeCashFlowChart({ data }: { data: ChartDatum[] }) {
    if (!data.length) return null
    return <div className="rounded-xl border border-border bg-muted/20 p-4"><p className="text-sm font-semibold">Payback timeline</p><p className="mt-1 text-xs text-muted-foreground">Cumulative cash returned after the acquisition cost. Crossing zero indicates payback; the final point includes terminal sale proceeds.</p><div className="mt-4 h-64" role="img" aria-label="Cumulative cash flow and payback timeline"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><YAxis tickFormatter={compactMoney} tickLine={false} axisLine={false} width={64} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip content={<ChartTooltip />} /><Line type="monotone" dataKey="cumulativeCashFlow" name="Cumulative cash flow" stroke={chartColors[0]} strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></div>
}

export function GrowthLineChart({ data }: { data: ChartDatum[] }) {
    if (!data.length) return null
    return <div className="rounded-xl border border-border bg-muted/20 p-4"><p className="text-sm font-semibold">Revenue path by case</p><p className="mt-1 text-xs text-muted-foreground">Projected revenue from the documented starting point and saved scenario assumptions. Bear is red/dashed, Base is blue/solid, and Bull is green/dotted.</p><div className="mt-4 h-64" role="img" aria-label="Projected bear red dashed, base blue solid, and bull green dotted revenue by year"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><YAxis tickFormatter={compactMoney} tickLine={false} axisLine={false} width={64} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ fontSize: 12 }} /><Line type="monotone" name="Bear (downside)" dataKey="Bear" stroke="#dc2626" strokeWidth={2.5} strokeDasharray="7 4" dot={false} activeDot={{ r: 4 }} /><Line type="monotone" name="Base (expected)" dataKey="Base" stroke="#2563eb" strokeWidth={3} dot={false} activeDot={{ r: 4 }} /><Line type="monotone" name="Bull (upside)" dataKey="Bull" stroke="#16a34a" strokeWidth={2.5} strokeDasharray="2 4" dot={false} activeDot={{ r: 4 }} /></LineChart></ResponsiveContainer></div></div>
}

export function EbitdaLineChart({ data }: { data: ChartDatum[] }) {
    if (!data.length) return null
    return <div className="rounded-xl border border-border bg-muted/20 p-4"><p className="text-sm font-semibold">EBITDA projection by case</p><p className="mt-1 text-xs text-muted-foreground">Projected EBITDA (revenue x margin) for each scenario. Bear is red/dashed, Base is blue/solid, and Bull is green/dotted.</p><div className="mt-4 h-64" role="img" aria-label="Projected bear red dashed, base blue solid, and bull green dotted EBITDA by year"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><YAxis tickFormatter={compactMoney} tickLine={false} axisLine={false} width={64} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ fontSize: 12 }} /><Line type="monotone" name="Bear (downside)" dataKey="Bear" stroke="#dc2626" strokeWidth={2.5} strokeDasharray="7 4" dot={false} activeDot={{ r: 4 }} /><Line type="monotone" name="Base (expected)" dataKey="Base" stroke="#2563eb" strokeWidth={3} dot={false} activeDot={{ r: 4 }} /><Line type="monotone" name="Bull (upside)" dataKey="Bull" stroke="#16a34a" strokeWidth={2.5} strokeDasharray="2 4" dot={false} activeDot={{ r: 4 }} /></LineChart></ResponsiveContainer></div></div>
}

export type WaterfallDatum = { label: string; value: number; type: 'positive' | 'negative' | 'total' }

export function WaterfallChart({ title, description, data }: { title: string; description: string; data: WaterfallDatum[] }) {
    if (!data.length) return null
    let running = 0
    const computedData = data.map((item) => {
        if (item.type === 'total') {
            const base = 0
            const result = { label: item.label, base, value: item.value, fill: chartColors[0] }
            running = item.value
            return result
        }
        const base = running
        running += item.value
        return {
            label: item.label,
            base: item.value >= 0 ? base : base + item.value,
            value: Math.abs(item.value),
            fill: item.value >= 0 ? '#16a34a' : '#dc2626',
        }
    })

    return <div className="rounded-xl border border-border bg-muted/20 p-4"><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><div className="mt-4 h-72" role="img" aria-label={`${title}. ${description}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={computedData} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval={0} angle={-20} textAnchor="end" height={50} /><YAxis tickFormatter={compactMoney} tickLine={false} axisLine={false} width={64} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} /><Bar dataKey="base" stackId="stack" fill="transparent" name="" /><Bar dataKey="value" stackId="stack" name="Value" radius={[4, 4, 0, 0]}><LabelList dataKey="value" position="top" formatter={(v: number) => compactMoney(v)} fontSize={11} fill="hsl(var(--foreground))" />{computedData.map((entry) => <Cell key={entry.label} fill={entry.fill} />)}</Bar></BarChart></ResponsiveContainer></div></div>
}
