import {
 ArrowRight,
 CalendarDays,
 ChartNoAxesCombined,
 Plus,
 Upload,
} from 'lucide-react'

import {
 useAuth,
} from '@/features/auth/model/useAuth'

import {
 useForecastHistory,
} from '@/features/forecasts/model/useForecastHistory'

import {
 ForecastList,
} from '@/features/forecasts/ForecastList'

import {
 EmptyState,
} from '@/components/feedback/States'

import {
 DepthSurface,
} from '@/components/ui/DepthSurface'

import {
 LinkButton,
 OpenLink,
 PageHeader,
 SectionTitle,
} from '@/components/ui/primitives'

import {
 date,
 days,
 number,
} from '@/shared/lib/format'

export function Dashboard() {
 const {
  user,
 } = useAuth()

 const {
  data,
  forecasts,
  loading,
  error,
 } = useForecastHistory({
  page:
      0,

  size:
      4,
 })

 const latest =
     forecasts[0]

 const totalForecasts =
     data?.totalElements
     ?? 0

 return (
     <>
      <PageHeader
          eyebrow="ОБЗОР РАБОЧЕГО ПРОСТРАНСТВА"
          title="Главная"
          description="Актуальные результаты прогнозирования на основе данных приложения."
          actions={
           <LinkButton to="/forecasts/new">
            <Plus size={17} />
            Создать прогноз
           </LinkButton>
          }
      />

      {loading && (
          <div
              className="plain-note"
              aria-busy="true"
          >
           Загружаем данные Dashboard…
          </div>
      )}

      {!loading && error && (
          <div
              className="inline-error"
              role="alert"
          >
           {error}
          </div>
      )}

      {!loading
          && !error
          && !latest
          && (
              <EmptyState
                  title="Прогнозов пока нет"
                  description="После построения первого прогноза здесь появится актуальная сводка."
                  action={
                   <LinkButton to="/forecasts/new">
                    Создать прогноз
                   </LinkButton>
                  }
              />
          )}

      {!loading
          && !error
          && latest
          && (
              <>
               <div className="dashboard-composition">
                <DepthSurface className="latest-forecast">
                 <div className="section-heading">
                                    <span className="eyebrow">
                                        ПОСЛЕДНИЙ ПРОГНОЗ
                                    </span>

                  <ChartNoAxesCombined
                      size={18}
                  />
                 </div>

                 <div className="latest-title">
                  <h2>
                   {
                    latest
                        .productName
                   }
                  </h2>

                  <span className="mono muted">
                                        {
                                         latest
                                             .productSku
                                        }
                                    </span>
                 </div>

                 <div className="inline-meta">
                                    <span>
                                        <CalendarDays
                                            size={14}
                                        />

                                     {
                                      date(
                                          latest
                                              .createdAt,
                                      )
                                     }
                                    </span>

                  <span>
                                        Горизонт · {
                   days(
                       latest
                           .forecastHorizon,
                   )
                  }
                                    </span>
                 </div>

                 <div className="availability-detail">
                                    <span>
                                        Модель
                                    </span>

                  <strong className="mono">
                   {
                    latest
                        .modelVersion
                   }
                  </strong>
                 </div>

                 <div className="availability-detail">
                                    <span>
                                        Статус
                                    </span>

                  <strong>
                   {
                    latest.status
                    === 'COMPLETED'
                        ? 'Готов'
                        : latest.status
                   }
                  </strong>
                 </div>

                 <div className="latest-bottom">
                                    <span className="muted">
                                        Сохранённый результат из базы данных
                                    </span>

                  <OpenLink
                      to={
                       `/forecasts/${latest.id}`
                      }
                      label="Открыть прогноз"
                  />
                 </div>
                </DepthSurface>

                <aside className="availability">
                 <div className="section-heading">
                                    <span className="eyebrow">
                                        СВОДКА
                                    </span>

                  <ChartNoAxesCombined
                      size={18}
                  />
                 </div>

                 <div className="availability-count">
                  <strong>
                   {
                    number(
                        totalForecasts,
                    )
                   }
                  </strong>

                  <span>
                                        прогнозов создано
                                    </span>
                 </div>

                 <div className="availability-detail">
                                    <span>
                                        Последний горизонт
                                    </span>

                  <strong>
                   {
                    days(
                        latest
                            .forecastHorizon,
                    )
                   }
                  </strong>
                 </div>

                 <div className="availability-detail">
                                    <span>
                                        Последнее обновление
                                    </span>

                  <strong>
                   {
                    date(
                        latest
                            .createdAt,
                    )
                   }
                  </strong>
                 </div>

                 <div className="availability-note">
                  <span className="status-dot" />
                  Данные получены из Backend API
                 </div>

                 <LinkButton
                     variant="ghost"
                     to="/forecasts"
                 >
                  Вся история
                  <ArrowRight size={16} />
                 </LinkButton>

                 {user?.role === 'ADMIN' && (
                     <LinkButton
                         variant="secondary"
                         to="/sales/import"
                     >
                      <Upload size={16} />
                      Импорт CSV
                     </LinkButton>
                 )}
                </aside>
               </div>

               <section className="recent-section">
                <SectionTitle
                    aside={
                     <OpenLink
                         to="/forecasts"
                         label="Вся история"
                     />
                    }
                >
                 Недавние прогнозы{' '}
                 <span className="count-label">
                                    {
                                     totalForecasts
                                    }
                                </span>
                </SectionTitle>

                <ForecastList
                    forecasts={
                     forecasts
                    }
                    compact
                />
               </section>
              </>
          )}
     </>
 )
}