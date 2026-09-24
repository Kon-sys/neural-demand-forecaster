import {
    useState,
    type FormEvent,
} from 'react'

import {
    useNavigate,
    useParams,
} from 'react-router-dom'

import {
    ArrowLeft,
    Check,
} from 'lucide-react'

import {
    useStore,
} from '@/app/store-context'

import {
    useProducts,
} from '@/features/products/model/useProducts'

import {
    isApiError,
} from '@/shared/api/api-error'

import {
    Button,
} from '@/components/ui/button'

import {
    Field,
    LinkButton,
    PageHeader,
} from '@/components/ui/primitives'

import {
    ErrorState,
    Skeleton,
} from '@/components/feedback/States'

export function ProductForm() {
    const {
        id,
    } = useParams()

    const navigate =
        useNavigate()

    const {
        notify,
    } = useStore()

    const {
        products,
        loading,
        error,
        reload,
        createProduct,
        updateProduct,
    } = useProducts()

    const product =
        products.find(
            item =>
                item.id === id,
        )

    const [
        sku,
        setSku,
    ] = useState('')

    const [
        name,
        setName,
    ] = useState('')

    const [
        category,
        setCategory,
    ] = useState('')

    const [
        initializedId,
        setInitializedId,
    ] = useState<
        string | null
    >(null)

    const [
        errors,
        setErrors,
    ] = useState<
        Record<string, string>
    >({})

    const [
        busy,
        setBusy,
    ] = useState(false)

    if (
        id
        && product
        && initializedId !== id
    ) {
        setSku(
            product.sku,
        )

        setName(
            product.name,
        )

        setCategory(
            product.category
            ?? '',
        )

        setInitializedId(id)
    }

    if (
        id
        && loading
        && !product
    ) {
        return <Skeleton />
    }

    if (
        error
        && !product
    ) {
        return (
            <ErrorState
                description={
                    error.message
                }
                retry={reload}
            />
        )
    }

    if (
        id
        && !loading
        && !product
    ) {
        return (
            <ErrorState
                title="Товар не найден"
                description="Возможно, этот товар был удалён."
                retry={() =>
                    navigate(
                        '/products',
                    )
                }
            />
        )
    }

    async function submit(
        event: FormEvent,
    ) {
        event.preventDefault()

        const next:
            Record<string, string> =
            {}

        if (!sku.trim()) {
            next.sku =
                'Введите артикул'
        }

        if (!name.trim()) {
            next.name =
                'Введите название'
        }

        setErrors(next)

        if (
            Object.keys(next).length
        ) {
            requestAnimationFrame(
                () =>
                    document
                        .querySelector<HTMLElement>(
                            '[aria-invalid="true"]',
                        )
                        ?.focus(),
            )

            return
        }

        setBusy(true)

        try {
            const input = {
                sku:
                    sku.trim(),

                name:
                    name.trim(),

                category:
                    category.trim()
                    || null,
            }

            if (id) {
                await updateProduct(
                    id,
                    input,
                )

                notify(
                    'Изменения сохранены',
                    'success',
                )
            } else {
                await createProduct(
                    input,
                )

                notify(
                    'Товар добавлен',
                    'success',
                )
            }

            navigate(
                '/products',
            )
        } catch (reason) {
            if (
                isApiError(reason)
                && reason.code ===
                'PRODUCT_SKU_ALREADY_EXISTS'
            ) {
                setErrors({
                    sku:
                        'Товар с таким артикулом уже существует',
                })

                return
            }

            notify(
                reason instanceof Error
                    ? reason.message
                    : 'Не удалось сохранить товар',
                'error',
            )
        } finally {
            setBusy(false)
        }
    }

    const categories =
        Array.from(
            new Set(
                products
                    .map(
                        item =>
                            item.category,
                    )
                    .filter(
                        (
                            item,
                        ): item is string =>
                            Boolean(item),
                    ),
            ),
        )

    return (
        <>
            <LinkButton
                variant="ghost"
                to="/products"
            >
                <ArrowLeft size={16} />
                К товарам
            </LinkButton>

            <PageHeader
                eyebrow="КАТАЛОГ / ТОВАР"
                title={
                    id
                        ? 'Редактирование товара'
                        : 'Новый товар'
                }
                description={
                    id
                        ? 'Обновите основную информацию о товаре.'
                        : 'Добавьте товар для анализа продаж и прогнозирования спроса.'
                }
            />

            <div className="form-layout">
                <form
                    className="product-form"
                    onSubmit={submit}
                    noValidate
                >
                    <Field
                        label="Артикул (SKU)"
                        htmlFor="sku"
                        error={errors.sku}
                        hint="Уникальный код товара в вашей системе"
                    >
                        <input
                            id="sku"
                            value={sku}
                            maxLength={40}
                            placeholder="Например, NB-002"
                            onChange={event =>
                                setSku(
                                    event.target.value,
                                )
                            }
                            aria-invalid={
                                !!errors.sku
                            }
                        />
                    </Field>

                    <Field
                        label="Название товара"
                        htmlFor="product-name"
                        error={errors.name}
                    >
                        <input
                            id="product-name"
                            value={name}
                            maxLength={120}
                            placeholder="Например, Ноутбук 14″"
                            onChange={event =>
                                setName(
                                    event.target.value,
                                )
                            }
                            aria-invalid={
                                !!errors.name
                            }
                        />
                    </Field>

                    <Field
                        label="Категория"
                        htmlFor="category"
                        hint="Необязательное поле"
                    >
                        <input
                            id="category"
                            value={category}
                            maxLength={100}
                            placeholder="Например, Ноутбуки"
                            list="categories"
                            onChange={event =>
                                setCategory(
                                    event.target.value,
                                )
                            }
                        />

                        <datalist id="categories">
                            {categories.map(
                                item => (
                                    <option
                                        key={item}
                                        value={item}
                                    />
                                ),
                            )}
                        </datalist>
                    </Field>

                    <div className="form-actions">
                        <LinkButton
                            variant="secondary"
                            to="/products"
                        >
                            Отмена
                        </LinkButton>

                        <Button
                            type="submit"
                            disabled={busy}
                        >
                            <Check size={16} />

                            {busy
                                ? 'Сохраняем...'
                                : id
                                    ? 'Сохранить изменения'
                                    : 'Создать товар'}
                        </Button>
                    </div>
                </form>

                <aside className="form-aside">
          <span className="eyebrow">
            О ТОВАРЕ
          </span>

                    <h3>
                        Точность начинается
                        <br />
                        с порядка в данных.
                    </h3>

                    <p>
                        Артикул связывает товар
                        с историей продаж.
                        Используйте один и тот же
                        SKU в каталоге и CSV-файле.
                    </p>
                </aside>
            </div>
        </>
    )
}