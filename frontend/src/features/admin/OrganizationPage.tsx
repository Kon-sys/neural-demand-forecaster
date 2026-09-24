import { useMemo, useState } from 'react'
import { BriefcaseBusiness, Building2, Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { useStore } from '../../app/store-context'
import { Button } from '../../components/ui/button'
import { Badge, Field, PageHeader, SectionTitle } from '../../components/ui/primitives'
import { Overlay } from '../../components/ui/overlay'
import { delay } from '@/shared/lib/format'

type Tab = 'departments' | 'positions'
type EditState =
    | { kind: 'department'; id: string | null; name: string }
    | { kind: 'position'; id: string | null; name: string; departmentId: string }

function normalizeName(value: string) {
    return value.trim().replace(/\s+/g, ' ')
}

export function OrganizationPage() {
    const {
        departments,
        positions,
        users,
        addDepartment,
        updateDepartment,
        setDepartmentActive,
        addPosition,
        updatePosition,
        setPositionActive,
        notify,
    } = useStore()
    const [tab, setTab] = useState<Tab>('departments')
    const [editing, setEditing] = useState<EditState | null>(null)
    const [errors, setErrors] = useState<{ name?: string; department?: string }>({})
    const [busy, setBusy] = useState(false)

    const departmentUsage = useMemo(
        () => new Map(departments.map(item => [item.id, users.filter(user => user.departmentId === item.id).length])),
        [departments, users],
    )
    const positionUsage = useMemo(
        () => new Map(positions.map(item => [item.id, users.filter(user => user.positionId === item.id).length])),
        [positions, users],
    )
    const departmentNames = useMemo(() => new Map(departments.map(item => [item.id, item.name])), [departments])

    function openCreate() {
        setErrors({})
        if (tab === 'departments') {
            setEditing({ kind: 'department', id: null, name: '' })
            return
        }
        setEditing({ kind: 'position', id: null, name: '', departmentId: '' })
    }

    function openDepartmentEdit(id: string, name: string) {
        setErrors({})
        setEditing({ kind: 'department', id, name })
    }

    function openPositionEdit(id: string, name: string, departmentId: string) {
        setErrors({})
        setEditing({ kind: 'position', id, name, departmentId })
    }

    async function save() {
        if (!editing) return
        const name = normalizeName(editing.name)
        if (!name) {
            setErrors({ name: 'Укажите название' })
            return
        }

        if (editing.kind === 'department') {
            const duplicate = departments.some(
                item => item.id !== editing.id && item.name.trim().toLocaleLowerCase('ru') === name.toLocaleLowerCase('ru'),
            )
            if (duplicate) {
                setErrors({ name: 'Подразделение с таким названием уже существует.' })
                return
            }

            setBusy(true)
            await delay(300)
            if (editing.id) updateDepartment(editing.id, name)
            else addDepartment(name)
            setBusy(false)
            setEditing(null)
            notify(editing.id ? 'Подразделение обновлено' : 'Подразделение добавлено')
            return
        }

        if (!editing.departmentId) {
            setErrors({ department: 'Выберите подразделение для должности.' })
            return
        }

        const selectedDepartment = departments.find(item => item.id === editing.departmentId)
        if (!selectedDepartment) {
            setErrors({ department: 'Выбранное подразделение не найдено.' })
            return
        }

        const currentPosition = editing.id ? positions.find(item => item.id === editing.id) : null
        if (!selectedDepartment.isActive && currentPosition?.departmentId !== editing.departmentId) {
            setErrors({ department: 'Нельзя назначить должность в неактивное подразделение.' })
            return
        }

        const duplicate = positions.some(
            item => item.id !== editing.id
                && item.departmentId === editing.departmentId
                && item.name.trim().toLocaleLowerCase('ru') === name.toLocaleLowerCase('ru'),
        )
        if (duplicate) {
            setErrors({ name: 'В выбранном подразделении уже существует должность с таким названием.' })
            return
        }

        setBusy(true)
        await delay(300)
        const actionError = editing.id
            ? updatePosition(editing.id, name, editing.departmentId)
            : addPosition(name, editing.departmentId)
        setBusy(false)

        if (actionError) {
            setErrors({ department: actionError })
            return
        }

        setEditing(null)
        notify(editing.id ? 'Должность обновлена' : 'Должность добавлена')
    }

    async function toggle(kind: EditState['kind'], id: string, isActive: boolean) {
        setBusy(true)
        await delay(220)
        if (kind === 'department') setDepartmentActive(id, !isActive)
        else setPositionActive(id, !isActive)
        setBusy(false)
        notify(isActive ? 'Запись деактивирована' : 'Запись активирована')
    }

    const departmentsList = <>
        <SectionTitle aside={<Button onClick={openCreate}><Plus size={16} />Добавить подразделение</Button>}>Подразделения</SectionTitle>
        <p className="organization-description">Подразделения используются при назначении пользователей и являются родительскими сущностями для должностей. Деактивация не удаляет существующие назначения.</p>
        <div className="table-wrap desktop-table">
            <table>
                <caption className="sr-only">Справочник подразделений</caption>
                <thead><tr><th>Название</th><th>Статус</th><th className="align-right">Действия</th></tr></thead>
                <tbody>{departments.map(item => <tr key={item.id} className={!item.isActive ? 'dictionary-row-inactive' : undefined}>
                    <td><strong>{item.name}</strong><span className="cell-secondary">Пользователей: {departmentUsage.get(item.id) ?? 0} · должностей: {positions.filter(position => position.departmentId === item.id).length}</span></td>
                    <td><Badge tone={item.isActive ? 'success' : 'neutral'}>{item.isActive ? 'Активно' : 'Неактивно'}</Badge></td>
                    <td><div className="row-actions">
                        <button className="icon-btn" title="Редактировать" aria-label={`Редактировать ${item.name}`} onClick={() => openDepartmentEdit(item.id, item.name)}><Pencil size={16} /></button>
                        <button className={`icon-btn ${item.isActive ? 'danger-text' : ''}`} title={item.isActive ? 'Деактивировать' : 'Активировать'} aria-label={`${item.isActive ? 'Деактивировать' : 'Активировать'} ${item.name}`} disabled={busy} onClick={() => toggle('department', item.id, item.isActive)}>{item.isActive ? <PowerOff size={16} /> : <Power size={16} />}</button>
                    </div></td>
                </tr>)}</tbody>
            </table>
        </div>
        <div className="mobile-records">{departments.map(item => <article className={`record-card dictionary-card ${!item.isActive ? 'dictionary-row-inactive' : ''}`} key={item.id}>
            <div className="record-heading"><Badge tone={item.isActive ? 'success' : 'neutral'}>{item.isActive ? 'Активно' : 'Неактивно'}</Badge><div className="row-actions">
                <button className="icon-btn" aria-label={`Редактировать ${item.name}`} onClick={() => openDepartmentEdit(item.id, item.name)}><Pencil size={16} /></button>
                <button className={`icon-btn ${item.isActive ? 'danger-text' : ''}`} aria-label={`${item.isActive ? 'Деактивировать' : 'Активировать'} ${item.name}`} disabled={busy} onClick={() => toggle('department', item.id, item.isActive)}>{item.isActive ? <PowerOff size={16} /> : <Power size={16} />}</button>
            </div></div>
            <h3>{item.name}</h3>
            <p className="cell-secondary">Пользователей: {departmentUsage.get(item.id) ?? 0} · должностей: {positions.filter(position => position.departmentId === item.id).length}</p>
        </article>)}</div>
    </>

    const positionsList = <>
        <SectionTitle aside={<Button onClick={openCreate}><Plus size={16} />Добавить должность</Button>}>Должности</SectionTitle>
        <p className="organization-description">Каждая должность обязательно относится к конкретному подразделению. Одинаковое название допустимо в разных подразделениях.</p>
        <div className="table-wrap desktop-table">
            <table>
                <caption className="sr-only">Справочник должностей</caption>
                <thead><tr><th>Название</th><th>Подразделение</th><th>Статус</th><th className="align-right">Действия</th></tr></thead>
                <tbody>{positions.map(item => <tr key={item.id} className={!item.isActive ? 'dictionary-row-inactive' : undefined}>
                    <td><strong>{item.name}</strong><span className="cell-secondary">Назначено пользователям: {positionUsage.get(item.id) ?? 0}</span></td>
                    <td>{departmentNames.get(item.departmentId) ?? 'Подразделение не найдено'}</td>
                    <td><Badge tone={item.isActive ? 'success' : 'neutral'}>{item.isActive ? 'Активно' : 'Неактивно'}</Badge></td>
                    <td><div className="row-actions">
                        <button className="icon-btn" title="Редактировать" aria-label={`Редактировать ${item.name}`} onClick={() => openPositionEdit(item.id, item.name, item.departmentId)}><Pencil size={16} /></button>
                        <button className={`icon-btn ${item.isActive ? 'danger-text' : ''}`} title={item.isActive ? 'Деактивировать' : 'Активировать'} aria-label={`${item.isActive ? 'Деактивировать' : 'Активировать'} ${item.name}`} disabled={busy} onClick={() => toggle('position', item.id, item.isActive)}>{item.isActive ? <PowerOff size={16} /> : <Power size={16} />}</button>
                    </div></td>
                </tr>)}</tbody>
            </table>
        </div>
        <div className="mobile-records">{positions.map(item => <article className={`record-card dictionary-card ${!item.isActive ? 'dictionary-row-inactive' : ''}`} key={item.id}>
            <div className="record-heading"><Badge tone={item.isActive ? 'success' : 'neutral'}>{item.isActive ? 'Активно' : 'Неактивно'}</Badge><div className="row-actions">
                <button className="icon-btn" aria-label={`Редактировать ${item.name}`} onClick={() => openPositionEdit(item.id, item.name, item.departmentId)}><Pencil size={16} /></button>
                <button className={`icon-btn ${item.isActive ? 'danger-text' : ''}`} aria-label={`${item.isActive ? 'Деактивировать' : 'Активировать'} ${item.name}`} disabled={busy} onClick={() => toggle('position', item.id, item.isActive)}>{item.isActive ? <PowerOff size={16} /> : <Power size={16} />}</button>
            </div></div>
            <h3>{item.name}</h3>
            <dl className="record-details">
                <div><dt>Подразделение</dt><dd>{departmentNames.get(item.departmentId) ?? 'Не найдено'}</dd></div>
                <div><dt>Назначено</dt><dd>{positionUsage.get(item.id) ?? 0}</dd></div>
            </dl>
        </article>)}</div>
    </>

    return <>
        <PageHeader eyebrow="АДМИНИСТРИРОВАНИЕ" title="Оргструктура" description="Справочники подразделений и привязанных к ним должностей для организационных атрибутов пользователей." />

        <div className="organization-tabs" role="tablist" aria-label="Разделы оргструктуры">
            <button role="tab" aria-selected={tab === 'departments'} className={`organization-tab ${tab === 'departments' ? 'active' : ''}`} onClick={() => setTab('departments')}><Building2 size={17} />Подразделения<span>{departments.length}</span></button>
            <button role="tab" aria-selected={tab === 'positions'} className={`organization-tab ${tab === 'positions' ? 'active' : ''}`} onClick={() => setTab('positions')}><BriefcaseBusiness size={17} />Должности<span>{positions.length}</span></button>
        </div>

        <section className="organization-panel" role="tabpanel">
            {tab === 'departments' ? departmentsList : positionsList}
        </section>

        {editing && <Overlay
            title={editing.id
                ? (editing.kind === 'department' ? 'Редактировать подразделение' : 'Редактировать должность')
                : (editing.kind === 'department' ? 'Новое подразделение' : 'Новая должность')}
            onClose={() => { if (!busy) setEditing(null) }}
        >
            <Field
                label="Название"
                htmlFor="dictionary-name"
                error={errors.name}
                hint={editing.kind === 'department' ? 'Название обязательно и должно быть уникальным без учёта регистра.' : 'Название обязательно и должно быть уникальным внутри выбранного подразделения.'}
            >
                <input
                    id="dictionary-name"
                    autoFocus
                    value={editing.name}
                    onChange={event => { setEditing({ ...editing, name: event.target.value }); setErrors(current => ({ ...current, name: undefined })) }}
                    aria-invalid={!!errors.name}
                />
            </Field>

            {editing.kind === 'position' && <Field label="Подразделение" htmlFor="position-department" error={errors.department} hint={editing.id && positionUsage.get(editing.id) ? 'Должность нельзя перенести в другое подразделение, пока она назначена пользователям.' : 'Должность обязательно должна относиться к одному подразделению.'}>
                <select
                    id="position-department"
                    value={editing.departmentId}
                    disabled={!!editing.id && (positionUsage.get(editing.id) ?? 0) > 0}
                    onChange={event => { setEditing({ ...editing, departmentId: event.target.value }); setErrors(current => ({ ...current, department: undefined })) }}
                    aria-invalid={!!errors.department}
                >
                    <option value="">Выберите подразделение</option>
                    {departments
                        .filter(item => item.isActive || item.id === editing.departmentId)
                        .map(item => <option key={item.id} value={item.id}>{item.name}{item.isActive ? '' : ' · неактивно'}</option>)}
                </select>
            </Field>}

            <div className="dialog-actions"><Button variant="secondary" disabled={busy} onClick={() => setEditing(null)}>Отмена</Button><Button disabled={busy} onClick={save}>{busy ? 'Сохраняем...' : editing.id ? 'Сохранить' : 'Добавить'}</Button></div>
        </Overlay>}
    </>
}
