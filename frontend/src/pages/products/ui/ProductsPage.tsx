import {
    useMemo,
    useState,
} from 'react'

import {
    Link,
} from 'react-router-dom'

import {
    Package,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react'

import {
    useStore,
} from '@/app/store-context'

import {
    useProducts,
} from '@/features/products/model/useProducts'

import type {
    Product,
} from '@/entities/product/model/types'

import {
    isApiError,
} from '@/shared/api/api-error'

import {
    Button,
} from '@/components/ui/button'

import {
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

export function ProductsPage() {
    const {
        user,
        notify,
    } = useStore()

    const {
        products,
        loading,
        error,
        reload,
        deleteProduct,
    } = useProducts()

    const [
        query,
        setQuery,
    ] = useState('')

    const [
        deleting,
        setDeleting,
    ] = useState<Product | null>(
        null,
    )

    const [
        busy,
        setBusy,
    ] = useState(false)

    const admin =
        user?.role === 'ADMIN'

    const filtered =
        useMemo(
            () => {
                const normalized =
                    query
                        .trim()
                        .toLocaleLowerCase(
                            'ru',
                        )

                if (!normalized) {
                    return products
                }

                return products.filter(
                    product =>
                        `${product.name} ${product.sku} ${product.category ?? ''}`
                            .toLocaleLowerCase(
                                'ru',
                            )
                            .includes(
                                normalized,
                            ),
                )
            },
            [
                products,
                query,
            ],
        )

    async function remove() {
        if (!deleting) {
            return
        }

        setBusy(true)

        try {
            await deleteProduct(
                deleting.id,
            )

            setDeleting(null)

            notify(
                'Товар удалён из каталога',
                'success',
            )
        } catch (reason) {
            if (
                isApiError(reason)
                && reason.code ===
                'PRODUCT_IS_IN_USE'
            ) {
                notify(
                    'Нельзя удалить товар: он уже используется в продажах или прогнозах.',
                    'error',
                )
            } else {
                notify(
                    reason instanceof Error
                        ? reason.message
                        : 'Не удалось удалить товар',
                    'error',
                )
            }
        } finally {
            setBusy(false)
        }
    }

    const actions = (
        product: Product,
    ) => {
        if (!admin) {
            return null
        }

        return (
            <div className="row-actions">
                <Link
                    className="icon-btn"
                    aria-label={
                        `Редактировать ${product.name}`
                    }
                    title="Редактировать"
                    to={
                        `/products/${product.id}/edit`
                    }
                >
                    <Pencil size={16} />
                </Link>

                <button
                    className="icon-btn danger-text"
                    aria-label={
                        `Удалить ${product.name}`
                    }
                    title="Удалить"
                    onClick={() =>
                        setDeleting(
                            product,
                        )
                    }
                >
                    <Trash2 size={16} />
                </button>
            </div>
        )
    }

    return (
        <>
            <PageHeader
                eyebrow="КАТАЛОГ"
                title="Товары"
                description="Товары, для которых вы анализируете спрос."
                actions={
                    admin
                        ? (
                            <LinkButton
                                to="/products/new"
                            >
                                <Plus size={17} />
                                Добавить товар
                            </LinkButton>
                        )
                        : undefined
                }
            />

            <div className="toolbar">
                <div className="search-field">
                    <Search size={18} />

                    <label
                        className="sr-only"
                        htmlFor="product-search"
                    >
                        Поиск по названию или SKU
                    </label>

                    <input
                        id="product-search"
                        placeholder="Поиск по названию, SKU или категории"
                        value={query}
                        onChange={event =>
                            setQuery(
                                event.target.value,
                            )
                        }
                    />

                    {query && (
                        <button
                            className="icon-btn"
                            aria-label="Очистить поиск"
                            onClick={() =>
                                setQuery('')
                            }
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                <span
                    className="muted"
                    role="status"
                >
          Товаров: {filtered.length}
        </span>
            </div>

            {loading
                ? (
                    <Skeleton />
                )
                : error
                    ? (
                        <ErrorState
                            description={
                                error.message
                            }
                            retry={reload}
                        />
                    )
                    : filtered.length
                        ? (
                            <>
                                <div className="table-wrap desktop-table">
                                    <table>
                                        <caption className="sr-only">
                                            Каталог товаров
                                        </caption>

                                        <thead>
                                        <tr>
                                            <th>
                                                Артикул
                                            </th>

                                            <th>
                                                Название товара
                                            </th>

                                            <th>
                                                Категория
                                            </th>

                                            {admin && (
                                                <th className="align-right">
                                                    Действия
                                                </th>
                                            )}
                                        </tr>
                                        </thead>

                                        <tbody>
                                        {filtered.map(
                                            product => (
                                                <tr
                                                    key={
                                                        product.id
                                                    }
                                                >
                                                    <td className="mono muted">
                                                        {product.sku}
                                                    </td>

                                                    <td>
                                                        <div className="product-cell">
                                <span className="product-icon">
                                  <Package
                                      size={18}
                                      strokeWidth={
                                          1.5
                                      }
                                  />
                                </span>

                                                            <strong>
                                                                {
                                                                    product.name
                                                                }
                                                            </strong>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        {product.category
                                                            || '—'}
                                                    </td>

                                                    {admin && (
                                                        <td>
                                                            {actions(
                                                                product,
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            ),
                                        )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mobile-records">
                                    {filtered.map(
                                        product => (
                                            <article
                                                className="record-card"
                                                key={
                                                    product.id
                                                }
                                            >
                                                <div className="record-heading">
                          <span className="mono muted">
                            {
                                product.sku
                            }
                          </span>

                                                    {actions(
                                                        product,
                                                    )}
                                                </div>

                                                <h3>
                                                    {product.name}
                                                </h3>

                                                <p className="muted">
                                                    {product.category
                                                        || 'Без категории'}
                                                </p>
                                            </article>
                                        ),
                                    )}
                                </div>

                                <div className="table-footer">
                                    Показано{' '}
                                    {filtered.length}{' '}
                                    из{' '}
                                    {products.length}{' '}
                                    товаров
                                </div>
                            </>
                        )
                        : (
                            <EmptyState
                                title={
                                    query
                                        ? 'Товары не найдены'
                                        : 'Товары пока не добавлены'
                                }
                                description={
                                    query
                                        ? 'Попробуйте другое название, артикул или категорию.'
                                        : admin
                                            ? 'Добавьте первый товар в каталог.'
                                            : 'Администратор ещё не добавил товары.'
                                }
                                action={
                                    query
                                        ? (
                                            <Button
                                                variant="secondary"
                                                onClick={() =>
                                                    setQuery('')
                                                }
                                            >
                                                Очистить поиск
                                            </Button>
                                        )
                                        : admin
                                            ? (
                                                <LinkButton
                                                    to="/products/new"
                                                >
                                                    Добавить товар
                                                </LinkButton>
                                            )
                                            : undefined
                                }
                            />
                        )}

            {deleting && (
                <Overlay
                    title="Удалить товар?"
                    onClose={() => {
                        if (!busy) {
                            setDeleting(
                                null,
                            )
                        }
                    }}
                >
                    <div className="delete-body">
                        <div className="delete-symbol">
                            <Trash2 size={24} />
                        </div>

                        <p>
                            Товар{' '}
                            <strong>
                                «{deleting.name}»
                            </strong>{' '}
                            будет удалён из каталога.
                        </p>

                        <p className="muted">
                            Если товар уже связан
                            с продажами или прогнозами,
                            Backend не позволит его удалить.
                        </p>
                    </div>

                    <div className="dialog-actions">
                        <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() =>
                                setDeleting(
                                    null,
                                )
                            }
                        >
                            Отмена
                        </Button>

                        <Button
                            variant="danger"
                            disabled={busy}
                            onClick={remove}
                        >
                            {busy
                                ? 'Удаляем...'
                                : 'Удалить товар'}
                        </Button>
                    </div>
                </Overlay>
            )}
        </>
    )
}