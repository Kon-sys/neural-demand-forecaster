import { ArrowRight, CalendarDays, Database, Plus, Upload } from 'lucide-react'
import { useAuth } from '@/features/auth/model/useAuth'
import { useForecastHistory } from '@/features/forecasts/model/useForecastHistory'
import { useForecast } from '@/features/forecasts/model/useForecast'
import { useProducts } from '@/features/products/model/useProducts'
import { useSales } from '@/features/sales/model/useSales'
import { useAnalytics } from '@/features/analytics/useAnalytics'
import type { Overview } from '@/entities/analytics/types'
import { ForecastList } from './ForecastList'
import { ForecastChart } from '@/components/charts/ForecastChart'
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback/States'
import { DepthSurface } from '@/components/ui/DepthSurface'
import { Badge, LinkButton, OpenLink, PageHeader, SectionTitle } from '@/components/ui/primitives'
import { date, days, number } from '@/shared/lib/format'

export function Dashboard() {
  const { user } = useAuth()
  const { data, forecasts, loading, error } = useForecastHistory({ page: 0, size: 4 })
  const products = useProducts()
  const sales = useSales({ page: 0, size: 1 })
  const latest = forecasts[0]
  return <>
    <PageHeader eyebrow="ОБЗОР РАБОЧЕГО ПРОСТРАНСТВА" title="Главная" description="Ваши данные. Следующий шаг — прогноз спроса." actions={<LinkButton to="/forecasts/new"><Plus size={17} />Создать прогноз</LinkButton>} />
    <div className="dashboard-composition">
      {loading ? <Skeleton /> : error ? <ErrorState description={error} /> : latest ? <LatestForecast id={latest.id} /> : <EmptyState title="Прогнозов пока нет" description="Создайте первый прогноз на основе истории продаж." action={<LinkButton to="/forecasts/new">Создать прогноз</LinkButton>} />}
      <aside className="availability">
        <div className="section-heading"><span className="eyebrow">ДОСТУПНОСТЬ ДАННЫХ</span><Database size={18} /></div>
        {products.loading || sales.loading ? <p role="status">Загрузка сводки…</p> : products.error || sales.error ? <ErrorState description="Не удалось загрузить сводку данных." retry={() => { products.reload(); sales.reload() }} /> : <>
          <div className="availability-count"><strong>{number(products.products.length)}</strong><span>товаров в каталоге</span></div>
          <div className="availability-detail"><span>Записи о продажах</span><strong>{number(sales.data.totalElements)}<small> наблюдений</small></strong></div>
          <div className="availability-detail"><span>Последняя дата продаж</span><strong>{sales.data.items[0] ? date(sales.data.items[0].date) : 'Нет продаж'}</strong></div>
          <div className="availability-note"><span className="status-dot" />{sales.data.totalElements ? 'История продаж загружена' : 'Загрузите историю продаж'}</div>
        </>}
        <LinkButton variant="ghost" to="/sales">Посмотреть продажи<ArrowRight size={16} /></LinkButton>
        {user?.role === 'ADMIN' && <LinkButton variant="secondary" to="/sales/import"><Upload size={16} />Импорт CSV</LinkButton>}
      </aside>
    </div>
    {!loading && !error && forecasts.length > 0 && <section className="recent-section"><SectionTitle aside={<OpenLink to="/forecasts" label="Вся история" />}>Недавние прогнозы <span className="count-label">{data?.totalElements ?? 0}</span></SectionTitle><ForecastList forecasts={forecasts} compact /></section>}
  </>
}

function LatestForecast({ id }: { id: string }) {
  const { forecast, loading, error } = useForecast(id)
  const overview = useAnalytics<Overview>(`forecasts/${id}?historyDays=60`)
  if (loading) return <Skeleton />
  if (error) return <ErrorState title="Последний прогноз недоступен" description={error.message} />
  if (!forecast) return null
  return <DepthSurface className="latest-forecast">
    <div className="section-heading"><span className="eyebrow">ПОСЛЕДНИЙ ПРОГНОЗ</span><Badge tone={forecast.status === 'COMPLETED' ? 'success' : 'warning'}>{forecast.status === 'COMPLETED' ? 'Завершён' : forecast.status}</Badge></div>
    <div className="latest-title"><h2>{forecast.product.name}</h2><span className="mono muted">{forecast.product.sku}</span></div>
    <div className="inline-meta"><span><CalendarDays size={14} />{date(forecast.createdAt)}</span><span>Горизонт · {days(forecast.forecastHorizon)}</span></div>
    {overview.loading && <p role="status">Загрузка истории продаж…</p>}
    {overview.error && <p className="muted">История продаж временно недоступна.</p>}
    <ForecastChart forecast={forecast.values} history={overview.data?.history} compact />
    <div className="latest-bottom"><span className="muted">История продаж и ожидаемый спрос</span><OpenLink to={`/forecasts/${id}`} label="Открыть прогноз" /></div>
  </DepthSurface>
}
