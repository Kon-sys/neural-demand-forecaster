import { useEffect, useState, type ReactNode } from 'react'
import { initialProducts } from '../mocks/products'
import { initialForecasts } from '../mocks/forecasts'
import { initialDepartments, initialPositions } from '../mocks/organization'
import {
 Context,
 type AccountStatus,
 type AdminUserUpdate,
 type CsvOutcome,
 type Department,
 type ForecastOutcome,
 type GeneralState,
 type ManagedUser,
 type Position,
 type ProfileUpdate,
 type Role,
 type User,
} from './store-context'

const USERS_STORAGE_KEY = 'demand-forecast-users:v2'
const DEPARTMENTS_STORAGE_KEY = 'demand-forecast-departments:v1'
const POSITIONS_STORAGE_KEY = 'demand-forecast-positions:v3'
const LEGACY_POSITIONS_STORAGE_KEYS = ['demand-forecast-positions:v2', 'demand-forecast-positions:v1'] as const

const initialUsers: ManagedUser[] = [
 { id: 'usr-admin', name: 'Алексей Воронов', email: 'admin@test.dev', avatarUrl: null, role: 'ADMIN', status: 'ACTIVE', departmentId: 'dep-administration', positionId: 'pos-administrator', lastActive: '2026-09-19T14:46:00', createdAt: '2026-01-12' },
 { id: 'usr-user', name: 'Мария Белова', email: 'user@test.dev', avatarUrl: null, role: 'USER', status: 'ACTIVE', departmentId: 'dep-analytics', positionId: 'pos-data-analyst', lastActive: '2026-09-19T13:18:00', createdAt: '2026-02-03' },
 { id: 'usr-3', name: 'Илья Сафонов', email: 'i.safonov@signal.dev', avatarUrl: null, role: 'USER', status: 'ACTIVE', departmentId: 'dep-sales', positionId: 'pos-product-manager', lastActive: '2026-09-18T16:30:00', createdAt: '2026-03-14' },
 { id: 'usr-4', name: 'Елена Миронова', email: 'e.mironova@signal.dev', avatarUrl: null, role: 'USER', status: 'ACTIVE', departmentId: 'dep-marketing', positionId: 'pos-project-manager', lastActive: '2026-09-17T11:05:00', createdAt: '2026-03-28' },
 { id: 'usr-5', name: 'Дмитрий Ковалёв', email: 'd.kovalev@signal.dev', avatarUrl: null, role: 'ADMIN', status: 'ACTIVE', departmentId: 'dep-analytics', positionId: 'pos-business-analyst', lastActive: '2026-09-19T09:42:00', createdAt: '2026-01-24' },
 { id: 'usr-6', name: 'Анна Лапина', email: 'a.lapina@signal.dev', avatarUrl: null, role: 'USER', status: 'BLOCKED', departmentId: 'dep-development', positionId: 'pos-junior-developer', lastActive: '2026-08-30T08:10:00', createdAt: '2026-04-11' },
 { id: 'usr-7', name: 'Никита Орлов', email: 'n.orlov@signal.dev', avatarUrl: null, role: 'USER', status: 'ACTIVE', departmentId: 'dep-development', positionId: 'pos-senior-developer', lastActive: '2026-09-16T15:52:00', createdAt: '2026-05-07' },
 { id: 'usr-8', name: 'Ольга Громова', email: 'o.gromova@signal.dev', avatarUrl: null, role: 'USER', status: 'BLOCKED', departmentId: 'dep-analytics', positionId: 'pos-data-analyst', lastActive: '2026-08-18T12:21:00', createdAt: '2026-06-02' },
]

function loadStoredArray<T>(key: string, fallback: T[]) {
 if (typeof window === 'undefined') return fallback
 try {
  const raw = window.localStorage.getItem(key)
  if (!raw) return fallback
  const parsed: unknown = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed as T[] : fallback
 } catch {
  return fallback
 }
}

function isRecord(value: unknown): value is Record<string, unknown> {
 return typeof value === 'object' && value !== null
}

function normalizePositions(items: unknown[], departments: Department[]): Position[] {
 const departmentIds = new Set(departments.map(item => item.id))
 const defaultsById = new Map(initialPositions.map(item => [item.id, item]))
 const normalized = new Map<string, Position>()

 for (const raw of items) {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') continue

  const defaultPosition = defaultsById.get(raw.id)
  const storedDepartmentId = typeof raw.departmentId === 'string' ? raw.departmentId : null
  const departmentId = storedDepartmentId && departmentIds.has(storedDepartmentId)
      ? storedDepartmentId
      : defaultPosition?.departmentId ?? null

  // Старую пользовательскую должность без привязки к подразделению безопасно
  // мигрировать нельзя: она не должна попадать в новый справочник.
  if (!departmentId || !departmentIds.has(departmentId)) continue

  normalized.set(raw.id, {
   id: raw.id,
   name: raw.name.trim() || defaultPosition?.name || 'Без названия',
   departmentId,
   isActive: typeof raw.isActive === 'boolean' ? raw.isActive : true,
  })
 }

 // При обновлении схемы сохраняем новые базовые должности, которых ещё не было
 // в старом localStorage. Существующие пользовательские изменения по тем же id
 // при этом имеют приоритет.
 for (const item of initialPositions) {
  if (!normalized.has(item.id)) normalized.set(item.id, item)
 }

 return [...normalized.values()]
}

function loadPositions(departments: Department[]): Position[] {
 if (typeof window === 'undefined') return initialPositions

 const keys = [POSITIONS_STORAGE_KEY, ...LEGACY_POSITIONS_STORAGE_KEYS]
 for (const key of keys) {
  try {
   const raw = window.localStorage.getItem(key)
   if (!raw) continue
   const parsed: unknown = JSON.parse(raw)
   if (Array.isArray(parsed)) return normalizePositions(parsed, departments)
  } catch {
   // Пробуем следующую версию хранилища.
  }
 }

 return initialPositions
}

function normalizeManagedUsers(items: ManagedUser[], positions: Position[]): ManagedUser[] {
 const positionsById = new Map(positions.map(item => [item.id, item]))
 return items.map(item => {
  const departmentId = typeof item.departmentId === 'string' ? item.departmentId : null
  const positionId = typeof item.positionId === 'string' ? item.positionId : null
  const position = positionId ? positionsById.get(positionId) : undefined
  return {
   ...item,
   avatarUrl: typeof item.avatarUrl === 'string' ? item.avatarUrl : null,
   departmentId,
   positionId: position && position.departmentId === departmentId ? positionId : null,
  }
 })
}

function persist(key: string, value: unknown) {
 if (typeof window === 'undefined') return
 try {
  window.localStorage.setItem(key, JSON.stringify(value))
 } catch {
  // Прототип продолжает работать даже при переполненном/недоступном localStorage.
 }
}

function fallbackUser(email: string, name?: string): User {
 const normalized = email.toLowerCase()
 const admin = normalized === 'admin@test.dev'
 return {
  id: `local-${normalized}`,
  email,
  name: name || (admin ? 'Администратор' : 'Пользователь'),
  avatarUrl: null,
  role: admin ? 'ADMIN' : 'USER',
  status: 'ACTIVE',
  departmentId: admin ? 'dep-administration' : 'dep-analytics',
  positionId: admin ? 'pos-administrator' : 'pos-data-analyst',
 }
}

function toSessionUser(managed: ManagedUser): User {
 return {
  id: managed.id,
  name: managed.name,
  email: managed.email,
  avatarUrl: managed.avatarUrl,
  role: managed.role,
  status: managed.status,
  departmentId: managed.departmentId,
  positionId: managed.positionId,
  createdAt: managed.createdAt,
 }
}

function createDictionaryId(prefix: string) {
 return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function StoreProvider({ children }: { children: ReactNode }) {
 const [user, setUser] = useState<User | null>(null)
 const [departments, setDepartments] = useState<Department[]>(() => loadStoredArray(DEPARTMENTS_STORAGE_KEY, initialDepartments))
 const [positions, setPositions] = useState<Position[]>(() => loadPositions(departments))
 const [users, setUsers] = useState<ManagedUser[]>(() => normalizeManagedUsers(loadStoredArray(USERS_STORAGE_KEY, initialUsers), positions))
 const [products, setProducts] = useState(initialProducts)
 const [forecasts, setForecasts] = useState(initialForecasts)
 const [general, setGeneral] = useState<GeneralState>('default')
 const [forecastOutcome, setForecastOutcome] = useState<ForecastOutcome>('success')
 const [csvOutcome, setCsvOutcome] = useState<CsvOutcome>('partial')
 const [toast, notify] = useState('')

 useEffect(() => persist(USERS_STORAGE_KEY, users), [users])
 useEffect(() => persist(DEPARTMENTS_STORAGE_KEY, departments), [departments])
 useEffect(() => persist(POSITIONS_STORAGE_KEY, positions), [positions])

 function login(email: string, name?: string) {
  const normalized = email.toLowerCase()
  const managed = users.find(item => item.email.toLowerCase() === normalized)
  if (managed?.status === 'BLOCKED') return 'Учётная запись заблокирована администратором'
  setUser(managed ? toSessionUser(managed) : fallbackUser(email, name))
  return null
 }

 function updateProfile(profile: ProfileUpdate) {
  setUser(current => current ? { ...current, ...profile } : current)
  setUsers(current => current.map(item => item.id === user?.id ? { ...item, ...profile } : item))
 }

 function updateManagedUser(id: string, update: AdminUserUpdate) {
  const original = users.find(item => item.id === id)
  if (!original) return 'Пользователь не найден'

  const self = id === user?.id
  if (self && update.role !== original.role) return 'Нельзя изменить собственную роль через управление пользователями.'
  if (self && update.status !== original.status) return 'Нельзя заблокировать собственную учётную запись.'

  const activeAdmins = users.filter(item => item.role === 'ADMIN' && item.status === 'ACTIVE').length
  if (original.role === 'ADMIN' && original.status === 'ACTIVE' && activeAdmins === 1) {
   if (update.role !== 'ADMIN') return 'Нельзя изменить роль последнего активного администратора.'
   if (update.status !== 'ACTIVE') return 'Нельзя заблокировать последнего активного администратора.'
  }

  if (update.departmentId && !departments.some(item => item.id === update.departmentId)) {
   return 'Подразделение не найдено.'
  }
  if (update.positionId) {
   if (!update.departmentId) return 'Сначала выберите подразделение.'
   const position = positions.find(item => item.id === update.positionId)
   if (!position) return 'Должность не найдена.'
   if (position.departmentId !== update.departmentId) return 'Выбранная должность не относится к выбранному подразделению.'
  }

  setUsers(current => current.map(item => item.id === id ? { ...item, ...update } : item))
  setUser(current => current?.id === id ? { ...current, ...update } : current)
  return null
 }

 function toggleUserStatus(id: string) {
  const target = users.find(item => item.id === id)
  if (!target) return 'Пользователь не найден'
  return updateManagedUser(id, {
   departmentId: target.departmentId,
   positionId: target.positionId,
   role: target.role,
   status: (target.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE') as AccountStatus,
  })
 }

 function addDepartment(name: string) {
  setDepartments(current => [...current, { id: createDictionaryId('dep'), name, isActive: true }])
 }

 function updateDepartment(id: string, name: string) {
  setDepartments(current => current.map(item => item.id === id ? { ...item, name } : item))
 }

 function setDepartmentActive(id: string, isActive: boolean) {
  setDepartments(current => current.map(item => item.id === id ? { ...item, isActive } : item))
 }

 function addPosition(name: string, departmentId: string) {
  const department = departments.find(item => item.id === departmentId)
  if (!department) return 'Выберите подразделение для должности.'
  if (!department.isActive) return 'Нельзя создать должность в неактивном подразделении.'
  setPositions(current => [...current, { id: createDictionaryId('pos'), name, departmentId, isActive: true }])
  return null
 }

 function updatePosition(id: string, name: string, departmentId: string) {
  const currentPosition = positions.find(item => item.id === id)
  if (!currentPosition) return 'Должность не найдена.'
  const department = departments.find(item => item.id === departmentId)
  if (!department) return 'Выберите подразделение для должности.'
  if (!department.isActive && currentPosition.departmentId !== departmentId) return 'Нельзя перенести должность в неактивное подразделение.'
  if (currentPosition.departmentId !== departmentId && users.some(item => item.positionId === id)) {
   return 'Нельзя перенести должность в другое подразделение, пока она назначена пользователям.'
  }
  setPositions(current => current.map(item => item.id === id ? { ...item, name, departmentId } : item))
  return null
 }

 function setPositionActive(id: string, isActive: boolean) {
  setPositions(current => current.map(item => item.id === id ? { ...item, isActive } : item))
 }

 return <Context.Provider value={{
  user,
  login,
  logout: () => { setUser(null); setGeneral('default') },
  setRole: (role: Role) => setUser(current => current ? { ...current, role } : current),
  updateProfile,
  users,
  updateManagedUser,
  toggleUserStatus,
  departments,
  addDepartment,
  updateDepartment,
  setDepartmentActive,
  positions,
  addPosition,
  updatePosition,
  setPositionActive,
  products,
  saveProduct: product => setProducts(current => current.some(item => item.id === product.id) ? current.map(item => item.id === product.id ? product : item) : [...current, product]),
  deleteProduct: id => setProducts(current => current.filter(product => product.id !== id)),
  forecasts,
  addForecast: forecast => setForecasts(current => [forecast, ...current]),
  general,
  setGeneral,
  forecastOutcome,
  setForecastOutcome,
  csvOutcome,
  setCsvOutcome,
  toast,
  notify,
 }}>{children}</Context.Provider>
}
