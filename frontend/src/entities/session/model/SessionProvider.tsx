import {
    useState,
    type ReactNode,
} from 'react'
import {
    SessionContext,
} from './session-context'
import type {
    User,
} from '@/entities/user/model/types'

export function SessionProvider({
                                    children,
                                }: {
    children: ReactNode
}) {
    const [
        user,
        setUser,
    ] = useState<User | null>(
        null,
    )

    const [
        ready,
        setReady,
    ] = useState(false)

    return (
        <SessionContext.Provider
            value={{
                user,
                setUser,
                ready,
                setReady,
            }}
        >
            {children}
        </SessionContext.Provider>
    )
}