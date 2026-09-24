import {
    useRef,
    useState,
    type DragEvent,
} from 'react'

import {
    AnimatePresence,
    motion,
} from 'motion/react'

import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    FileSpreadsheet,
    Info,
    Upload,
    X,
} from 'lucide-react'

import {
    useStore,
} from '@/app/store-context'

import {
    useSalesImport,
} from '@/features/sales-import/model/useSalesImport'

import type {
    CsvImportError,
} from '@/entities/sale/model/types'

import {
    isApiError,
} from '@/shared/api/api-error'

import {
    useReducedMotionSetting,
} from '@/shared/hooks/motionPreference'

import {
    number,
} from '@/shared/lib/format'

import {
    Button,
} from '@/components/ui/button'

import {
    Badge,
    LinkButton,
    PageHeader,
    SectionTitle,
} from '@/components/ui/primitives'

import {
    Signal,
} from '@/components/feedback/States'

const MAX_FILE_SIZE =
    10 * 1024 * 1024

type SelectionError =
    | 'format'
    | 'large'
    | null

const rowMessages:
    Record<string, string> = {
    INVALID_ROW_FORMAT:
        'Строка должна содержать ровно три столбца.',

    INVALID_PRODUCT_SKU:
        'Артикул товара не указан.',

    INVALID_DATE:
        'Дата должна быть указана в формате ГГГГ-ММ-ДД.',

    INVALID_QUANTITY:
        'Количество должно быть целым неотрицательным числом.',

    UNKNOWN_PRODUCT:
        'Товар с таким SKU не найден в каталоге.',

    DUPLICATE_SALE:
        'Продажа для этого товара и даты уже существует.',
}

function getRowErrorMessage(
    error: CsvImportError,
) {
    return rowMessages[
        error.code
        ] ?? error.message
}

function getRequestErrorMessage(
    error: Error | null,
) {
    if (!error) {
        return null
    }

    if (!isApiError(error)) {
        return error.message
    }

    switch (error.code) {
        case 'EMPTY_CSV_FILE':
            return 'CSV-файл пуст.'

        case 'INVALID_CSV_FORMAT':
            return 'Неверная структура CSV. Заголовок должен быть: product_sku,date,quantity.'

        case 'CSV_READ_ERROR':
            return 'Backend не смог прочитать CSV-файл.'

        case 'FILE_TOO_LARGE':
            return 'Файл превышает допустимый размер.'

        case 'INVALID_MULTIPART_REQUEST':
            return 'Не удалось передать файл на сервер.'

        default:
            return error.message
    }
}

export function ImportPage() {
    const {
        notify,
    } = useStore()

    const {
        result,
        loading,
        error,
        importFile,
        reset:
            resetImport,
    } = useSalesImport()

    const input =
        useRef<HTMLInputElement>(
            null,
        )

    const [
        file,
        setFile,
    ] = useState<File | null>(
        null,
    )

    const [
        drag,
        setDrag,
    ] = useState(false)

    const [
        selectionError,
        setSelectionError,
    ] = useState<SelectionError>(
        null,
    )

    const reduce =
        useReducedMotionSetting()

    function choose(
        selected?: File,
    ) {
        setDrag(false)

        if (!selected) {
            return
        }

        resetImport()
        setFile(selected)

        if (
            !selected.name
                .toLowerCase()
                .endsWith('.csv')
        ) {
            setSelectionError(
                'format',
            )

            return
        }

        if (
            selected.size
            > MAX_FILE_SIZE
        ) {
            setSelectionError(
                'large',
            )

            return
        }

        setSelectionError(null)
    }

    function drop(
        event: DragEvent,
    ) {
        event.preventDefault()

        if (loading) {
            return
        }

        choose(
            event
                .dataTransfer
                .files[0],
        )
    }

    async function run() {
        if (
            !file
            || loading
            || selectionError
        ) {
            return
        }

        try {
            const response =
                await importFile(
                    file,
                )

            if (
                response.errors.length
            ) {
                notify(
                    `Импорт завершён: импортировано ${response.importedRows}, пропущено ${response.skippedRows}.`,
                    'info',
                )
            } else {
                notify(
                    'История продаж успешно импортирована',
                    'success',
                )
            }
        } catch (reason) {
            notify(
                reason instanceof Error
                    ? getRequestErrorMessage(
                        reason,
                    )
                    ?? 'Не удалось импортировать CSV'
                    : 'Не удалось импортировать CSV',
                'error',
            )
        }
    }

    function reset() {
        setFile(null)
        setDrag(false)
        setSelectionError(null)

        resetImport()

        if (input.current) {
            input.current.value = ''
        }
    }

    const selectionMessage =
        selectionError === 'format'
            ? 'Неверный формат файла. Выберите CSV-файл.'
            : selectionError === 'large'
                ? 'Файл слишком большой. Максимальный размер — 10 МБ.'
                : null

    const requestMessage =
        getRequestErrorMessage(
            error,
        )

    const complete =
        Boolean(result)

    const partial =
        Boolean(
            result
            && result.errors.length,
        )

    return (
        <>
            <PageHeader
                eyebrow="ДАННЫЕ / ИМПОРТ"
                title="Импорт продаж"
                description="Загрузите историю продаж из CSV-файла."
            />

            <div className="import-layout">
                <section>
                    <input
                        ref={input}
                        className="sr-only"
                        tabIndex={-1}
                        type="file"
                        accept=".csv,text/csv"
                        aria-label="Выбрать CSV-файл"
                        onChange={event =>
                            choose(
                                event.target
                                    .files?.[0],
                            )
                        }
                    />

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={
                                complete
                                    ? 'complete'
                                    : loading
                                        ? 'processing'
                                        : 'upload'
                            }
                            initial={
                                reduce
                                    ? false
                                    : {
                                        opacity: 0,
                                    }
                            }
                            animate={{
                                opacity: 1,
                            }}
                            exit={{
                                opacity: 0,
                            }}
                            transition={{
                                duration: 0.14,
                            }}
                        >
                            {result
                                ? (
                                    <div className="import-result">
                                        <div
                                            className={`result-status-icon ${
                                                partial
                                                    ? 'warning'
                                                    : ''
                                            }`}
                                        >
                                            {partial
                                                ? (
                                                    <AlertTriangle
                                                        size={26}
                                                    />
                                                )
                                                : (
                                                    <CheckCircle2
                                                        size={26}
                                                    />
                                                )}
                                        </div>

                                        <Badge
                                            tone={
                                                partial
                                                    ? 'warning'
                                                    : 'success'
                                            }
                                        >
                                            {partial
                                                ? 'Частично успешно'
                                                : 'Успешно'}
                                        </Badge>

                                        <h2>
                                            {partial
                                                ? 'Данные приняты. Есть замечания.'
                                                : 'История продаж импортирована'}
                                        </h2>

                                        <p className="muted file-name">
                                            {file?.name}
                                        </p>

                                        <div className="import-summary">
                                            <div>
                        <span>
                          Всего строк
                        </span>

                                                <strong>
                                                    {number(
                                                        result.totalRows,
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                        <span>
                          Импортировано
                        </span>

                                                <strong>
                                                    {number(
                                                        result.importedRows,
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                        <span>
                          Пропущено
                        </span>

                                                <strong>
                                                    {number(
                                                        result.skippedRows,
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                        <span>
                          Ошибок
                        </span>

                                                <strong>
                                                    {number(
                                                        result.errors.length,
                                                    )}
                                                </strong>
                                            </div>
                                        </div>

                                        <div className="form-actions">
                                            <Button
                                                variant="secondary"
                                                onClick={reset}
                                            >
                                                Выбрать другой файл
                                            </Button>

                                            <LinkButton
                                                to="/sales"
                                            >
                                                К продажам
                                                <ArrowRight
                                                    size={16}
                                                />
                                            </LinkButton>
                                        </div>
                                    </div>
                                )
                                : loading
                                    ? (
                                        <div className="upload-processing">
                                            <FileSpreadsheet
                                                size={36}
                                                strokeWidth={
                                                    1.3
                                                }
                                            />

                                            <h2 className="file-name">
                                                {file?.name}
                                            </h2>

                                            <Signal text="Обрабатываем файл..." />

                                            <p className="muted">
                                                Файл передан Backend.
                                                Выполняется проверка
                                                и сохранение строк.
                                            </p>
                                        </div>
                                    )
                                    : (
                                        <>
                                            <div
                                                className={`upload-zone ${
                                                    drag
                                                        ? 'drag-active'
                                                        : ''
                                                } ${
                                                    file
                                                        ? 'has-file'
                                                        : ''
                                                }`}
                                                onDragOver={
                                                    event => {
                                                        event.preventDefault()
                                                        setDrag(true)
                                                    }
                                                }
                                                onDragLeave={
                                                    event => {
                                                        if (
                                                            !event
                                                                .currentTarget
                                                                .contains(
                                                                    event.relatedTarget as Node,
                                                    )
                                                    ) {
                                                            setDrag(
                                                                false,
                                                            )
                                                        }
                                                    }
                                                }
                                                onDrop={drop}
                                            >
                                                {file
                                                    ? (
                                                        <>
                                                            <div className="file-selected">
                                                                <FileSpreadsheet
                                                                    size={30}
                                                                    strokeWidth={
                                                                        1.5
                                                                    }
                                                                />

                                                                <div>
                                                                    <strong className="file-name">
                                                                        {
                                                                            file.name
                                                                        }
                                                                    </strong>

                                                                    <span>
                                    {number(
                                        file.size
                                        / 1024,
                                        1,
                                    )}{' '}
                                                                        КБ · Файл выбран
                                  </span>
                                                                </div>

                                                                <button
                                                                    className="icon-btn"
                                                                    aria-label="Убрать выбранный файл"
                                                                    onClick={
                                                                        reset
                                                                    }
                                                                >
                                                                    <X
                                                                        size={
                                                                            18
                                                                        }
                                                                    />
                                                                </button>
                                                            </div>

                                                            <Button
                                                                variant="secondary"
                                                                onClick={() =>
                                                                    input
                                                                        .current
                                                                        ?.click()
                                                                }
                                                            >
                                                                Заменить файл
                                                            </Button>
                                                        </>
                                                    )
                                                    : (
                                                        <>
                                                            <div className="upload-icon">
                                                                <Upload
                                                                    size={28}
                                                                    strokeWidth={
                                                                        1.5
                                                                    }
                                                                />
                                                            </div>

                                                            <h2>
                                                                {drag
                                                                    ? 'Отпустите файл здесь'
                                                                    : 'Перетащите CSV-файл сюда'}
                                                            </h2>

                                                            <p>
                                                                или выберите
                                                                его на устройстве
                                                            </p>

                                                            <Button
                                                                variant="secondary"
                                                                onClick={() =>
                                                                    input
                                                                        .current
                                                                        ?.click()
                                                                }
                                                            >
                                                                <FileSpreadsheet
                                                                    size={16}
                                                                />
                                                                Выбрать CSV
                                                            </Button>

                                                            <span className="field-hint">
                                Один файл · до 10 МБ
                              </span>
                                                        </>
                                                    )}
                                            </div>

                                            {(selectionMessage
                                                || requestMessage) && (
                                                <div
                                                    className="inline-error"
                                                    role="alert"
                                                >
                                                    <AlertTriangle
                                                        size={18}
                                                    />

                                                    <span>
                            {selectionMessage
                                || requestMessage}
                          </span>
                                                </div>
                                            )}

                                            <div className="upload-actions">
                        <span className="muted">
                          Файл будет передан
                          на Backend для проверки
                          и сохранения.
                        </span>

                                                <Button
                                                    disabled={
                                                        !file
                                                        || loading
                                                        || Boolean(
                                                            selectionError,
                                                        )
                                                    }
                                                    onClick={run}
                                                >
                                                    <Upload
                                                        size={16}
                                                    />

                                                    {error
                                                        ? 'Повторить импорт'
                                                        : 'Импортировать'}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                        </motion.div>
                    </AnimatePresence>

                    {result
                        && result.errors.length > 0 && (
                            <section className="import-errors">
                                <SectionTitle
                                    aside={
                                        <Badge tone="warning">
                                            {
                                                result.errors
                                                    .length
                                            }{' '}
                                            ошибок
                                        </Badge>
                                    }
                                >
                                    Ошибки в строках
                                </SectionTitle>

                                <p className="muted">
                                    Исправьте указанные строки
                                    в исходном CSV и повторите
                                    импорт.
                                </p>

                                <div className="desktop-table table-wrap">
                                    <table>
                                        <caption className="sr-only">
                                            Ошибки импорта CSV
                                        </caption>

                                        <thead>
                                        <tr>
                                            <th>
                                                Строка
                                            </th>

                                            <th>
                                                Код
                                            </th>

                                            <th>
                                                Причина
                                            </th>
                                        </tr>
                                        </thead>

                                        <tbody>
                                        {result.errors.map(
                                            (
                                                item,
                                                index,
                                            ) => (
                                                <tr
                                                    key={
                                                        `${item.row}-${item.code}-${index}`
                                                    }
                                                >
                                                    <td className="mono">
                                                        {
                                                            item.row
                                                        }
                                                    </td>

                                                    <td className="mono muted">
                                                        {
                                                            item.code
                                                        }
                                                    </td>

                                                    <td>
                                                        {getRowErrorMessage(
                                                            item,
                                                        )}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mobile-records">
                                    {result.errors.map(
                                        (
                                            item,
                                            index,
                                        ) => (
                                            <details
                                                className="record-card"
                                                key={
                                                    `${item.row}-${item.code}-${index}`
                                                }
                                            >
                                                <summary>
                                                    <strong>
                                                        Строка{' '}
                                                        {item.row}
                                                    </strong>

                                                    <p>
                                                        {getRowErrorMessage(
                                                            item,
                                                        )}
                                                    </p>
                                                </summary>

                                                <dl className="record-details">
                                                    <div>
                                                        <dt>
                                                            Код
                                                        </dt>

                                                        <dd className="mono">
                                                            {
                                                                item.code
                                                            }
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </details>
                                        ),
                                    )}
                                </div>
                            </section>
                        )}
                </section>

                <aside className="import-guide">
          <span className="eyebrow">
            ПОДГОТОВКА ФАЙЛА
          </span>

                    <h2>
                        Три столбца.
                        <br />
                        Вся история спроса.
                    </h2>

                    <ol>
                        <li>
                            <strong>
                                product_sku
                            </strong>

                            <span>
                SKU существующего товара
                из каталога
              </span>
                        </li>

                        <li>
                            <strong>
                                date
                            </strong>

                            <span>
                Дата в формате
                ГГГГ-ММ-ДД
              </span>
                        </li>

                        <li>
                            <strong>
                                quantity
                            </strong>

                            <span>
                Целое неотрицательное
                количество
              </span>
                        </li>
                    </ol>

                    <div className="csv-example">
            <span>
              Заголовок
            </span>

                        <code>
                            product_sku,date,quantity
                        </code>
                    </div>

                    <div className="csv-example">
            <span>
              Пример строки
            </span>

                        <code>
                            NB-001,2026-08-31,54
                        </code>
                    </div>

                    <div className="plain-note">
                        <Info size={17} />

                        <p>
                            SKU должен уже существовать
                            в каталоге. Для одного товара
                            и одной даты допускается
                            только одна запись.
                        </p>
                    </div>
                </aside>
            </div>
        </>
    )
}