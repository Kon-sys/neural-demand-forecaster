import {
 createContext,
 useContext,
} from 'react'

import type {
 Product,
} from '../mocks/products'

import type {
 Forecast,
} from '../mocks/forecasts'

import type {
 User,
 UserRole,
 UserStatus,
} from '@/entities/user/model/types'

export type Role =
    UserRole

export type AccountStatus =
    UserStatus

export type GeneralState =
    | 'default'
    | 'loading'
    | 'empty'
    | 'error'

export type ForecastOutcome =
    | 'success'
    | 'insufficient'
    | 'unavailable'

export type CsvOutcome =
    | 'success'
    | 'partial'
    | 'error'
    | 'structure'

export type ToastType =
    | 'success'
    | 'error'
    | 'info'

export interface ToastMessage {
 message: string
 type: ToastType
}

export type {
 User,
}

export interface ManagedUser
    extends User {
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

export type AdminUserUpdate =
    Pick<
        User,
        | 'departmentId'
        | 'positionId'
        | 'role'
        | 'status'
    >

interface Store {
 user: User | null

 logout: () => void

 users: ManagedUser[]

 updateManagedUser: (
     id: string,
     update: AdminUserUpdate,
 ) => string | null

 toggleUserStatus: (
     id: string,
 ) => string | null

 departments: Department[]

 addDepartment: (
     name: string,
 ) => void

 updateDepartment: (
     id: string,
     name: string,
 ) => void

 setDepartmentActive: (
     id: string,
     isActive: boolean,
 ) => void

 positions: Position[]

 addPosition: (
     name: string,
     departmentId: string,
 ) => string | null

 updatePosition: (
     id: string,
     name: string,
     departmentId: string,
 ) => string | null

 setPositionActive: (
     id: string,
     isActive: boolean,
 ) => void

 products: Product[]

 saveProduct: (
     product: Product,
 ) => void

 deleteProduct: (
     id: string,
 ) => void

 forecasts: Forecast[]

 addForecast: (
     forecast: Forecast,
 ) => void

 general: GeneralState

 setGeneral: (
     state: GeneralState,
 ) => void

 forecastOutcome:
     ForecastOutcome

 setForecastOutcome: (
     state: ForecastOutcome,
 ) => void

 csvOutcome:
     CsvOutcome

 setCsvOutcome: (
     state: CsvOutcome,
 ) => void

 toast: ToastMessage | null

 notify: (
     message: string,
     type?: ToastType,
 ) => void
}

export const Context =
    createContext<
        Store | null
    >(null)

export function useStore() {
 const store =
     useContext(
         Context,
     )

 if (!store) {
  throw new Error(
      'StoreProvider is required',
  )
 }

 return store
}