import {
    useCallback,
} from 'react'
import {
    authApi,
} from '@/features/auth/api/auth.api'
import {
    mapUserDto,
} from '@/entities/user/lib/map-user'
import {
    useSession,
} from '@/entities/session/model/useSession'
import {
    clearAccessToken,
    setAccessToken,
} from '@/shared/api/token-storage'

export function useAuth() {
    const {
        user,
        setUser,
        ready,
    } = useSession()

    const login =
        useCallback(
            async (
                email: string,
                password: string,
            ) => {
                const response =
                    await authApi.login({
                        email:
                            email.trim(),
                        password,
                    })

                setAccessToken(
                    response.accessToken,
                )

                setUser(
                    mapUserDto(
                        response.user,
                    ),
                )
            },
            [setUser],
        )

    const register =
        useCallback(
            async (
                name: string,
                email: string,
                password: string,
            ) => {
                const response =
                    await authApi.register({
                        name:
                            name.trim(),

                        email:
                            email.trim(),

                        password,
                    })

                setAccessToken(
                    response.accessToken,
                )

                setUser(
                    mapUserDto(
                        response.user,
                    ),
                )
            },
            [setUser],
        )

    const logout =
        useCallback(
            () => {
                clearAccessToken()
                setUser(null)
            },
            [setUser],
        )

    const refreshSession =
        useCallback(
            async () => {
                const response =
                    await authApi.me()

                setUser(
                    mapUserDto(
                        response,
                    ),
                )
            },
            [setUser],
        )

    return {
        user,
        ready,
        login,
        register,
        logout,
        refreshSession,
    }
}