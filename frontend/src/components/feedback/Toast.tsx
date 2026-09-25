import {
    useEffect,
    useState,
} from 'react'

import {
    AnimatePresence,
    motion,
} from 'motion/react'

import {
    AlertCircle,
    CheckCircle2,
    Info,
    X,
} from 'lucide-react'

import {
    useStore,
} from '@/app/store-context'

import {
    useReducedMotionSetting,
} from '@/shared/hooks/motionPreference'

export function Toast() {
    const {
        toast,
        notify,
    } = useStore()

    const [
        paused,
        setPaused,
    ] = useState(false)

    const reduce =
        useReducedMotionSetting()

    useEffect(() => {
        if (
            !toast
            || paused
        ) {
            return
        }

        const timer =
            window.setTimeout(
                () => {
                    notify('')
                },
                6000,
            )

        return () => {
            window.clearTimeout(
                timer,
            )
        }
    }, [
        toast,
        notify,
        paused,
    ])

    return (
        <div
            className="toast-region"
            aria-live={
                toast?.type === 'error'
                    ? 'assertive'
                    : 'polite'
            }
        >
            <AnimatePresence>
                {toast && (
                    <motion.div
                        key={`${toast.type}-${toast.message}`}
                        className={`toast toast-${toast.type}`}
                        role={
                            toast.type === 'error'
                                ? 'alert'
                                : 'status'
                        }
                        initial={{
                            opacity: 0,
                            y: reduce
                                ? 0
                                : 6,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                        }}
                        exit={{
                            opacity: 0,

                            y: reduce
                                ? 0
                                : 4,

                            transition: {
                                duration: 0.14,
                            },
                        }}
                        transition={{
                            duration: 0.22,
                            ease: [
                                0.16,
                                1,
                                0.3,
                                1,
                            ],
                        }}
                        onMouseEnter={() =>
                            setPaused(true)
                        }
                        onMouseLeave={() =>
                            setPaused(false)
                        }
                        onFocus={() =>
                            setPaused(true)
                        }
                        onBlur={() =>
                            setPaused(false)
                        }
                    >
                        {toast.type ===
                            'success' && (
                                <CheckCircle2
                                    size={20}
                                />
                            )}

                        {toast.type ===
                            'error' && (
                                <AlertCircle
                                    size={20}
                                />
                            )}

                        {toast.type ===
                            'info' && (
                                <Info
                                    size={20}
                                />
                            )}

                        <span>
              {toast.message}
            </span>

                        <button
                            type="button"
                            className="icon-btn"
                            onClick={() =>
                                notify('')
                            }
                            aria-label="Закрыть уведомление"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}