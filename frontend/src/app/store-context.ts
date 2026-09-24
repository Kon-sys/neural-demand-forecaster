import { createContext, useContext } from 'react'
import type { Product } from '../mocks/products'
import type { Forecast } from '../mocks/forecasts'

export type Role = 'USER' | 'ADMIN'
export type AccountStatus = 'ACTIVE' | 'BLOCKED'
export type GeneralState = 'default' | 'loading' | 'empty' | 'error'
export type ForecastOutcome = 'success' | 'insufficient' | 'unavailable'
export type CsvOutcome = 'success' | 'partial' | 'error' | 'structure'

export interface User {
 id: string
 name: string
 email: string
 avatarUrl: string | null
 role: Role
 status: AccountStatus
 departmentId: string | null
 positionId: string | null
 createdAt?: string
}

export interface ManagedUser extends User {
 lastActive: string
 createdAt: string
}

export interface Department {
 id: string
 name: string
 isActive: boolean
}

export interface Position {
 id: string
 name: string
 departmentId: string
 isActive: boolean
}

export type ProfileUpdate = Pick<User, 'name' | 'email'> & { avatarUrl?: string | null }
export type AdminUserUpdate = Pick<User, 'departmentId' | 'positionId' | 'role' | 'status'>

interface Store {
 user: User | null
 login: (email: string, name?: string) => string | null
 logout: () => void
 setRole: (role: Role) => void
 updateProfile: (profile: ProfileUpdate) => void
 users: ManagedUser[]
 updateManagedUser: (id: string, update: AdminUserUpdate) => string | null
 toggleUserStatus: (id: string) => string | null
 departments: Department[]
 addDepartment: (name: string) => void
 updateDepartment: (id: string, name: string) => void
 setDepartmentActive: (id: string, isActive: boolean) => void
 positions: Position[]
 addPosition: (name: string, departmentId: string) => string | null
 updatePosition: (id: string, name: string, departmentId: string) => string | null
 setPositionActive: (id: string, isActive: boolean) => void
 products: Product[]
 saveProduct: (p: Product) => void
 deleteProduct: (id: string) => void
 forecasts: Forecast[]
 addForecast: (forecast: Forecast) => void
 general: GeneralState
 setGeneral: (s: GeneralState) => void
 forecastOutcome: ForecastOutcome
 setForecastOutcome: (s: ForecastOutcome) => void
 csvOutcome: CsvOutcome
 setCsvOutcome: (s: CsvOutcome) => void
 toast: string
 notify: (message: string) => void
}

export const Context = createContext<Store | null>(null)
export function useStore() {
 const store = useContext(Context)
 if (!store) throw new Error('StoreProvider is required')
 return store
}
