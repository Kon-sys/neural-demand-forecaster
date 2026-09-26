import {
    useDeferredValue,
    useState,
} from 'react'

import {
    ChevronLeft,
    ChevronRight,
    LockKeyhole,
    LockKeyholeOpen,
    Pencil,
    Search,
    ShieldCheck,
    UserRound,
    UsersRound,
    X,
} from 'lucide-react'

import {
    useAuth,
} from '@/features/auth/model/useAuth'

import {
    useAdminUsers,
} from '@/features/admin/model/useAdminUsers'

import {
    useOrganization,
} from '@/features/admin/model/useOrganization'

import {
    useStore,
} from '@/app/store-context'

import {
    isApiError,
} from '@/shared/api/api-error'

import type {
    AdminUser,
    AdminUserRole,
    AdminUserStatus,
} from '@/entities/admin-user/model/types'

import {
    Button,
} from '@/components/ui/button'

import {
    Badge,
    Field,
    PageHeader,
} from '@/components/ui/primitives'

import {
    Overlay,
} from '@/components/ui/overlay'

import {
    EmptyState,
} from '@/components/feedback/States'

const PAGE_SIZE = 20

interface UserEditDraft {
    id: string
    departmentId: string | null
    positionId: string | null
    role: AdminUserRole
    status: AdminUserStatus
}

function roleLabel(
    role: AdminUserRole,
): string {
    return role === 'ADMIN'
        ? 'Администратор'
        : 'Пользователь'
}

function statusLabel(
    status: AdminUserStatus,
): string {
    return status === 'ACTIVE'
        ? 'Активен'
        : 'Заблокирован'
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
        case 'SELF_ADMIN_RESTRICTION':
            return 'Нельзя изменить собственную роль или заблокировать свою учётную запись.'

        case 'LAST_ACTIVE_ADMIN':
            return 'В системе должен остаться хотя бы один активный администратор.'

        case 'POSITION_INACTIVE':
            return 'Нельзя назначить неактивную должность.'

        case 'DEPARTMENT_INACTIVE':
            return 'Подразделение выбранной должности неактивно.'

        case 'RESOURCE_NOT_FOUND':
            return 'Пользователь или должность больше не существует.'

        default:
            return error.message
    }
}

function UserAvatar({
                        item,
                        className = 'user-avatar-small',
                    }: {
    item: AdminUser
    className?: string
}) {
    const initials =
        item.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(
                0,
                2,
            )
            .map(
                part =>
                    part[0],
            )
            .join('')
            .toUpperCase()

    return (
        <span className={className}>
            {item.avatarUrl
                ? (
                    <img
                        src={item.avatarUrl}
                        alt=""
                    />
                )
                : (
                    initials
                    || (
                        <UserRound
                            size={16}
                        />
                    )
                )}
        </span>
    )
}

export function UsersPage() {
    const [departmentFilter, setDepartmentFilter] = useState('')
    const [positionFilter, setPositionFilter] = useState('')
    const {
        user,
    } = useAuth()

    const {
        notify,
    } = useStore()

    const {
        departments,
        positions,
        loading:
            organizationLoading,
        error:
            organizationError,
    } = useOrganization()

    const [
        query,
        setQuery,
    ] = useState(
        '',
    )

    const deferredQuery =
        useDeferredValue(
            query,
        )

    const [
        role,
        setRole,
    ] = useState<
        'ALL'
        | AdminUserRole
    >(
        'ALL',
    )

    const [
        status,
        setStatus,
    ] = useState<
        'ALL'
        | AdminUserStatus
    >(
        'ALL',
    )

    const [
        page,
        setPage,
    ] = useState(
        0,
    )

    const [
        editing,
        setEditing,
    ] = useState<UserEditDraft | null>(
        null,
    )

    const [
        busy,
        setBusy,
    ] = useState(
        false,
    )

    const [
        formError,
        setFormError,
    ] = useState<string | null>(
        null,
    )

    const {
        data,
        users,
        loading,
        error,
        summary,
        summaryLoading,
        updateUser,
    } = useAdminUsers({
        departmentId: departmentFilter || undefined,
        positionId: positionFilter || undefined,
        search:
            deferredQuery.trim()
            || undefined,

        role:
            role === 'ALL'
                ? undefined
                : role,

        status:
            status === 'ALL'
                ? undefined
                : status,

        page,

        size:
        PAGE_SIZE,
    })

    const hasFilters =
        !!departmentFilter || !!positionFilter ||
        query.length > 0
        || role !== 'ALL'
        || status !== 'ALL'

    const totalPages =
        data?.totalPages
        ?? 0

    const totalElements =
        data?.totalElements
        ?? 0

    function resetFilters() {
        setDepartmentFilter('')
        setPositionFilter('')
        setQuery(
            '',
        )

        setRole(
            'ALL',
        )

        setStatus(
            'ALL',
        )

        setPage(
            0,
        )
    }

    function openEdit(
        item: AdminUser,
    ) {
        setFormError(
            null,
        )

        setEditing({
            id:
            item.id,

            departmentId:
            item.departmentId,

            positionId:
            item.positionId,

            role:
            item.role,

            status:
            item.status,
        })
    }

    async function save() {
        if (!editing) {
            return
        }

        if (
            editing.departmentId
            && !editing.positionId
        ) {
            setFormError(
                'Выберите должность для подразделения либо оставьте организационное назначение пустым.',
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
            await updateUser(
                editing.id,
                {
                    positionId:
                    editing.positionId,

                    role:
                    editing.role,

                    status:
                    editing.status,
                },
            )

            setEditing(
                null,
            )

            notify(
                'Данные пользователя обновлены',
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

    async function toggle(
        item: AdminUser,
    ) {
        setBusy(
            true,
        )

        try {
            await updateUser(
                item.id,
                {
                    status:
                        item.status
                        === 'ACTIVE'
                            ? 'BLOCKED'
                            : 'ACTIVE',
                },
            )

            notify(
                item.status === 'ACTIVE'
                    ? 'Пользователь заблокирован'
                    : 'Доступ пользователя восстановлен',
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

    function actions(
        item: AdminUser,
    ) {
        const self =
            item.id === user?.id

        const lastActiveAdmin =
            item.role === 'ADMIN'
            && item.status === 'ACTIVE'
            && summary.activeAdmins === 1

        const accessLocked =
            self
            || lastActiveAdmin

        return (
            <div className="row-actions">
                <button
                    className="icon-btn"
                    title="Редактировать"
                    aria-label={
                        `Редактировать ${item.name}`
                    }
                    onClick={
                        () =>
                            openEdit(
                                item,
                            )
                    }
                >
                    <Pencil size={16} />
                </button>

                <button
                    className={
                        `icon-btn ${
                            item.status === 'ACTIVE'
                            && !accessLocked
                                ? 'danger-text'
                                : ''
                        }`
                    }
                    disabled={
                        accessLocked
                        || busy
                    }
                    title={
                        self
                            ? 'Нельзя изменить доступ своей учётной записи'
                            : lastActiveAdmin
                                ? 'Нельзя заблокировать последнего активного администратора'
                                : item.status === 'ACTIVE'
                                    ? 'Заблокировать'
                                    : 'Разблокировать'
                    }
                    onClick={
                        () =>
                            toggle(
                                item,
                            )
                    }
                >
                    {item.status === 'ACTIVE'
                        ? (
                            <LockKeyhole
                                size={16}
                            />
                        )
                        : (
                            <LockKeyholeOpen
                                size={16}
                            />
                        )}
                </button>
            </div>
        )
    }

    const initialLoading =
        loading
        || organizationLoading

    const pageError =
        error
        ?? organizationError

    return (
        <>
            <PageHeader
                eyebrow="АДМИНИСТРИРОВАНИЕ"
                title="Пользователи"
                description="Реальные учётные записи системы, роли, доступ и организационные назначения."
            />

            <div
                className="user-metrics"
                aria-label="Сводка по пользователям"
            >
                <div>
                    <span>
                        Всего пользователей
                    </span>

                    <strong>
                        {
                            summaryLoading
                                ? '—'
                                : summary.total
                        }
                    </strong>

                    <UsersRound size={18} />
                </div>

                <div>
                    <span>
                        Активные
                    </span>

                    <strong>
                        {
                            summaryLoading
                                ? '—'
                                : summary.active
                        }
                    </strong>

                    <UserRound size={18} />
                </div>

                <div>
                    <span>
                        Администраторы
                    </span>

                    <strong>
                        {
                            summaryLoading
                                ? '—'
                                : summary.activeAdmins
                        }
                    </strong>

                    <ShieldCheck size={18} />
                </div>

                <div>
                    <span>
                        Заблокированы
                    </span>

                    <strong>
                        {
                            summaryLoading
                                ? '—'
                                : summary.blocked
                        }
                    </strong>

                    <LockKeyhole size={18} />
                </div>
            </div>

            <div className="users-toolbar">
                <div className="search-field">
                    <Search size={18} />

                    <label
                        className="sr-only"
                        htmlFor="user-search"
                    >
                        Поиск пользователей
                    </label>

                    <input
                        id="user-search"
                        placeholder="Имя или электронная почта"
                        value={query}
                        onChange={
                            event => {
                                setQuery(
                                    event.target.value,
                                )

                                setPage(
                                    0,
                                )
                            }
                        }
                    />

                    {query && (
                        <button
                            className="icon-btn"
                            aria-label="Очистить поиск"
                            onClick={
                                () => {
                                    setQuery(
                                        '',
                                    )

                                    setPage(
                                        0,
                                    )
                                }
                            }
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                <label className="compact-filter">
                    <span>
                        Роль
                    </span>

                    <select
                        value={role}
                        onChange={
                            event => {
                                setRole(
                                    event.target.value as 'ALL' | AdminUserRole,
                            )

                                setPage(
                                    0,
                                )
                            }
                        }
                    >
                        <option value="ALL">
                            Все роли
                        </option>

                        <option value="USER">
                            Пользователь
                        </option>

                        <option value="ADMIN">
                            Администратор
                        </option>
                    </select>
                </label>

                <label className="compact-filter">
                    <span>
                        Статус
                    </span>

                    <select
                        value={status}
                        onChange={
                            event => {
                                setStatus(
                                    event.target.value as 'ALL' | AdminUserStatus,
                            )

                                setPage(
                                    0,
                                )
                            }
                        }
                    >
                        <option value="ALL">
                            Все статусы
                        </option>

                        <option value="ACTIVE">
                            Активные
                        </option>

                        <option value="BLOCKED">
                            Заблокированные
                        </option>
                    </select>
                </label>

                <label className="compact-filter"><span>Подразделение</span><select value={departmentFilter} onChange={event => { setDepartmentFilter(event.target.value); setPositionFilter(''); setPage(0) }}><option value="">Все подразделения</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="compact-filter"><span>Должность</span><select value={positionFilter} onChange={event => { setPositionFilter(event.target.value); setPage(0) }}><option value="">Все должности</option>{positions.filter(item => !departmentFilter || item.departmentId === departmentFilter).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                {hasFilters && (
                    <Button
                        variant="ghost"
                        onClick={
                            resetFilters
                        }
                    >
                        Сбросить
                    </Button>
                )}
            </div>

            {initialLoading && (
                <div
                    className="plain-note"
                    aria-busy="true"
                >
                    Загружаем пользователей…
                </div>
            )}

            {!initialLoading
                && pageError
                && (
                    <div
                        className="inline-error"
                        role="alert"
                    >
                        {
                            pageError.message
                        }
                    </div>
                )}

            {!initialLoading
                && !pageError
                && users.length > 0
                && (
                    <>
                        <div className="table-caption">
                            <span>
                                Учётные записи
                            </span>

                            <span>
                                Найдено {
                                totalElements
                            }
                            </span>
                        </div>

                        <div className="table-wrap desktop-table">
                            <table>
                                <caption className="sr-only">
                                    Список пользователей
                                </caption>

                                <thead>
                                <tr>
                                    <th>
                                        Пользователь
                                    </th>

                                    <th>
                                        Роль
                                    </th>

                                    <th>
                                        Статус
                                    </th>

                                    <th>
                                        Подразделение
                                    </th>

                                    <th>
                                        Должность
                                    </th>

                                    <th className="align-right">
                                        Действия
                                    </th>
                                </tr>
                                </thead>

                                <tbody>
                                {users.map(
                                    item => (
                                        <tr
                                            key={item.id}
                                            className={
                                                item.status
                                                === 'BLOCKED'
                                                    ? 'user-row-blocked'
                                                    : undefined
                                            }
                                        >
                                            <td>
                                                <div className="user-cell">
                                                    <UserAvatar
                                                        item={item}
                                                    />

                                                    <div>
                                                        <strong>
                                                            {
                                                                item.name
                                                            }

                                                            {item.id === user?.id && (
                                                                <span className="self-label">
                                                                        Вы
                                                                    </span>
                                                            )}
                                                        </strong>

                                                        <span>
                                                                {
                                                                    item.email
                                                                }
                                                            </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <Badge tone="neutral">
                                                    {
                                                        roleLabel(
                                                            item.role,
                                                        )
                                                    }
                                                </Badge>
                                            </td>

                                            <td>
                                                <Badge
                                                    tone={
                                                        item.status === 'ACTIVE'
                                                            ? 'success'
                                                            : 'danger'
                                                    }
                                                >
                                                    {
                                                        statusLabel(
                                                            item.status,
                                                        )
                                                    }
                                                </Badge>
                                            </td>

                                            <td>
                                                {
                                                    item.departmentName
                                                    ?? 'Не назначено'
                                                }
                                            </td>

                                            <td>
                                                {
                                                    item.positionName
                                                    ?? 'Не назначено'
                                                }
                                            </td>

                                            <td>
                                                {
                                                    actions(
                                                        item,
                                                    )
                                                }
                                            </td>
                                        </tr>
                                    ),
                                )}
                                </tbody>
                            </table>
                        </div>

                        <div className="mobile-records">
                            {users.map(
                                item => (
                                    <article
                                        key={item.id}
                                        className={
                                            `record-card user-record ${
                                                item.status === 'BLOCKED'
                                                    ? 'user-row-blocked'
                                                    : ''
                                            }`
                                        }
                                    >
                                        <div className="record-heading">
                                            <Badge
                                                tone={
                                                    item.status === 'ACTIVE'
                                                        ? 'success'
                                                        : 'danger'
                                                }
                                            >
                                                {
                                                    statusLabel(
                                                        item.status,
                                                    )
                                                }
                                            </Badge>

                                            {
                                                actions(
                                                    item,
                                                )
                                            }
                                        </div>

                                        <div className="user-card-heading">
                                            <UserAvatar
                                                item={item}
                                            />

                                            <div>
                                                <h3>
                                                    {
                                                        item.name
                                                    }

                                                    {item.id === user?.id && (
                                                        <span className="self-label">
                                                            Вы
                                                        </span>
                                                    )}
                                                </h3>

                                                <p>
                                                    {
                                                        item.email
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        <dl className="record-details">
                                            <div>
                                                <dt>
                                                    Роль
                                                </dt>

                                                <dd>
                                                    {
                                                        roleLabel(
                                                            item.role,
                                                        )
                                                    }
                                                </dd>
                                            </div>

                                            <div>
                                                <dt>
                                                    Подразделение
                                                </dt>

                                                <dd>
                                                    {
                                                        item.departmentName
                                                        ?? 'Не назначено'
                                                    }
                                                </dd>
                                            </div>

                                            <div>
                                                <dt>
                                                    Должность
                                                </dt>

                                                <dd>
                                                    {
                                                        item.positionName
                                                        ?? 'Не назначено'
                                                    }
                                                </dd>
                                            </div>
                                        </dl>
                                    </article>
                                ),
                            )}
                        </div>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <Button
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

            {!initialLoading
                && !pageError
                && users.length === 0
                && (
                    <EmptyState
                        title="Пользователи не найдены"
                        description="Измените поисковый запрос или параметры фильтрации."
                        action={
                            hasFilters
                                ? (
                                    <Button
                                        variant="secondary"
                                        onClick={
                                            resetFilters
                                        }
                                    >
                                        Сбросить фильтры
                                    </Button>
                                )
                                : undefined
                        }
                    />
                )}

            {editing && (() => {
                const original =
                    users.find(
                        item =>
                            item.id === editing.id,
                    )

                if (!original) {
                    return null
                }

                const self =
                    editing.id === user?.id

                const lastActiveAdmin =
                    original.role === 'ADMIN'
                    && original.status === 'ACTIVE'
                    && summary.activeAdmins === 1

                const accessLocked =
                    self
                    || lastActiveAdmin

                const availableDepartments =
                    departments.filter(
                        item =>
                            item.isActive
                            || item.id
                            === editing.departmentId,
                    )

                const availablePositions =
                    positions.filter(
                        item =>
                            item.departmentId
                            === editing.departmentId
                            && (
                                item.isActive
                                || item.id
                                === editing.positionId
                            ),
                    )

                return (
                    <Overlay
                        title="Настройки пользователя"
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
                        <div className="user-edit-intro">
                            <UserAvatar
                                item={original}
                            />

                            <div>
                                <strong>
                                    {
                                        original.name
                                    }
                                </strong>

                                <span>
                                    {
                                        original.email
                                    }
                                </span>
                            </div>

                            <Badge tone="neutral">
                                Личные данные
                            </Badge>
                        </div>

                        <p className="profile-section-description">
                            Имя, электронная почта и фотография
                            изменяются самим пользователем.
                            Администратор управляет ролью,
                            доступом и организационным назначением.
                        </p>

                        <div className="user-edit-grid">
                            <Field
                                label="Подразделение"
                                htmlFor="edit-user-department"
                                hint="Подразделение используется для фильтрации доступных должностей."
                            >
                                <select
                                    id="edit-user-department"
                                    value={
                                        editing.departmentId
                                        ?? ''
                                    }
                                    onChange={
                                        event => {
                                            const departmentId =
                                                event.target.value
                                                || null

                                            setEditing({
                                                ...editing,

                                                departmentId,

                                                positionId:
                                                    null,
                                            })

                                            setFormError(
                                                null,
                                            )
                                        }
                                    }
                                >
                                    <option value="">
                                        Не назначено
                                    </option>

                                    {availableDepartments.map(
                                        item => (
                                            <option
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.name}
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

                            <Field
                                label="Должность"
                                htmlFor="edit-user-position"
                                hint={
                                    editing.departmentId
                                        ? 'Организационное подразделение определяется выбранной должностью.'
                                        : 'Сначала выберите подразделение.'
                                }
                            >
                                <select
                                    id="edit-user-position"
                                    value={
                                        editing.positionId
                                        ?? ''
                                    }
                                    disabled={
                                        !editing.departmentId
                                    }
                                    onChange={
                                        event => {
                                            setEditing({
                                                ...editing,

                                                positionId:
                                                    event.target.value
                                                    || null,
                                            })

                                            setFormError(
                                                null,
                                            )
                                        }
                                    }
                                >
                                    <option value="">
                                        {
                                            editing.departmentId
                                                ? 'Не выбрано'
                                                : 'Сначала выберите подразделение'
                                        }
                                    </option>

                                    {availablePositions.map(
                                        item => (
                                            <option
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.name}
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
                        </div>

                        <div className="user-edit-grid">
                            <Field
                                label="Роль"
                                htmlFor="edit-user-role"
                                hint={
                                    accessLocked
                                        ? 'Доступ этой учётной записи защищён от изменения.'
                                        : 'Роль определяет доступ к административным функциям.'
                                }
                            >
                                <select
                                    id="edit-user-role"
                                    value={
                                        editing.role
                                    }
                                    disabled={
                                        accessLocked
                                    }
                                    onChange={
                                        event =>
                                            setEditing({
                                                ...editing,

                                                role:
                                                    event.target.value as AdminUserRole,
                                            })
                                    }
                                >
                                    <option value="USER">
                                        Пользователь
                                    </option>

                                    <option value="ADMIN">
                                        Администратор
                                    </option>
                                </select>
                            </Field>

                            <Field
                                label="Статус"
                                htmlFor="edit-user-status"
                                hint={
                                    accessLocked
                                        ? 'Доступ этой учётной записи защищён от изменения.'
                                        : 'Заблокированный пользователь не сможет использовать действующий JWT.'
                                }
                            >
                                <select
                                    id="edit-user-status"
                                    value={
                                        editing.status
                                    }
                                    disabled={
                                        accessLocked
                                    }
                                    onChange={
                                        event =>
                                            setEditing({
                                                ...editing,

                                                status:
                                                    event.target.value as AdminUserStatus,
                                            })
                                    }
                                >
                                    <option value="ACTIVE">
                                        Активен
                                    </option>

                                    <option value="BLOCKED">
                                        Заблокирован
                                    </option>
                                </select>
                            </Field>
                        </div>

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
                                        : 'Сохранить'
                                }
                            </Button>
                        </div>
                    </Overlay>
                )
            })()}
        </>
    )
}
