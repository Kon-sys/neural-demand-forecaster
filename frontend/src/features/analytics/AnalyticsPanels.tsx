import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ModelQuality, Seasonality } from '@/entities/analytics/types'
import { ErrorState, Skeleton } from '@/components/feedback/States'
import { SectionTitle } from '@/components/ui/primitives'
import { date, number, shortDate } from '@/shared/lib/format'
import { useAnalytics } from './useAnalytics'

const history = 'var(--color-chart-history)'
const forecast = 'var(--color-chart-forecast)'
const names: Record<string, string> = { moving_average: 'Moving Average (7)', lstm: 'LSTM (14)' }

export function SeasonalityPanel({ productId }: { productId: string }) {
  const { data, loading, error, reload } = useAnalytics<Seasonality>(`products/${productId}/seasonality`)
  if (loading) return <Skeleton />
  if (error) return <ErrorState title="Сезонность недоступна" description={error} retry={reload} />
  if (!data) return null
  const { coverage } = data
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const buckets = data.weekdays.map(b => ({ ...b, label: weekdays[Number(b.label) - 1] }))
  return <section className="result-chart-section">
    <SectionTitle>Структура фактического спроса</SectionTitle>
    <p className="muted">Продажи выбранного товара за последние 366 календарных дней его истории. Средние рассчитаны только по зарегистрированным наблюдениям; пропуски не заменяются нулями.</p>
    <div className="result-context"><div><span>Доступный период</span><strong>{coverage.minDate ? `${date(coverage.minDate)} — ${date(coverage.maxDate!)}` : 'Нет продаж'}</strong></div><div><span>Наблюдения / календарные дни</span><strong>{coverage.observationCount} / {coverage.calendarDays}</strong></div><div><span>Полных недель / месяцев с данными</span><strong>{coverage.weeks} / {coverage.months}</strong></div></div>
    {!data.weekdayAvailable ? <div className="plain-note">Недостаточно данных для недельного профиля: нужны минимум четыре наблюдения каждого дня недели и период от 28 дней.</div> : <>
      <h3>Средний спрос по дням недели</h3>
      <div className="analytics-chart" aria-label="Средние продажи по дням недели"><ResponsiveContainer width="100%" height="100%"><BarChart data={buckets} accessibilityLayer><CartesianGrid stroke="var(--color-chart-grid)" vertical={false} /><XAxis dataKey="label" /><YAxis /><Tooltip /><Bar dataKey="average" name="Средние продажи, шт." fill={history} /></BarChart></ResponsiveContainer></div>
      <BucketTable buckets={buckets} />
    </>}
    {data.monthlyAvailable ? <><h3>Средний спрос по календарным месяцам</h3><p className="muted">Сравнение доступных месяцев не доказывает повторяющуюся годовую сезонность. Неполные месяцы отмечены числом наблюдений.</p><div className="analytics-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.months} accessibilityLayer><CartesianGrid stroke="var(--color-chart-grid)" vertical={false} /><XAxis dataKey="label" /><YAxis /><Tooltip /><Bar dataKey="average" name="Средние продажи, шт." fill={forecast} /></BarChart></ResponsiveContainer></div><BucketTable buckets={data.months} /></> : <p className="muted">Месячное сравнение появится при наличии трёх месяцев с минимум 20 наблюдениями в каждом.</p>}
  </section>
}

function BucketTable({ buckets }: { buckets: Seasonality['months'] }) {
  return <details className="chart-data"><summary>Средние и число наблюдений</summary><div className="table-wrap"><table><thead><tr><th>Период</th><th>Наблюдений</th><th>Среднее, шт.</th></tr></thead><tbody>{buckets.map(b => <tr key={b.label}><td>{b.label}</td><td>{b.observations}</td><td>{b.observations ? number(b.average, 2) : 'Нет данных'}</td></tr>)}</tbody></table></div></details>
}

export function ModelQualityPanel() {
  const { data, loading, error, reload } = useAnalytics<ModelQuality>('model-quality')
  if (loading) return <Skeleton />
  if (error) return <ErrorState title="Оценка модели недоступна" description="Не удалось получить сохранённую TEST-оценку. Сохранённый прогноз доступен во вкладке «Обзор»." retry={reload} />
  if (!data) return null
  return <section className="result-chart-section">
    <SectionTitle>Оценка на независимой TEST-выборке</SectionTitle>
    <p className="muted">{data.source} · {date(data.testStart)} — {date(data.testEnd)} · {number(data.observations)} наблюдений · {data.seriesCount} экспериментальных рядов.</p>
    <div className="plain-note">Замороженные модели, протокол {data.protocol}. Это эксперимент FreshRetail, а не оценка будущего прогноза выбранного товара. На графике — средние по всем TEST-рядам.</div>
    <h3>Фактический спрос и предсказание LSTM</h3>
    <div className="analytics-chart" aria-label="TEST: фактические значения и предсказания LSTM"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.daily} accessibilityLayer><CartesianGrid stroke="var(--color-chart-grid)" vertical={false} /><XAxis dataKey="date" tickFormatter={shortDate} /><YAxis /><Tooltip labelFormatter={label => date(String(label))} /><Legend /><Line dataKey="actual" name="Факт" stroke={history} isAnimationActive={false} /><Line dataKey="lstm" name="LSTM" stroke={forecast} strokeDasharray="6 4" isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
    <h3>Moving Average и LSTM</h3>
    <div className="analytics-metric-charts">{(['mae', 'rmse', 'mape'] as const).map(metric => <div key={metric}><h4>{metric.toUpperCase()}{metric === 'mape' ? ', %' : ', шт.'}</h4><div className="analytics-small-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.metrics.map(m => ({ name: names[m.model] ?? m.model, value: m[metric] }))} accessibilityLayer><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis width={45} /><Tooltip /><Bar dataKey="value" name={metric.toUpperCase()} fill={forecast} /></BarChart></ResponsiveContainer></div></div>)}</div>
    <div className="table-wrap"><table><caption className="sr-only">Метрики frozen TEST</caption><thead><tr><th>Модель</th><th>MAE</th><th>RMSE</th><th>MAPE, %</th></tr></thead><tbody>{data.metrics.map(m => <tr key={m.model}><td>{names[m.model] ?? m.model}</td><td>{number(m.mae, 4)}</td><td>{number(m.rmse, 4)}</td><td>{m.mape == null ? 'Недоступно' : number(m.mape, 4)}</td></tr>)}</tbody></table></div>
    <p className="muted">MAPE исключает нулевой фактический спрос: {data.metrics.map(m => `${names[m.model]} — ${m.mapeObservations} наблюдений`).join('; ')}.</p>
    <h3>Средняя абсолютная ошибка по дням TEST</h3>
    <div className="analytics-chart" aria-label="Средняя абсолютная ошибка Moving Average и LSTM"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.daily} accessibilityLayer><CartesianGrid stroke="var(--color-chart-grid)" vertical={false} /><XAxis dataKey="date" tickFormatter={shortDate} /><YAxis /><Tooltip /><Legend /><Line dataKey="movingAverageMae" name="Moving Average MAE" stroke={history} isAnimationActive={false} /><Line dataKey="lstmMae" name="LSTM MAE" stroke={forecast} strokeDasharray="6 4" isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
    <details className="chart-data"><summary>TEST-значения и ошибки в таблице</summary><div className="table-wrap"><table><thead><tr><th>Дата</th><th>Факт</th><th>MA</th><th>LSTM</th><th>MA MAE</th><th>LSTM MAE</th></tr></thead><tbody>{data.daily.map(p => <tr key={p.date}><td>{date(p.date)}</td>{[p.actual, p.movingAverage, p.lstm, p.movingAverageMae, p.lstmMae].map((value, i) => <td key={i}>{number(value, 4)}</td>)}</tr>)}</tbody></table></div></details>
  </section>
}
