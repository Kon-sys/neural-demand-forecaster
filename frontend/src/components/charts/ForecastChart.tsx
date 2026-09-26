import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Point } from '@/entities/analytics/types'
import { date, number, shortDate } from '@/shared/lib/format'

export function ForecastChart({ history = [], forecast, compact = false }: { history?: Point[]; forecast: Point[]; compact?: boolean }) {
  const [selected, setSelected] = useState<number | null>(null)
  const data = [...history.map(p => ({ date: p.date, history: p.value, forecast: undefined as number | undefined })),
    ...forecast.map(p => ({ date: p.date, forecast: p.value, history: undefined as number | undefined }))]
  if (!data.length) return <p className="muted">Нет значений для графика.</p>
  const index = Math.min(selected ?? data.length - 1, data.length - 1)
  const point = data[index]
  return <div className={`forecast-chart ${compact ? 'compact' : ''}`}>
    <div className="chart-topline"><span>Количество, шт.</span><div className="chart-legend"><span><i className="legend-history" />История продаж</span><span><i className="legend-forecast" />Прогноз · пунктир</span></div></div>
    <div className="chart-canvas" role="group" aria-label="История продаж и прогноз; пунктир обозначает будущий период">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}><LineChart data={data} accessibilityLayer margin={{ top: 28, right: 20, bottom: 8, left: -16 }}>
        <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={48} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 'auto']} width={56} tickLine={false} axisLine={false} />
        <Tooltip labelFormatter={label => date(String(label))} formatter={(value, name) => [`${number(Number(value), 2)} шт.`, name]} />
        {forecast[0] && <ReferenceLine x={forecast[0].date} stroke="var(--color-chart-boundary)" strokeDasharray="3 4" label={{ value: compact ? '' : 'Начало прогноза', position: 'insideTopRight', fontSize: 12 }} />}
        <Line dataKey="history" name="Продажи" stroke="var(--color-chart-history)" strokeWidth={2} dot={history.length === 1} isAnimationActive={false} />
        <Line dataKey="forecast" name="Прогноз" stroke="var(--color-chart-forecast)" strokeWidth={2.5} strokeDasharray="6 4" dot={forecast.length === 1} isAnimationActive={false} />
      </LineChart></ResponsiveContainer>
    </div>
    <div className="chart-readout"><button className="icon-btn" aria-label="Предыдущая дата" disabled={index === 0} onClick={() => setSelected(index - 1)}><ChevronLeft size={16} /></button><span aria-live="polite">{date(point.date)} · {point.forecast == null ? 'Продажи' : 'Прогноз'} <strong>{number(point.forecast ?? point.history ?? 0, 2)} шт.</strong></span><button className="icon-btn" aria-label="Следующая дата" disabled={index === data.length - 1} onClick={() => setSelected(index + 1)}><ChevronRight size={16} /></button></div>
    {!compact && <details className="chart-data"><summary>Данные графика в доступном виде</summary><div className="accessible-data"><table><caption className="sr-only">Исторические продажи и прогноз</caption><thead><tr><th>Дата</th><th>Тип</th><th className="numeric">Количество, шт.</th></tr></thead><tbody>{data.map(p => <tr key={p.date}><td>{date(p.date)}</td><td>{p.forecast == null ? 'Продажи' : 'Прогноз'}</td><td className="numeric">{number(p.forecast ?? p.history ?? 0, 2)}</td></tr>)}</tbody></table></div></details>}
  </div>
}
