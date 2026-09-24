import {
    createContext,
    type Dispatch,
    type SetStateAction,
} from 'react'
import type {
    User,
} from '@/entities/user/model/types'

export interface SessionContextValue {
    user: User | null

    setUser: Dispatch<
        SetStateAction<User | null>
    >

    ready: boolean

    setReady: Dispatch<
        SetStateAction<boolean>
    >
}

export const SessionContext =
    createContext<
        SessionContextValue | null
    >(null)