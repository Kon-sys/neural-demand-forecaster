import {
    useMemo,
    useState,
} from 'react'

import {
    BriefcaseBusiness,
    Building2,
    Pencil,
    Plus,
    Power,
    PowerOff,
} from 'lucide-react'

import {
    useStore,
} from '@/app/store-context'

import {
    useOrganization,
} from '@/features/admin/model/useOrganization'

import {
    isApiError,
} from '@/shared/api/api-error'

import {
    Button,
} from '@/components/ui/button'

import {
    Badge,
    Field,
    PageHeader,
    SectionTitle,
} from '@/components/ui/primitives'

import {
    Overlay,
} from '@/components/ui/overlay'

import {
    EmptyState,
} from '@/components/feedback/States'

type Tab =
    | 'departments'
    | 'positions'

type EditState =
    | {
    kind: 'department'
    id: string | null
    name: string
}
    | {
    kind: 'position'
    id: string | null
    name: string
    departmentId: string
}

function normalizeName(
    value: string,
): string {
    return value
        .trim()
        .replace(
            /\s+/g,
            ' ',
        )
}

function errorMessage(
    error: unknown,
): string {
    if (!isApiError(error)) {
        return error instanceof Error
            ? error.message
            : 'Не удалось выполнить операцию'
    }

    switch (error.code) {
        case 'DEPARTMENT_ALREADY_EXISTS':
            return 'Подразделение с таким названием уже существует.'

        case 'POSITION_ALREADY_EXISTS':
            return 'В этом подразделении уже существует должность с таким названием.'

        case 'POSITION_IN_USE':
            return 'Должность нельзя перенести в другое подразделение, пока она назначена пользователям.'

        case 'DEPARTMENT_INACTIVE':
            return 'Нельзя создавать или переносить должность в неактивное подразделение.'

        case 'RESOURCE_NOT_FOUND':
            return 'Запись больше не существует.'

        default:
            return error.message
    }
}

export function OrganizationPage() {
    const {
        notify,
    } = useStore()

    const {
        departments,
        positions,
        loading,
        error,
        createDepartment,
        updateDepartment,
        createPosition,
        updatePosition,
    } = useOrganization()

    const [
        tab,
        setTab,
    ] = useState<Tab>(
        'departments',
    )

    const [
        editing,
        setEditing,
    ] = useState<EditState | null>(
        null,
    )

    const [
        formError,
        setFormError,
    ] = useState<string | null>(
        null,
    )

    const [
        busy,
        setBusy,
    ] = useState(
        false,
    )

    const positionCounts =
        useMemo(
            () => {
                const counts =
                    new Map<string, number>()

                for (
                    const position
                    of positions
                    ) {
                    counts.set(
                        position.departmentId,
                        (
                            counts.get(
                                position.departmentId,
                            )
                            ?? 0
                        ) + 1,
                    )
                }

                return counts
            },
            [
                positions,
            ],
        )

    function openCreate() {
        setFormError(
            null,
        )

        if (
            tab === 'departments'
        ) {
            setEditing({
                kind:
                    'department',

                id:
                    null,

                name:
                    '',
            })

            return
        }

        setEditing({
            kind:
                'position',

            id:
                null,

            name:
                '',

            departmentId:
                '',
        })
    }

    async function save() {
        if (!editing) {
            return
        }

        const name =
            normalizeName(
                editing.name,
            )

        if (!name) {
            setFormError(
                'Укажите название.',
            )

            return
        }

        if (
            editing.kind === 'position'
            && !editing.departmentId
        ) {
            setFormError(
                'Выберите подразделение для должности.',
            )

            return
        }

        setBusy(
            true,
        )

        setFormError(
            null,
        )

        try {
            if (
                editing.kind
                === 'department'
            ) {
                if (editing.id) {
                    await updateDepartment(
                        editing.id,
                        {
                            name,
                        },
                    )

                    notify(
                        'Подразделение обновлено',
                    )
                } else {
                    await createDepartment({
                        name,
                    })

                    notify(
                        'Подразделение добавлено',
                    )
                }
            } else {
                if (editing.id) {
                    await updatePosition(
                        editing.id,
                        {
                            name,

                            departmentId:
                            editing.departmentId,
                        },
                    )

                    notify(
                        'Должность обновлена',
                    )
                } else {
                    await createPosition({
                        name,

                        departmentId:
                        editing.departmentId,
                    })

                    notify(
                        'Должность добавлена',
                    )
                }
            }

            setEditing(
                null,
            )
        } catch (reason) {
            setFormError(
                errorMessage(
                    reason,
                ),
            )
        } finally {
            setBusy(
                false,
            )
        }
    }

    async function toggleDepartment(
        id: string,
        isActive: boolean,
    ) {
        setBusy(
            true,
        )

        try {
            await updateDepartment(
                id,
                {
                    isActive:
                        !isActive,
                },
            )

            notify(
                isActive
                    ? 'Подразделение деактивировано'
                    : 'Подразделение активировано',
            )
        } catch (reason) {
            notify(
                errorMessage(
                    reason,
                ),
            )
        } finally {
            setBusy(
                false,
            )
        }
    }

    async function togglePosition(
        id: string,
        isActive: boolean,
    ) {
        setBusy(
            true,
        )

        try {
            await updatePosition(
                id,
                {
                    isActive:
                        !isActive,
                },
            )

            notify(
                isActive
                    ? 'Должность деактивирована'
                    : 'Должность активирована',
            )
        } catch (reason) {
            notify(
                errorMessage(
                    reason,
                ),
            )
        } finally {
            setBusy(
                false,
            )
        }
    }

    if (loading) {
        return (
            <>
                <PageHeader
                    eyebrow="АДМИНИСТРИРОВАНИЕ"
                    title="Оргструктура"
                    description="Подразделения и должности из базы данных."
                />

                <div
                    className="plain-note"
                    aria-busy="true"
                >
                    Загружаем организационную структуру…
                </div>
            </>
        )
    }

    if (error) {
        return (
            <>
                <PageHeader
                    eyebrow="АДМИНИСТРИРОВАНИЕ"
                    title="Оргструктура"
                    description="Подразделения и должности из базы данных."
                />

                <div
                    className="inline-error"
                    role="alert"
                >
                    {error.message}
                </div>
            </>
        )
    }

    return (
        <>
            <PageHeader
                eyebrow="АДМИНИСТРИРОВАНИЕ"
                title="Оргструктура"
                description="Реальные справочники подразделений и должностей, используемые в профилях пользователей."
            />

            <div
                className="organization-tabs"
                role="tablist"
                aria-label="Разделы оргструктуры"
            >
                <button
                    role="tab"
                    aria-selected={
                        tab === 'departments'
                    }
                    className={
                        `organization-tab ${
                            tab === 'departments'
                                ? 'active'
                                : ''
                        }`
                    }
                    onClick={
                        () =>
                            setTab(
                                'departments',
                            )
                    }
                >
                    <Building2 size={17} />

                    Подразделения

                    <span>
                        {
                            departments.length
                        }
                    </span>
                </button>

                <button
                    role="tab"
                    aria-selected={
                        tab === 'positions'
                    }
                    className={
                        `organization-tab ${
                            tab === 'positions'
                                ? 'active'
                                : ''
                        }`
                    }
                    onClick={
                        () =>
                            setTab(
                                'positions',
                            )
                    }
                >
                    <BriefcaseBusiness size={17} />

                    Должности

                    <span>
                        {
                            positions.length
                        }
                    </span>
                </button>
            </div>

            <section
                className="organization-panel"
                role="tabpanel"
            >
                {tab === 'departments'
                    ? (
                        <>
                            <SectionTitle
                                aside={
                                    <Button
                                        onClick={
                                            openCreate
                                        }
                                    >
                                        <Plus size={16} />
                                        Добавить подразделение
                                    </Button>
                                }
                            >
                                Подразделения
                            </SectionTitle>

                            <p className="organization-description">
                                Подразделения являются родительскими сущностями
                                для должностей. Деактивация не удаляет уже
                                существующие данные.
                            </p>

                            {departments.length > 0
                                ? (
                                    <div className="table-wrap desktop-table">
                                        <table>
                                            <caption className="sr-only">
                                                Справочник подразделений
                                            </caption>

                                            <thead>
                                            <tr>
                                                <th>
                                                    Название
                                                </th>

                                                <th>
                                                    Статус
                                                </th>

                                                <th className="align-right">
                                                    Действия
                                                </th>
                                            </tr>
                                            </thead>

                                            <tbody>
                                            {departments.map(
                                                item => (
                                                    <tr
                                                        key={item.id}
                                                        className={
                                                            !item.isActive
                                                                ? 'dictionary-row-inactive'
                                                                : undefined
                                                        }
                                                    >
                                                        <td>
                                                            <strong>
                                                                {
                                                                    item.name
                                                                }
                                                            </strong>

                                                            <span className="cell-secondary">
                                                                    Должностей: {
                                                                positionCounts.get(
                                                                    item.id,
                                                                )
                                                                ?? 0
                                                            }
                                                                </span>
                                                        </td>

                                                        <td>
                                                            <Badge
                                                                tone={
                                                                    item.isActive
                                                                        ? 'success'
                                                                        : 'neutral'
                                                                }
                                                            >
                                                                {
                                                                    item.isActive
                                                                        ? 'Активно'
                                                                        : 'Неактивно'
                                                                }
                                                            </Badge>
                                                        </td>

                                                        <td>
                                                            <div className="row-actions">
                                                                <button
                                                                    className="icon-btn"
                                                                    title="Редактировать"
                                                                    aria-label={
                                                                        `Редактировать ${item.name}`
                                                                    }
                                                                    onClick={
                                                                        () => {
                                                                            setFormError(
                                                                                null,
                                                                            )

                                                                            setEditing({
                                                                                kind:
                                                                                    'department',

                                                                                id:
                                                                                item.id,

                                                                                name:
                                                                                item.name,
                                                                            })
                                                                        }
                                                                    }
                                                                >
                                                                    <Pencil size={16} />
                                                                </button>

                                                                <button
                                                                    className={
                                                                        `icon-btn ${
                                                                            item.isActive
                                                                                ? 'danger-text'
                                                                                : ''
                                                                        }`
                                                                    }
                                                                    disabled={busy}
                                                                    title={
                                                                        item.isActive
                                                                            ? 'Деактивировать'
                                                                            : 'Активировать'
                                                                    }
                                                                    aria-label={
                                                                        `${
                                                                            item.isActive
                                                                                ? 'Деактивировать'
                                                                                : 'Активировать'
                                                                        } ${item.name}`
                                                                    }
                                                                    onClick={
                                                                        () =>
                                                                            toggleDepartment(
                                                                                item.id,
                                                                                item.isActive,
                                                                            )
                                                                    }
                                                                >
                                                                    {
                                                                        item.isActive
                                                                            ? (
                                                                                <PowerOff size={16} />
                                                                            )
                                                                            : (
                                                                                <Power size={16} />
                                                                            )
                                                                    }
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                                : (
                                    <EmptyState
                                        title="Подразделений пока нет"
                                        description="Добавьте первое подразделение."
                                        action={
                                            <Button
                                                onClick={
                                                    openCreate
                                                }
                                            >
                                                Добавить подразделение
                                            </Button>
                                        }
                                    />
                                )}
                        </>
                    )
                    : (
                        <>
                            <SectionTitle
                                aside={
                                    <Button
                                        onClick={
                                            openCreate
                                        }
                                    >
                                        <Plus size={16} />
                                        Добавить должность
                                    </Button>
                                }
                            >
                                Должности
                            </SectionTitle>

                            <p className="organization-description">
                                Каждая должность относится к конкретному
                                подразделению. Одинаковые названия допустимы
                                в разных подразделениях.
                            </p>

                            {positions.length > 0
                                ? (
                                    <div className="table-wrap desktop-table">
                                        <table>
                                            <caption className="sr-only">
                                                Справочник должностей
                                            </caption>

                                            <thead>
                                            <tr>
                                                <th>
                                                    Название
                                                </th>

                                                <th>
                                                    Подразделение
                                                </th>

                                                <th>
                                                    Статус
                                                </th>

                                                <th className="align-right">
                                                    Действия
                                                </th>
                                            </tr>
                                            </thead>

                                            <tbody>
                                            {positions.map(
                                                item => (
                                                    <tr
                                                        key={item.id}
                                                        className={
                                                            !item.isActive
                                                                ? 'dictionary-row-inactive'
                                                                : undefined
                                                        }
                                                    >
                                                        <td>
                                                            <strong>
                                                                {
                                                                    item.name
                                                                }
                                                            </strong>
                                                        </td>

                                                        <td>
                                                            {
                                                                item.departmentName
                                                            }
                                                        </td>

                                                        <td>
                                                            <Badge
                                                                tone={
                                                                    item.isActive
                                                                        ? 'success'
                                                                        : 'neutral'
                                                                }
                                                            >
                                                                {
                                                                    item.isActive
                                                                        ? 'Активно'
                                                                        : 'Неактивно'
                                                                }
                                                            </Badge>
                                                        </td>

                                                        <td>
                                                            <div className="row-actions">
                                                                <button
                                                                    className="icon-btn"
                                                                    title="Редактировать"
                                                                    aria-label={
                                                                        `Редактировать ${item.name}`
                                                                    }
                                                                    onClick={
                                                                        () => {
                                                                            setFormError(
                                                                                null,
                                                                            )

                                                                            setEditing({
                                                                                kind:
                                                                                    'position',

                                                                                id:
                                                                                item.id,

                                                                                name:
                                                                                item.name,

                                                                                departmentId:
                                                                                item.departmentId,
                                                                            })
                                                                        }
                                                                    }
                                                                >
                                                                    <Pencil size={16} />
                                                                </button>

                                                                <button
                                                                    className={
                                                                        `icon-btn ${
                                                                            item.isActive
                                                                                ? 'danger-text'
                                                                                : ''
                                                                        }`
                                                                    }
                                                                    disabled={busy}
                                                                    title={
                                                                        item.isActive
                                                                            ? 'Деактивировать'
                                                                            : 'Активировать'
                                                                    }
                                                                    aria-label={
                                                                        `${
                                                                            item.isActive
                                                                                ? 'Деактивировать'
                                                                                : 'Активировать'
                                                                        } ${item.name}`
                                                                    }
                                                                    onClick={
                                                                        () =>
                                                                            togglePosition(
                                                                                item.id,
                                                                                item.isActive,
                                                                            )
                                                                    }
                                                                >
                                                                    {
                                                                        item.isActive
                                                                            ? (
                                                                                <PowerOff size={16} />
                                                                            )
                                                                            : (
                                                                                <Power size={16} />
                                                                            )
                                                                    }
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                                : (
                                    <EmptyState
                                        title="Должностей пока нет"
                                        description="Добавьте первую должность."
                                        action={
                                            <Button
                                                onClick={
                                                    openCreate
                                                }
                                            >
                                                Добавить должность
                                            </Button>
                                        }
                                    />
                                )}
                        </>
                    )}
            </section>

            {editing && (
                <Overlay
                    title={
                        editing.id
                            ? editing.kind === 'department'
                                ? 'Редактировать подразделение'
                                : 'Редактировать должность'
                            : editing.kind === 'department'
                                ? 'Новое подразделение'
                                : 'Новая должность'
                    }
                    onClose={
                        () => {
                            if (!busy) {
                                setEditing(
                                    null,
                                )
                            }
                        }
                    }
                >
                    <Field
                        label="Название"
                        htmlFor="dictionary-name"
                    >
                        <input
                            id="dictionary-name"
                            autoFocus
                            value={
                                editing.name
                            }
                            onChange={
                                event => {
                                    setEditing({
                                        ...editing,

                                        name:
                                        event.target.value,
                                    })

                                    setFormError(
                                        null,
                                    )
                                }
                            }
                        />
                    </Field>

                    {editing.kind === 'position' && (
                        <Field
                            label="Подразделение"
                            htmlFor="position-department"
                            hint="Перенос используемой должности будет запрещён сервером."
                        >
                            <select
                                id="position-department"
                                value={
                                    editing.departmentId
                                }
                                onChange={
                                    event => {
                                        setEditing({
                                            ...editing,

                                            departmentId:
                                            event.target.value,
                                        })

                                        setFormError(
                                            null,
                                        )
                                    }
                                }
                            >
                                <option value="">
                                    Выберите подразделение
                                </option>

                                {departments
                                    .filter(
                                        item =>
                                            item.isActive
                                            || item.id
                                            === editing.departmentId,
                                    )
                                    .map(
                                        item => (
                                            <option
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {
                                                    item.name
                                                }
                                                {
                                                    item.isActive
                                                        ? ''
                                                        : ' · неактивно'
                                                }
                                            </option>
                                        ),
                                    )}
                            </select>
                        </Field>
                    )}

                    {formError && (
                        <div
                            className="inline-error"
                            role="alert"
                        >
                            {formError}
                        </div>
                    )}

                    <div className="dialog-actions">
                        <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={
                                () =>
                                    setEditing(
                                        null,
                                    )
                            }
                        >
                            Отмена
                        </Button>

                        <Button
                            disabled={busy}
                            onClick={
                                save
                            }
                        >
                            {
                                busy
                                    ? 'Сохраняем...'
                                    : editing.id
                                        ? 'Сохранить'
                                        : 'Добавить'
                            }
                        </Button>
                    </div>
                </Overlay>
            )}
        </>
    )
}