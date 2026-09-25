import type {
    ReactNode,
} from 'react'
import {
    MotionConfig,
} from 'motion/react'
import {
    SessionProvider,
} from '@/entities/session/model/SessionProvider'
import {
    AuthBootstrap,
} from '@/features/auth/model/AuthBootstrap'
import {
    StoreProvider,
} from '@/app/store'
import {
    useReducedMotionSetting,
} from '@/shared/hooks/motionPreference'

export function AppProviders({
                                 children,
                             }: {
    children: ReactNode
}) {
    const reduce =
        useReducedMotionSetting()

    return (
        <MotionConfig
            reducedMotion={
                reduce
                    ? 'always'
                    : 'never'
            }
        >
            <SessionProvider>
                <AuthBootstrap>
                    <StoreProvider>
                        {children}
                    </StoreProvider>
                </AuthBootstrap>
            </SessionProvider>
        </MotionConfig>
    )
}