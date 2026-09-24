import { useMemo, useState } from 'react'
import { LockKeyhole, LockKeyholeOpen, Pencil, Search, ShieldCheck, UserRound, UsersRound, X } from 'lucide-react'
import { useStore, type AccountStatus, type ManagedUser, type Role } from '../../app/store-context'
import { Button } from '../../components/ui/button'
import { Badge, Field, PageHeader } from '../../components/ui/primitives'
import { Overlay } from '../../components/ui/overlay'
import { EmptyState } from '../../components/feedback/States'
import { delay } from '@/shared/lib/format'

type UserEditDraft = {
    id: string
    departmentId: string | null
    positionId: string | null
    role: Role
    status: AccountStatus
}

function roleLabel(role: Role) { return role === 'ADMIN' ? 'Администратор' : 'Пользователь' }
function statusLabel(status: AccountStatus) { return status === 'ACTIVE' ? 'Активен' : 'Заблокирован' }
function activity(value: string) { return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
function dictionaryName(dictionary: Map<string, string>, id: string | null) { return id ? dictionary.get(id) ?? 'Не назначено' : 'Не назначено' }

function UserAvatar({ item, className = 'user-avatar-small' }: { item: ManagedUser, className?: string }) {
    const initials = item.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
    return <span className={className}>{item.avatarUrl ? <img src={item.avatarUrl} alt="" /> : initials || <UserRound size={16} />}</span>
}

export function UsersPage() {
    const { users, user, departments, positions, updateManagedUser, toggleUserStatus, notify } = useStore()
    const [query, setQuery] = useState('')
    const [role, setRole] = useState<'ALL' | Role>('ALL')
    const [status, setStatus] = useState<'ALL' | AccountStatus>('ALL')
    const [editing, setEditing] = useState<UserEditDraft | null>(null)
    const [busy, setBusy] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const departmentNames = useMemo(() => new Map(departments.map(item => [item.id, item.name])), [departments])
    const positionNames = useMemo(() => new Map(positions.map(item => [item.id, item.name])), [positions])

    const filtered = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('ru')
        return users.filter(item => {
            const searchable = `${item.name} ${item.email} ${dictionaryName(departmentNames, item.departmentId)} ${dictionaryName(positionNames, item.positionId)}`.toLocaleLowerCase('ru')
            return (!needle || searchable.includes(needle)) && (role === 'ALL' || item.role === role) && (status === 'ALL' || item.status === status)
        })
    }, [query, role, status, users, departmentNames, positionNames])

    const activeAdmins = users.filter(item => item.role === 'ADMIN' && item.status === 'ACTIVE').length
    const blocked = users.filter(item => item.status === 'BLOCKED').length
    const active = users.length - blocked
    const hasFilters = !!query || role !== 'ALL' || status !== 'ALL'

    function reset() {
        setQuery('')
        setRole('ALL')
        setStatus('ALL')
    }

    function openEdit(item: ManagedUser) {
        const assignedPosition = item.positionId ? positions.find(position => position.id === item.positionId) : null
        const positionId = assignedPosition?.departmentId === item.departmentId ? item.positionId : null

        setEditing({
            id: item.id,
            departmentId: item.departmentId,
            positionId,
            role: item.role,
            status: item.status,
        })
        setErrors({})
    }

    async function save() {
        if (!editing) return
        const original = users.find(item => item.id === editing.id)
        if (!original) return

        const self = editing.id === user?.id
        const removesLastActiveAdmin = original.role === 'ADMIN' && original.status === 'ACTIVE' && activeAdmins === 1 && (editing.role !== 'ADMIN' || editing.status !== 'ACTIVE')
        const next: Record<string, string> = {}

        if (self && editing.role !== original.role) next.access = 'Нельзя изменить собственную роль через управление пользователями.'
        if (self && editing.status !== original.status) next.access = 'Нельзя заблокировать собственную учётную запись.'
        if (removesLastActiveAdmin) {
            next.access = editing.role !== 'ADMIN'
                ? 'Нельзя изменить роль последнего активного администратора.'
                : 'Нельзя заблокировать последнего активного администратора.'
        }

        setErrors(next)
        if (Object.keys(next).length) return

        setBusy(true)
        await delay(350)
        const error = updateManagedUser(editing.id, {
            departmentId: editing.departmentId,
            positionId: editing.positionId,
            role: editing.role,
            status: editing.status,
        })
        setBusy(false)

        if (error) {
            setErrors({ access: error })
            return
        }

        setEditing(null)
        notify('Данные пользователя обновлены')
    }

    async function toggle(item: ManagedUser) {
        setBusy(true)
        await delay(250)
        const error = toggleUserStatus(item.id)
        setBusy(false)
        if (error) {
            notify(error)
            return
        }
        notify(item.status === 'ACTIVE' ? 'Пользователь заблокирован' : 'Доступ пользователя восстановлен')
    }

    const actions = (item: ManagedUser) => {
        const self = item.id === user?.id
        const lastActiveAdmin = item.role === 'ADMIN' && item.status === 'ACTIVE' && activeAdmins === 1
        const accessLocked = self || lastActiveAdmin
        const accessTitle = self
            ? 'Нельзя изменить доступ своей учётной записи'
            : lastActiveAdmin
                ? 'Нельзя заблокировать последнего активного администратора'
                : item.status === 'ACTIVE' ? 'Заблокировать' : 'Разблокировать'

        return <div className="row-actions">
            <button className="icon-btn" title="Редактировать" aria-label={`Редактировать ${item.name}`} onClick={() => openEdit(item)}><Pencil size={16} /></button>
            <button className={`icon-btn ${item.status === 'ACTIVE' && !accessLocked ? 'danger-text' : ''}`} title={accessTitle} aria-label={item.status === 'ACTIVE' ? `Заблокировать ${item.name}` : `Разблокировать ${item.name}`} disabled={accessLocked || busy} onClick={() => toggle(item)}>{item.status === 'ACTIVE' ? <LockKeyhole size={16} /> : <LockKeyholeOpen size={16} />}</button>
        </div>
    }

    return <>
        <PageHeader eyebrow="АДМИНИСТРИРОВАНИЕ" title="Пользователи" description="Управление рабочими атрибутами, ролями и доступом к системе. Личные данные редактирует сам пользователь в профиле." />

        <div className="user-metrics" aria-label="Сводка по пользователям">
            <div><span>Всего пользователей</span><strong>{users.length}</strong><UsersRound size={18} /></div>
            <div><span>Активные</span><strong>{active}</strong><UserRound size={18} /></div>
            <div><span>Администраторы</span><strong>{activeAdmins}</strong><ShieldCheck size={18} /></div>
            <div><span>Заблокированы</span><strong>{blocked}</strong><LockKeyhole size={18} /></div>
        </div>

        <div className="users-toolbar">
            <div className="search-field"><Search size={18} /><label className="sr-only" htmlFor="user-search">Поиск пользователей</label><input id="user-search" placeholder="Имя, почта, должность или подразделение" value={query} onChange={event => setQuery(event.target.value)} />{query && <button className="icon-btn" aria-label="Очистить поиск" onClick={() => setQuery('')}><X size={16} /></button>}</div>
            <label className="compact-filter"><span>Роль</span><select value={role} onChange={event => setRole(event.target.value as 'ALL' | Role)}><option value="ALL">Все роли</option><option value="USER">Пользователь</option><option value="ADMIN">Администратор</option></select></label>
            <label className="compact-filter"><span>Статус</span><select value={status} onChange={event => setStatus(event.target.value as 'ALL' | AccountStatus)}><option value="ALL">Все статусы</option><option value="ACTIVE">Активные</option><option value="BLOCKED">Заблокированные</option></select></label>
            {hasFilters && <Button variant="ghost" onClick={reset}>Сбросить</Button>}
        </div>

        {filtered.length ? <>
            <div className="table-caption"><span>Учётные записи</span><span>Показано {filtered.length} из {users.length}</span></div>
            <div className="table-wrap desktop-table"><table><caption className="sr-only">Список пользователей</caption><thead><tr><th>Пользователь</th><th>Роль</th><th>Статус</th><th>Подразделение</th><th>Последняя активность</th><th className="align-right">Действия</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id} className={item.status === 'BLOCKED' ? 'user-row-blocked' : undefined}><td><div className="user-cell"><UserAvatar item={item} /><div><strong>{item.name}{item.id === user?.id && <span className="self-label">Вы</span>}</strong><span>{item.email}</span></div></div></td><td><Badge tone="neutral">{roleLabel(item.role)}</Badge></td><td><Badge tone={item.status === 'ACTIVE' ? 'success' : 'danger'}>{statusLabel(item.status)}</Badge></td><td><strong>{dictionaryName(departmentNames, item.departmentId)}</strong><span className="cell-secondary">{dictionaryName(positionNames, item.positionId)}</span></td><td>{activity(item.lastActive)}</td><td>{actions(item)}</td></tr>)}</tbody></table></div>

            <div className="mobile-records">{filtered.map(item => <article className={`record-card user-record ${item.status === 'BLOCKED' ? 'user-row-blocked' : ''}`} key={item.id}><div className="record-heading"><Badge tone={item.status === 'ACTIVE' ? 'success' : 'danger'}>{statusLabel(item.status)}</Badge>{actions(item)}</div><div className="user-card-heading"><UserAvatar item={item} /><div><h3>{item.name}{item.id === user?.id && <span className="self-label">Вы</span>}</h3><p>{item.email}</p></div></div><dl className="record-details"><div><dt>Роль</dt><dd>{roleLabel(item.role)}</dd></div><div><dt>Подразделение</dt><dd>{dictionaryName(departmentNames, item.departmentId)}</dd></div><div><dt>Должность</dt><dd>{dictionaryName(positionNames, item.positionId)}</dd></div><div><dt>Активность</dt><dd>{activity(item.lastActive)}</dd></div></dl></article>)}</div>
            <div className="table-footer">Показано {filtered.length} из {users.length} пользователей</div>
        </> : <EmptyState title="Пользователи не найдены" description="Измените поисковый запрос или параметры фильтрации." action={<Button variant="secondary" onClick={reset}>Сбросить фильтры</Button>} />}

        {editing && (() => {
            const original = users.find(item => item.id === editing.id)
            if (!original) return null

            const self = editing.id === user?.id
            const lastActiveAdmin = original.role === 'ADMIN' && original.status === 'ACTIVE' && activeAdmins === 1
            const accessLocked = self || lastActiveAdmin
            const accessHint = self
                ? 'Собственную роль и статус нельзя изменить здесь'
                : lastActiveAdmin
                    ? 'В системе должен остаться хотя бы один активный администратор'
                    : 'Роль определяет набор доступных функций, статус — возможность входа в систему'
            const departmentOptions = departments.filter(item => item.isActive || item.id === editing.departmentId)
            const positionOptions = positions.filter(item => item.departmentId === editing.departmentId && (item.isActive || item.id === editing.positionId))

            return <Overlay title="Настройки пользователя" onClose={() => { if (!busy) setEditing(null) }}>
                <div className="user-edit-intro"><UserAvatar item={original} /><div><strong>{original.name}</strong><span>{original.email}</span></div><Badge tone="neutral">Личные данные</Badge></div>
                <p className="profile-section-description">Имя, электронная почта и фотография относятся к личному профилю пользователя. Администратор изменяет только организационные атрибуты и доступ.</p>

                <div className="user-edit-grid">
                    <Field label="Подразделение" htmlFor="edit-user-department" hint="Доступны активные подразделения. Текущее неактивное значение сохраняется до замены.">
                        <select id="edit-user-department" value={editing.departmentId ?? ''} onChange={event => {
                            const departmentId = event.target.value || null
                            const departmentChanged = departmentId !== editing.departmentId

                            setEditing({
                                ...editing,
                                departmentId,
                                positionId: departmentChanged ? null : editing.positionId,
                            })
                        }}>
                            <option value="">Не назначено</option>
                            {departmentOptions.map(item => <option key={item.id} value={item.id}>{item.name}{item.isActive ? '' : ' · неактивно'}</option>)}
                        </select>
                    </Field>
                    <Field label="Должность" htmlFor="edit-user-position" hint={editing.departmentId ? 'Показаны только должности выбранного подразделения.' : 'Сначала выберите подразделение.'}>
                        <select id="edit-user-position" value={editing.positionId ?? ''} disabled={!editing.departmentId} onChange={event => {
                            setEditing({ ...editing, positionId: event.target.value || null })
                        }}>
                            <option value="">{editing.departmentId ? 'Не назначено' : 'Сначала выберите подразделение'}</option>
                            {positionOptions.map(item => <option key={item.id} value={item.id}>{item.name}{item.isActive ? '' : ' · неактивно'}</option>)}
                        </select>
                    </Field>
                </div>

                <div className="user-edit-grid">
                    <Field label="Роль" htmlFor="edit-user-role" hint={accessHint} error={errors.access}>
                        <select id="edit-user-role" value={editing.role} disabled={accessLocked} onChange={event => setEditing({ ...editing, role: event.target.value as Role })}>
                            <option value="USER">Пользователь</option>
                            <option value="ADMIN">Администратор</option>
                        </select>
                    </Field>
                    <Field label="Статус" htmlFor="edit-user-status" hint={accessHint}>
                        <select id="edit-user-status" value={editing.status} disabled={accessLocked} onChange={event => setEditing({ ...editing, status: event.target.value as AccountStatus })}>
                            <option value="ACTIVE">Активен</option>
                            <option value="BLOCKED">Заблокирован</option>
                        </select>
                    </Field>
                </div>

                <div className="dialog-actions"><Button variant="secondary" disabled={busy} onClick={() => setEditing(null)}>Отмена</Button><Button disabled={busy} onClick={save}>{busy ? 'Сохраняем...' : 'Сохранить'}</Button></div>
            </Overlay>
        })()}
    </>
}
