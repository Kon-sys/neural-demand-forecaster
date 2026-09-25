import {
    useMemo,
    useState,
} from 'react'

import {
    ChevronLeft,
    ChevronRight,
    SlidersHorizontal,
    Upload,
} from 'lucide-react'

import {
    useStore,
} from '@/app/store-context'

import {
    useProducts,
} from '@/features/products/model/useProducts'

import {
    useSales,
} from '@/features/sales/model/useSales'

import {
    Button,
} from '@/components/ui/button'

import {
    Field,
    LinkButton,
    PageHeader,
} from '@/components/ui/primitives'

import {
    Overlay,
} from '@/components/ui/overlay'

import {
    EmptyState,
    ErrorState,
    Skeleton,
} from '@/components/feedback/States'

import {
    date,
    number,
} from '@/shared/lib/format'

const PAGE_SIZE = 12

export function SalesPage() {
    const {
        user,
    } = useStore()

    const {
        products,
        loading: productsLoading,
        error: productsError,
        reload: reloadProducts,
    } = useProducts()

    const [
        product,
        setProduct,
    ] = useState('')

    const [
        from,
        setFrom,
    ] = useState('')

    const [
        to,
        setTo,
    ] = useState('')

    const [
        sheet,
        setSheet,
    ] = useState(false)

    const [
        page,
        setPage,
    ] = useState(0)

    const invalid =
        Boolean(
            from
            && to
            && from > to,
        )

    const {
        data,
        loading,
        error,
        reload,
    } = useSales({
        productId:
            product || undefined,

        dateFrom:
            from || undefined,

        dateTo:
            to || undefined,

        page,
        size: PAGE_SIZE,
        enabled: !invalid,
    })

    const productById =
        useMemo(
            () =>
                new Map(
                    products.map(
                        item => [
                            item.id,
                            item,
                        ],
                    ),
                ),
            [products],
        )

    function reset() {
        setProduct('')
        setFrom('')
        setTo('')
        setPage(0)
    }

    const filters = (
        <>
            <Field
                label="Товар"
                htmlFor={
                    sheet
                        ? 'filter-product-mobile'
                        : 'filter-product'
                }
            >
                <select
                    id={
                        sheet
                            ? 'filter-product-mobile'
                            : 'filter-product'
                    }
                    value={product}
                    onChange={event => {
                        setProduct(
                            event.target.value,
                        )

                        setPage(0)
                    }}
                >
                    <option value="">
                        Все товары
                    </option>

                    {products.map(
                        item => (
                            <option
                                key={item.id}
                                value={item.id}
                            >
                                {item.name}
                            </option>
                        ),
                    )}
                </select>
            </Field>

            <Field
                label="Дата с"
                htmlFor={
                    sheet
                        ? 'from-mobile'
                        : 'from'
                }
            >
                <input
                    id={
                        sheet
                            ? 'from-mobile'
                            : 'from'
                    }
                    type="date"
                    value={from}
                    onChange={event => {
                        setFrom(
                            event.target.value,
                        )

                        setPage(0)
                    }}
                />
            </Field>

            <Field
                label="Дата по"
                htmlFor={
                    sheet
                        ? 'to-mobile'
                        : 'to'
                }
                error={
                    invalid
                        ? 'Дата окончания должна быть не раньше даты начала'
                        : undefined
                }
            >
                <input
                    id={
                        sheet
                            ? 'to-mobile'
                            : 'to'
                    }
                    type="date"
                    value={to}
                    min={
                        from || undefined
                    }
                    aria-invalid={
                        invalid
                    }
                    onChange={event => {
                        setTo(
                            event.target.value,
                        )

                        setPage(0)
                    }}
                />
            </Field>

            <Button
                variant="ghost"
                onClick={reset}
            >
                Сбросить
            </Button>
        </>
    )

    const combinedError =
        productsError
        || error

    return (
        <>
            <PageHeader
                eyebrow="ИСТОРИЧЕСКИЕ ДАННЫЕ"
                title="Продажи"
                description="История спроса — основа каждого прогноза."
                actions={
                    user?.role === 'ADMIN'
                        ? (
                            <LinkButton
                                variant="secondary"
                                to="/sales/import"
                            >
                                <Upload size={16} />
                                Импорт CSV
                            </LinkButton>
                        )
                        : undefined
                }
            />

            <div className="desktop-filters">
                {!sheet && filters}
            </div>

            <div className="mobile-filter-bar">
                <Button
                    variant="secondary"
                    onClick={() =>
                        setSheet(true)
                    }
                >
                    <SlidersHorizontal
                        size={16}
                    />

                    Фильтры

                    {(product
                        || from
                        || to) && (
                        <span className="filter-count">
              {
                  [
                      product,
                      from,
                      to,
                  ].filter(
                      Boolean,
                  ).length
              }
            </span>
                    )}
                </Button>

                <span className="muted">
          Записей:{' '}
                    {number(
                        data.totalElements,
                    )}
        </span>
            </div>

            {productsLoading
            || loading
                ? (
                    <Skeleton />
                )
                : combinedError
                    ? (
                        <ErrorState
                            description={
                                combinedError.message
                            }
                            retry={() => {
                                reloadProducts()
                                reload()
                            }}
                        />
                    )
                    : invalid
                        ? (
                            <EmptyState
                                title="Проверьте период"
                                description="Укажите корректные даты начала и окончания."
                                action={
                                    <Button
                                        variant="secondary"
                                        onClick={reset}
                                    >
                                        Сбросить фильтры
                                    </Button>
                                }
                            />
                        )
                        : data.items.length
                            ? (
                                <>
                                    <div className="table-caption">
                    <span>
                      История продаж
                    </span>

                                        <span>
                      {number(
                          data.totalElements,
                      )}{' '}
                                            записей · количество
                      в штуках
                    </span>
                                    </div>

                                    <div className="desktop-table table-wrap">
                                        <table>
                                            <caption className="sr-only">
                                                История продаж
                                            </caption>

                                            <thead>
                                            <tr>
                                                <th>
                                                    Дата
                                                </th>

                                                <th>
                                                    Товар
                                                </th>

                                                <th>
                                                    Артикул
                                                </th>

                                                <th className="numeric">
                                                    Количество, шт.
                                                </th>
                                            </tr>
                                            </thead>

                                            <tbody>
                                            {data.items.map(
                                                sale => {
                                                    const item =
                                                        productById.get(
                                                            sale.productId,
                                                        )

                                                    return (
                                                        <tr
                                                            key={
                                                                sale.id
                                                            }
                                                        >
                                                            <td>
                                                                {date(
                                                                    sale.date,
                                                                )}
                                                            </td>

                                                            <td>
                                                                <strong>
                                                                    {item?.name
                                                                        ?? `Товар #${sale.productId}`}
                                                                </strong>
                                                            </td>

                                                            <td className="mono muted">
                                                                {item?.sku
                                                                    ?? '—'}
                                                            </td>

                                                            <td className="numeric">
                                                                {number(
                                                                    sale.quantity,
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                },
                                            )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mobile-records">
                                        {data.items.map(
                                            sale => {
                                                const item =
                                                    productById.get(
                                                        sale.productId,
                                                    )

                                                return (
                                                    <article
                                                        className="record-card"
                                                        key={
                                                            sale.id
                                                        }
                                                    >
                                                        <div className="record-heading">
                              <span className="muted">
                                {date(
                                    sale.date,
                                )}
                              </span>

                                                            <strong>
                                                                {number(
                                                                    sale.quantity,
                                                                )}{' '}
                                                                шт.
                                                            </strong>
                                                        </div>

                                                        <h3>
                                                            {item?.name
                                                                ?? `Товар #${sale.productId}`}
                                                        </h3>

                                                        <span className="mono muted">
                              {item?.sku
                                  ?? '—'}
                            </span>
                                                    </article>
                                                )
                                            },
                                        )}
                                    </div>

                                    <div className="pagination">
                    <span>
                      {page
                          * PAGE_SIZE
                          + 1}
                        –
                        {Math.min(
                            (
                                page + 1
                            )
                            * PAGE_SIZE,
                            data.totalElements,
                        )}{' '}
                        из{' '}
                        {number(
                            data.totalElements,
                        )}
                    </span>

                                        <div>
                                            <Button
                                                variant="secondary"
                                                aria-label="Предыдущая страница"
                                                disabled={
                                                    page === 0
                                                }
                                                onClick={() =>
                                                    setPage(
                                                        current =>
                                                            current - 1,
                                                    )
                                                }
                                            >
                                                <ChevronLeft
                                                    size={16}
                                                />
                                            </Button>

                                            <span>
                        {page + 1}
                                                {' / '}
                                                {data.totalPages}
                      </span>

                                            <Button
                                                variant="secondary"
                                                aria-label="Следующая страница"
                                                disabled={
                                                    page + 1
                                                    >= data.totalPages
                                                }
                                                onClick={() =>
                                                    setPage(
                                                        current =>
                                                            current + 1,
                                                    )
                                                }
                                            >
                                                <ChevronRight
                                                    size={16}
                                                />
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )
                            : (
                                <EmptyState
                                    title={
                                        product
                                        || from
                                        || to
                                            ? 'По выбранным условиям данных нет'
                                            : 'История продаж пока отсутствует'
                                    }
                                    description={
                                        product
                                        || from
                                        || to
                                            ? 'Выберите другой товар или измените период.'
                                            : user?.role === 'ADMIN'
                                                ? 'Импортируйте CSV с историей продаж.'
                                                : 'Обратитесь к администратору для импорта продаж.'
                                    }
                                    action={
                                        product
                                        || from
                                        || to
                                            ? (
                                                <Button
                                                    variant="secondary"
                                                    onClick={reset}
                                                >
                                                    Сбросить фильтры
                                                </Button>
                                            )
                                            : user?.role === 'ADMIN'
                                                ? (
                                                    <LinkButton
                                                        to="/sales/import"
                                                    >
                                                        Импорт CSV
                                                    </LinkButton>
                                                )
                                                : undefined
                                    }
                                />
                            )}

            {sheet && (
                <Overlay
                    title="Фильтры продаж"
                    kind="sheet"
                    onClose={() =>
                        setSheet(false)
                    }
                >
                    <div className="sheet-fields">
                        {filters}
                    </div>

                    <Button
                        className="full-width"
                        onClick={() =>
                            setSheet(false)
                        }
                        disabled={invalid}
                    >
                        Показать записи
                    </Button>
                </Overlay>
            )}
        </>
    )
}