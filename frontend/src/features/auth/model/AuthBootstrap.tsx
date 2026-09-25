import {
    useEffect,
    type ReactNode,
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
    getAccessToken,
    SESSION_EXPIRED_EVENT,
} from '@/shared/api/token-storage'
import {
    isApiError,
} from '@/shared/api/api-error'

export function AuthBootstrap({
                                  children,
                              }: {
    children: ReactNode
}) {
    const {
        setUser,
        setReady,
    } = useSession()

    useEffect(() => {
        let active = true

        async function restoreSession() {
            const token =
                getAccessToken()

            if (!token) {
                if (active) {
                    setReady(true)
                }

                return
            }

            try {
                const response =
                    await authApi.me()

                if (active) {
                    setUser(
                        mapUserDto(
                            response,
                        ),
                    )
                }
            } catch (error) {
                if (
                    isApiError(error)
                    && (
                        error.status === 401
                        || error.status === 403
                    )
                ) {
                    clearAccessToken()
                }

                if (active) {
                    setUser(null)
                }
            } finally {
                if (active) {
                    setReady(true)
                }
            }
        }

        function handleSessionExpired() {
            setUser(null)
        }

        void restoreSession()

        window.addEventListener(
            SESSION_EXPIRED_EVENT,
            handleSessionExpired,
        )

        return () => {
            active = false

            window.removeEventListener(
                SESSION_EXPIRED_EVENT,
                handleSessionExpired,
            )
        }
    }, [
        setReady,
        setUser,
    ])

    return children
}