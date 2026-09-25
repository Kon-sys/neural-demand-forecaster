import {
    useState,
} from 'react'

import {
    ChevronLeft,
    ChevronRight,
    Plus,
} from 'lucide-react'

import {
    ForecastList,
} from '@/features/forecasts/ForecastList'

import {
    useForecastHistory,
} from '@/features/forecasts/model/useForecastHistory'

import {
    EmptyState,
} from '@/components/feedback/States'

import {
    Button,
} from '@/components/ui/button'

import {
    LinkButton,
    PageHeader,
} from '@/components/ui/primitives'

const PAGE_SIZE = 20

export function ForecastHistoryPage() {
    const [
        page,
        setPage,
    ] = useState(
        0,
    )

    const [
        dateFrom,
        setDateFrom,
    ] = useState(
        '',
    )

    const [
        dateTo,
        setDateTo,
    ] = useState(
        '',
    )

    const {
        data,
        forecasts,
        loading,
        error,
    } = useForecastHistory({
        dateFrom:
            dateFrom
            || undefined,

        dateTo:
            dateTo
            || undefined,

        page,

        size:
        PAGE_SIZE,
    })

    const totalElements =
        data?.totalElements
        ?? 0

    const totalPages =
        data?.totalPages
        ?? 0

    function clearFilters() {
        setDateFrom(
            '',
        )

        setDateTo(
            '',
        )

        setPage(
            0,
        )
    }

    return (
        <>
            <PageHeader
                eyebrow="СОХРАНЁННЫЕ РЕЗУЛЬТАТЫ"
                title="История прогнозов"
                description="Все ранее построенные прогнозы из базы данных."
                actions={
                    <LinkButton to="/forecasts/new">
                        <Plus size={16} />
                        Создать прогноз
                    </LinkButton>
                }
            />

            <div className="toolbar">
                <div className="history-filters">
                    <label>
                        <span>
                            С даты
                        </span>

                        <input
                            type="date"
                            value={
                                dateFrom
                            }
                            max={
                                dateTo
                                || undefined
                            }
                            onChange={
                                event => {
                                    setDateFrom(
                                        event
                                            .target
                                            .value,
                                    )

                                    setPage(
                                        0,
                                    )
                                }
                            }
                        />
                    </label>

                    <label>
                        <span>
                            По дату
                        </span>

                        <input
                            type="date"
                            value={
                                dateTo
                            }
                            min={
                                dateFrom
                                || undefined
                            }
                            onChange={
                                event => {
                                    setDateTo(
                                        event
                                            .target
                                            .value,
                                    )

                                    setPage(
                                        0,
                                    )
                                }
                            }
                        />
                    </label>

                    {(dateFrom || dateTo) && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={
                                clearFilters
                            }
                        >
                            Сбросить
                        </Button>
                    )}
                </div>

                <span
                    className="muted"
                    role="status"
                >
                    Прогнозов: {
                    totalElements
                }
                </span>
            </div>

            {loading && (
                <div
                    className="plain-note"
                    aria-busy="true"
                >
                    Загружаем историю прогнозов…
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
                && forecasts.length > 0
                && (
                    <>
                        <ForecastList
                            forecasts={
                                forecasts
                            }
                        />

                        {totalPages > 1 && (
                            <div className="pagination">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={
                                        page === 0
                                    }
                                    onClick={
                                        () =>
                                            setPage(
                                                current =>
                                                    Math.max(
                                                        0,
                                                        current - 1,
                                                    ),
                                            )
                                    }
                                >
                                    <ChevronLeft size={16} />
                                    Назад
                                </Button>

                                <span className="muted">
                                    Страница {
                                    page + 1
                                } из {
                                    totalPages
                                }
                                </span>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={
                                        page + 1
                                        >= totalPages
                                    }
                                    onClick={
                                        () =>
                                            setPage(
                                                current =>
                                                    current + 1,
                                            )
                                    }
                                >
                                    Далее
                                    <ChevronRight size={16} />
                                </Button>
                            </div>
                        )}
                    </>
                )}

            {!loading
                && !error
                && forecasts.length === 0
                && (
                    <EmptyState
                        title={
                            dateFrom
                            || dateTo
                                ? 'Прогнозы за выбранный период не найдены'
                                : 'Прогнозы ещё не создавались'
                        }
                        description={
                            dateFrom
                            || dateTo
                                ? 'Измените период или сбросьте фильтры.'
                                : 'Создайте первый прогноз, чтобы он появился в истории.'
                        }
                        action={
                            dateFrom
                            || dateTo
                                ? (
                                    <Button
                                        variant="secondary"
                                        onClick={
                                            clearFilters
                                        }
                                    >
                                        Сбросить фильтры
                                    </Button>
                                )
                                : (
                                    <LinkButton to="/forecasts/new">
                                        Создать прогноз
                                    </LinkButton>
                                )
                        }
                    />
                )}
        </>
    )
}