import {
    useMemo,
} from 'react'

import {
    useParams,
} from 'react-router-dom'

import {
    ArrowLeft,
    BrainCircuit,
    CalendarDays,
    ChartNoAxesCombined,
    Package,
} from 'lucide-react'

import {
    useForecast,
} from '@/features/forecasts/model/useForecast'

import {
    Badge,
    LinkButton,
    PageHeader,
    SectionTitle,
} from '@/components/ui/primitives'

import {
    EmptyState,
    ErrorState,
    Skeleton,
} from '@/components/feedback/States'

import {
    date,
    days,
    number,
} from '@/shared/lib/format'

import type {
    ForecastValue,
} from '@/entities/forecast/model/types'

function ForecastLineChart({
                               values,
                           }: {
    values: ForecastValue[]
}) {
    const chart =
        useMemo(
            () => {
                if (!values.length) {
                    return null
                }

                const width = 760
                const height = 260
                const padding = 28

                const numericValues =
                    values.map(
                        item =>
                            item.value,
                    )

                const min =
                    Math.min(
                        ...numericValues,
                    )

                const max =
                    Math.max(
                        ...numericValues,
                    )

                const range =
                    max - min || 1

                const usableWidth =
                    width
                    - padding * 2

                const usableHeight =
                    height
                    - padding * 2

                const points =
                    values.map(
                        (
                            item,
                            index,
                        ) => {
                            const x =
                                padding
                                + (
                                    values.length ===
                                    1
                                        ? usableWidth
                                        / 2
                                        : (
                                            index
                                            / (
                                                values.length
                                                - 1
                                            )
                                        )
                                        * usableWidth
                                )

                            const y =
                                padding
                                + (
                                    1
                                    - (
                                        item.value
                                        - min
                                    )
                                    / range
                                )
                                * usableHeight

                            return {
                                x,
                                y,
                            }
                        },
                    )

                return {
                    width,
                    height,
                    min,
                    max,
                    points,
                    polyline:
                        points
                            .map(
                                point =>
                                    `${point.x},${point.y}`,
                            )
                            .join(' '),
                }
            },
            [
                values,
            ],
        )

    if (!chart) {
        return null
    }

    return (
        <div className="forecast-chart-card">
            <div className="forecast-chart-scale">
        <span>
          {number(
              chart.max,
              1,
          )}
        </span>

                <span>
          {number(
              chart.min,
              1,
          )}
        </span>
            </div>

            <svg
                viewBox={
                    `0 0 ${chart.width} ${chart.height}`
                }
                role="img"
                aria-label="График прогнозируемого спроса"
                preserveAspectRatio="none"
            >
                <line
                    x1="28"
                    y1="28"
                    x2="732"
                    y2="28"
                    stroke="currentColor"
                    strokeOpacity="0.08"
                />

                <line
                    x1="28"
                    y1="130"
                    x2="732"
                    y2="130"
                    stroke="currentColor"
                    strokeOpacity="0.08"
                />

                <line
                    x1="28"
                    y1="232"
                    x2="732"
                    y2="232"
                    stroke="currentColor"
                    strokeOpacity="0.08"
                />

                <polyline
                    points={
                        chart.polyline
                    }
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />

                {chart.points.map(
                    (
                        point,
                        index,
                    ) => (
                        <circle
                            key={
                                `${point.x}-${point.y}-${index}`
                            }
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill="#2563eb"
                            vectorEffect="non-scaling-stroke"
                        />
                    ),
                )}
            </svg>

            <div className="forecast-chart-dates">
        <span>
          {date(
              values[0].date,
          )}
        </span>

                <span>
          {date(
              values[
              values.length - 1
                  ].date,
          )}
        </span>
            </div>
        </div>
    )
}

export function ForecastResultPage() {
    const {
        id,
    } = useParams()

    const {
        forecast,
        loading,
        error,
    } = useForecast(id)

    if (loading) {
        return <Skeleton />
    }

    if (error) {
        return (
            <>
                <PageHeader
                    eyebrow="ПРОГНОЗ"
                    title="Не удалось загрузить прогноз"
                    description="Сохранённый результат не удалось получить с Backend."
                />

                <ErrorState
                    description={
                        error.message
                    }
                />
            </>
        )
    }

    if (!forecast) {
        return (
            <>
                <PageHeader
                    eyebrow="ПРОГНОЗ"
                    title="Прогноз не найден"
                    description="Проверьте адрес страницы или откройте прогноз из истории."
                />

                <EmptyState
                    title="Нет данных прогноза"
                    description="Запрошенный прогноз отсутствует."
                    action={
                        <LinkButton
                            to="/forecasts"
                        >
                            К истории прогнозов
                        </LinkButton>
                    }
                />
            </>
        )
    }

    const metrics =
        forecast.metrics

    return (
        <>
            <LinkButton
                variant="ghost"
                to="/forecasts"
            >
                <ArrowLeft
                    size={16}
                />
                История прогнозов
            </LinkButton>

            <PageHeader
                eyebrow="РЕЗУЛЬТАТ ПРОГНОЗА"
                title={
                    forecast.product.name
                }
                description={`SKU ${forecast.product.sku} · ${days(forecast.forecastHorizon)}`}
                actions={
                    <LinkButton
                        to="/forecasts/new"
                    >
                        Новый прогноз
                    </LinkButton>
                }
            />

            <div className="forecast-result-summary">
                <div>
          <span className="eyebrow">
            ТОВАР
          </span>

                    <div className="summary-value">
                        <Package
                            size={18}
                        />

                        <strong>
                            {
                                forecast
                                    .product
                                    .name
                            }
                        </strong>
                    </div>

                    <span className="mono muted">
            {
                forecast
                    .product
                    .sku
            }
          </span>
                </div>

                <div>
          <span className="eyebrow">
            ГОРИЗОНТ
          </span>

                    <div className="summary-value">
                        <CalendarDays
                            size={18}
                        />

                        <strong>
                            {days(
                                forecast
                                    .forecastHorizon,
                            )}
                        </strong>
                    </div>
                </div>

                <div>
          <span className="eyebrow">
            МОДЕЛЬ
          </span>

                    <div className="summary-value">
                        <BrainCircuit
                            size={18}
                        />

                        <strong className="mono">
                            {
                                forecast
                                    .modelVersion
                            }
                        </strong>
                    </div>
                </div>

                <div>
          <span className="eyebrow">
            СОЗДАН
          </span>

                    <div className="summary-value">
                        <strong>
                            {date(
                                forecast
                                    .createdAt,
                            )}
                        </strong>
                    </div>

                    <Badge tone="success">
                        Завершён
                    </Badge>
                </div>
            </div>

            <section className="forecast-result-section">
                <SectionTitle
                    aside={
                        <span className="muted">
              {
                  forecast
                      .values
                      .length
              }{' '}
                            прогнозных точек
            </span>
                    }
                >
                    Прогноз спроса
                </SectionTitle>

                {forecast.values.length
                    ? (
                        <ForecastLineChart
                            values={
                                forecast.values
                            }
                        />
                    )
                    : (
                        <EmptyState
                            title="Нет прогнозных значений"
                            description="Backend вернул прогноз без временного ряда."
                        />
                    )}
            </section>

            <section className="forecast-result-section">
                <SectionTitle>
                    Метрики качества
                </SectionTitle>

                {metrics
                    ? (
                        <div className="import-summary">
                            <div>
                <span>
                  MAE
                </span>

                                <strong>
                                    {metrics.mae
                                    === null
                                        ? '—'
                                        : number(
                                            metrics.mae,
                                            2,
                                        )}
                                </strong>
                            </div>

                            <div>
                <span>
                  RMSE
                </span>

                                <strong>
                                    {metrics.rmse
                                    === null
                                        ? '—'
                                        : number(
                                            metrics.rmse,
                                            2,
                                        )}
                                </strong>
                            </div>

                            <div>
                <span>
                  MAPE
                </span>

                                <strong>
                                    {metrics.mape
                                    === null
                                        ? '—'
                                        : `${number(
                                            metrics.mape,
                                            2,
                                        )}%`}
                                </strong>
                            </div>
                        </div>
                    )
                    : (
                        <div className="plain-note">
                            <ChartNoAxesCombined
                                size={18}
                            />

                            <p>
                                Метрики качества пока
                                недоступны. Они могут
                                отсутствовать до появления
                                фактических значений
                                за прогнозируемый период.
                            </p>
                        </div>
                    )}
            </section>

            <section className="forecast-result-section">
                <SectionTitle>
                    Прогнозные значения
                </SectionTitle>

                {forecast.values.length
                    > 0 && (
                        <>
                            <div className="desktop-table table-wrap">
                                <table>
                                    <caption className="sr-only">
                                        Прогнозируемый спрос
                                    </caption>

                                    <thead>
                                    <tr>
                                        <th>
                                            Дата
                                        </th>

                                        <th className="numeric">
                                            Прогноз, шт.
                                        </th>
                                    </tr>
                                    </thead>

                                    <tbody>
                                    {forecast.values.map(
                                        item => (
                                            <tr
                                                key={
                                                    item.date
                                                }
                                            >
                                                <td>
                                                    {date(
                                                        item.date,
                                                    )}
                                                </td>

                                                <td className="numeric">
                                                    {number(
                                                        item.value,
                                                        2,
                                                    )}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mobile-records">
                                {forecast.values.map(
                                    item => (
                                        <article
                                            className="record-card"
                                            key={
                                                item.date
                                            }
                                        >
                                            <div className="record-heading">
                      <span>
                        {date(
                            item.date,
                        )}
                      </span>

                                                <strong>
                                                    {number(
                                                        item.value,
                                                        2,
                                                    )}{' '}
                                                    шт.
                                                </strong>
                                            </div>
                                        </article>
                                    ),
                                )}
                            </div>
                        </>
                    )}
            </section>
        </>
    )
}