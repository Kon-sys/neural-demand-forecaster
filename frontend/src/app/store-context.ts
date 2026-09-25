import {
 createContext,
 useContext,
} from 'react'

import type {
 User,
} from '@/entities/user/model/types'

export type GeneralState =
    | 'default'
    | 'loading'
    | 'empty'
    | 'error'

export type ToastType =
    | 'success'
    | 'error'
    | 'info'

export interface ToastMessage {
 message: string
 type: ToastType
}

interface Store {
 user: User | null

 logout: () => void

 general: GeneralState

 setGeneral: (
     state: GeneralState,
 ) => void

 toast: ToastMessage | null

 notify: (
     message: string,
     type?: ToastType,
 ) => void
}

export const Context =
    createContext<Store | null>(
        null,
    )

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