import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { useForecast } from '@/features/forecasts/model/useForecast'
import { Badge, LinkButton, PageHeader, SectionTitle } from '@/components/ui/primitives'
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback/States'
import { ForecastChart } from '@/components/charts/ForecastChart'
import { ModelQualityPanel, SeasonalityPanel } from '@/features/analytics/AnalyticsPanels'
import { useAnalytics } from '@/features/analytics/useAnalytics'
import { forecastKpis } from '@/features/analytics/calculations'
import type { Overview } from '@/entities/analytics/types'
import type { Forecast } from '@/entities/forecast/model/types'
import { date, days, number } from '@/shared/lib/format'

const tabs = ['Обзор', 'Сезонность', 'Качество модели']
export function ForecastResultPage() {
  const { id } = useParams()
  const { forecast, loading, error } = useForecast(id)
  const [tab, setTab] = useState(0)
  if (loading) return <Skeleton />
  if (error) return <ErrorState description={error.message} />
  if (!forecast) return <EmptyState title="Прогноз не найден" description="Откройте сохранённый результат из истории." action={<LinkButton to="/forecasts">К истории</LinkButton>} />
  return <div className="forecast-result">
    <div className="result-back"><LinkButton variant="ghost" to="/forecasts"><ArrowLeft size={15} />К истории</LinkButton><Badge tone={forecast.status === 'COMPLETED' ? 'success' : forecast.status === 'FAILED' ? 'danger' : 'warning'}>{({ COMPLETED: 'Завершён', FAILED: 'Ошибка', PENDING: 'Ожидание', PROCESSING: 'Обработка' })[forecast.status]}</Badge></div>
    <PageHeader eyebrow={`РЕЗУЛЬТАТ ПРОГНОЗА / ${forecast.product.sku}`} title={forecast.product.name} actions={<LinkButton variant="secondary" to="/forecasts/new"><Plus size={17} />Новый прогноз</LinkButton>} />
    <div className="result-context"><div><span>Горизонт</span><strong>{days(forecast.forecastHorizon)}</strong></div><div><span>Период прогноза</span><strong>{forecast.values.length ? `${date(forecast.values[0].date)} — ${date(forecast.values.at(-1)!.date)}` : 'Нет значений'}</strong></div><div><span>Создан</span><strong>{date(forecast.createdAt)}</strong></div><div><span>Модель</span><strong className="mono">{forecast.modelVersion}</strong></div></div>
    <div className="analytics-tabs" role="tablist" aria-label="Аналитика прогноза">{tabs.map((label, index) => <button key={label} id={`analytics-tab-${index}`} className="btn btn-secondary" role="tab" aria-selected={tab === index} aria-controls="analytics-panel" tabIndex={tab === index ? 0 : -1} onClick={() => setTab(index)} onKeyDown={event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
      if (next !== null) { event.preventDefault(); setTab(next); document.getElementById(`analytics-tab-${next}`)?.focus() }
    }}>{label}</button>)}</div>
    <div id="analytics-panel" role="tabpanel" aria-labelledby={`analytics-tab-${tab}`}>
      {tab === 0 ? <OverviewPanel key={forecast.id} forecast={forecast} /> : tab === 1 ? <SeasonalityPanel productId={forecast.product.id} /> : <ModelQualityPanel />}
    </div>
  </div>
}

function OverviewPanel({ forecast }: { forecast: Forecast }) {
  const [historyDays, setHistoryDays] = useState(60)
  const { data, loading, error, reload } = useAnalytics<Overview>(`forecasts/${forecast.id}?historyDays=${historyDays}`)
  const kpis = forecastKpis(forecast.values, data?.previousTotal ?? null)
  const comparison = loading ? 'Загрузка истории…' : error ? 'История недоступна' : data?.previousTotal === 0 ? 'Предыдущий спрос равен нулю; процент не определён' : 'Недостаточно данных для сравнения'
  return <>
    {kpis && <div className="analytics-kpis"><div><span>Прогноз за период</span><strong>{number(kpis.total, 2)}</strong><small>шт. за {days(forecast.forecastHorizon)}</small></div><div><span>Средний спрос</span><strong>{number(kpis.average, 2)}</strong><small>шт. / день</small></div><div><span>Пиковый спрос</span><strong>{number(kpis.peak.value, 2)}</strong><small>{date(kpis.peak.date)}</small></div><div><span>К предыдущему периоду</span><strong>{kpis.change === null ? '—' : `${kpis.change > 0 ? '+' : ''}${number(kpis.change, 1)}%`}</strong><small>{kpis.change === null ? comparison : `Сравнение с предыдущими ${forecast.forecastHorizon} календарными днями`}</small></div></div>}
    <section className="result-chart-section">
      <SectionTitle aside={<span className="muted">Ежедневный спрос</span>}>От истории — к следующему периоду</SectionTitle>
      <div className="analytics-controls"><label htmlFor="history-days">История перед прогнозом</label><select id="history-days" value={historyDays} onChange={event => setHistoryDays(Number(event.target.value))}>{[30, 60, 90].map(n => <option key={n} value={n}>{n} дней</option>)}</select></div>
      {loading && <p role="status">Загружаем историю продаж…</p>}
      {error && <ErrorState title="История продаж недоступна" description="Прогноз сохранён. Повторите загрузку исторических данных." retry={reload} />}
      {data && <p className="muted">{data.history.length ? `Наблюдения: ${date(data.history[0].date)} — ${date(data.history.at(-1)!.date)} · ${data.history.length} записей.` : 'В выбранном периоде нет исторических продаж.'} Пропущенные даты не считаются фактическими нулями. История отражает текущее состояние продаж в базе.</p>}
      <ForecastChart history={data?.history} forecast={forecast.values} />
    </section>
    {kpis && <section className="analytics-insights"><SectionTitle>Ключевые выводы</SectionTitle>
      {kpis.change !== null && <p>{kpis.change > 0 ? '↑' : kpis.change < 0 ? '↓' : '•'} Прогнозируемый спрос {kpis.change >= 0 ? 'выше' : 'ниже'} предыдущего периода на {number(Math.abs(kpis.change), 1)}%.</p>}
      <p>• Максимальный спрос ожидается {date(kpis.peak.date)} — {number(kpis.peak.value, 2)} шт.</p><p>• Минимальный спрос ожидается {date(kpis.minimum.date)} — {number(kpis.minimum.value, 2)} шт.</p><p>• Средний прогнозируемый спрос — {number(kpis.average, 2)} шт. в день.</p>
    </section>}
    <section className="forecast-values"><SectionTitle aside={<span className="muted">{forecast.values.length} значений</span>}>Прогноз по дням</SectionTitle><div className="table-wrap"><table><caption className="sr-only">Сохранённые прогнозные значения</caption><thead><tr><th>Дата</th><th>Товар</th><th className="numeric">Прогноз, шт.</th></tr></thead><tbody>{forecast.values.map(v => <tr key={v.date}><td>{date(v.date)}</td><td>{forecast.product.name}</td><td className="numeric forecast-number">{number(v.value, 2)}</td></tr>)}</tbody></table></div></section>
  </>
}
