import {
    useState,
    type FormEvent,
} from 'react'

import {
    useNavigate,
} from 'react-router-dom'

import {
    ArrowRight,
    BrainCircuit,
    CalendarRange,
    Database,
    Package,
} from 'lucide-react'

import {
    useStore,
} from '@/app/store-context'

import {
    useProducts,
} from '@/features/products/model/useProducts'

import {
    useCreateForecast,
} from '@/features/forecasts/model/useCreateForecast'

import {
    Button,
} from '@/components/ui/button'

import {
    Field,
    LinkButton,
    PageHeader,
} from '@/components/ui/primitives'

import {
    EmptyState,
    ErrorState,
    Skeleton,
} from '@/components/feedback/States'

export function ForecastCreatePage() {
    const navigate =
        useNavigate()

    const {
        notify,
    } = useStore()

    const {
        products,
        loading:
            productsLoading,
        error:
            productsError,
        reload:
            reloadProducts,
    } = useProducts()

    const {
        loading:
            forecastLoading,
        error:
            forecastError,
        createForecast,
        reset:
            resetForecast,
    } = useCreateForecast()

    const [
        productId,
        setProductId,
    ] = useState('')

    const [
        horizon,
        setHorizon,
    ] = useState(14)

    const [
        formError,
        setFormError,
    ] = useState<
        string | null
    >(null)

    async function submit(
        event: FormEvent,
    ) {
        event.preventDefault()

        resetForecast()
        setFormError(null)

        if (!productId) {
            setFormError(
                'Выберите товар для прогнозирования.',
            )

            return
        }

        if (
            !Number.isInteger(
                horizon,
            )
            || horizon <= 0
        ) {
            setFormError(
                'Горизонт должен быть положительным целым числом.',
            )

            return
        }

        try {
            const forecast =
                await createForecast({
                    productId,
                    forecastHorizon:
                    horizon,
                })

            notify(
                'Прогноз успешно построен',
                'success',
            )

            navigate(
                `/forecasts/${forecast.id}`,
            )
        } catch (reason) {
            notify(
                reason instanceof Error
                    ? reason.message
                    : 'Не удалось построить прогноз',
                'error',
            )
        }
    }

    if (productsLoading) {
        return <Skeleton />
    }

    if (productsError) {
        return (
            <ErrorState
                title="Не удалось загрузить товары"
                description={
                    productsError.message
                }
                retry={
                    reloadProducts
                }
            />
        )
    }

    if (!products.length) {
        return (
            <>
                <PageHeader
                    eyebrow="ПРОГНОЗИРОВАНИЕ"
                    title="Новый прогноз"
                    description="Выберите товар и горизонт прогнозирования."
                />

                <EmptyState
                    title="Нет товаров для прогнозирования"
                    description="Сначала добавьте товар в каталог и загрузите для него историю продаж."
                    action={
                        <LinkButton
                            to="/products"
                        >
                            Перейти к товарам
                        </LinkButton>
                    }
                />
            </>
        )
    }

    const selectedProduct =
        products.find(
            product =>
                product.id ===
                productId,
        )

    const requestError =
        forecastError
            ?.message
        ?? null

    return (
        <>
            <PageHeader
                eyebrow="ПРОГНОЗИРОВАНИЕ"
                title="Новый прогноз"
                description="Выберите товар и задайте горизонт. История продаж будет получена автоматически."
                actions={
                    <LinkButton
                        variant="secondary"
                        to="/forecasts"
                    >
                        История прогнозов
                    </LinkButton>
                }
            />

            <div className="form-layout">
                <form
                    className="product-form"
                    onSubmit={submit}
                    noValidate
                >
                    <Field
                        label="Товар"
                        htmlFor="forecast-product"
                        error={
                            !productId
                            && formError
                                ? formError
                                : undefined
                        }
                    >
                        <select
                            id="forecast-product"
                            value={productId}
                            disabled={
                                forecastLoading
                            }
                            aria-invalid={
                                Boolean(
                                    !productId
                                    && formError,
                                )
                            }
                            onChange={
                                event => {
                                    setProductId(
                                        event
                                            .target
                                            .value,
                                    )

                                    setFormError(
                                        null,
                                    )

                                    resetForecast()
                                }
                            }
                        >
                            <option value="">
                                Выберите товар
                            </option>

                            {products.map(
                                product => (
                                    <option
                                        key={
                                            product.id
                                        }
                                        value={
                                            product.id
                                        }
                                    >
                                        {
                                            product.name
                                        }
                                        {' · '}
                                        {
                                            product.sku
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </Field>

                    {selectedProduct && (
                        <div className="plain-note">
                            <Package
                                size={18}
                            />

                            <div>
                                <strong>
                                    {
                                        selectedProduct
                                            .name
                                    }
                                </strong>

                                <p className="muted">
                                    SKU:{' '}
                                    {
                                        selectedProduct
                                            .sku
                                    }

                                    {selectedProduct
                                        .category
                                        ? ` · ${selectedProduct.category}`
                                        : ''}
                                </p>
                            </div>
                        </div>
                    )}

                    <Field
                        label="Горизонт прогноза"
                        htmlFor="forecast-horizon"
                        hint="Количество календарных дней, для которых будет рассчитан прогноз"
                        error={
                            productId
                            && formError
                                ? formError
                                : undefined
                        }
                    >
                        <input
                            id="forecast-horizon"
                            type="number"
                            min={1}
                            step={1}
                            value={horizon}
                            disabled={
                                forecastLoading
                            }
                            aria-invalid={
                                Boolean(
                                    productId
                                    && formError,
                                )
                            }
                            onChange={
                                event => {
                                    setHorizon(
                                        Number(
                                            event
                                                .target
                                                .value,
                                        ),
                                    )

                                    setFormError(
                                        null,
                                    )

                                    resetForecast()
                                }
                            }
                        />
                    </Field>

                    <div className="horizon-presets">
                        <Button
                            type="button"
                            variant={
                                horizon === 7
                                    ? 'primary'
                                    : 'secondary'
                            }
                            disabled={
                                forecastLoading
                            }
                            onClick={() => {
                                setHorizon(7)
                                setFormError(
                                    null,
                                )
                            }}
                        >
                            7 дней
                        </Button>

                        <Button
                            type="button"
                            variant={
                                horizon === 14
                                    ? 'primary'
                                    : 'secondary'
                            }
                            disabled={
                                forecastLoading
                            }
                            onClick={() => {
                                setHorizon(14)
                                setFormError(
                                    null,
                                )
                            }}
                        >
                            14 дней
                        </Button>

                        <Button
                            type="button"
                            variant={
                                horizon === 30
                                    ? 'primary'
                                    : 'secondary'
                            }
                            disabled={
                                forecastLoading
                            }
                            onClick={() => {
                                setHorizon(30)
                                setFormError(
                                    null,
                                )
                            }}
                        >
                            30 дней
                        </Button>
                    </div>

                    {requestError && (
                        <div
                            className="inline-error"
                            role="alert"
                        >
              <span>
                {requestError}
              </span>
                        </div>
                    )}

                    <div className="form-actions">
                        <LinkButton
                            variant="secondary"
                            to="/dashboard"
                        >
                            Отмена
                        </LinkButton>

                        <Button
                            type="submit"
                            disabled={
                                forecastLoading
                            }
                        >
                            <BrainCircuit
                                size={17}
                            />

                            {forecastLoading
                                ? 'Строим прогноз...'
                                : 'Построить прогноз'}

                            {!forecastLoading && (
                                <ArrowRight
                                    size={16}
                                />
                            )}
                        </Button>
                    </div>
                </form>

                <aside className="form-aside">
          <span className="eyebrow">
            КАК ЭТО РАБОТАЕТ
          </span>

                    <h3>
                        История становится
                        <br />
                        следующим сигналом.
                    </h3>

                    <div className="forecast-process">
                        <div>
                            <Database
                                size={19}
                            />

                            <span>
                Backend получает историю
                продаж выбранного товара.
              </span>
                        </div>

                        <div>
                            <BrainCircuit
                                size={19}
                            />

                            <span>
                ML-модель рассчитывает
                будущий спрос.
              </span>
                        </div>

                        <div>
                            <CalendarRange
                                size={19}
                            />

                            <span>
                Результат сохраняется
                вместе с датами и версией
                модели.
              </span>
                        </div>
                    </div>

                    <p className="muted">
                        Если истории продаж
                        недостаточно, Backend
                        остановит расчёт и вернёт
                        контролируемую ошибку.
                    </p>
                </aside>
            </div>
        </>
    )
}