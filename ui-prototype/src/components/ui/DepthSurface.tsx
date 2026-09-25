import { useRef, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useReducedMotionSetting } from '../../hooks/motionPreference'
import { useMedia } from '../../hooks/useMedia'
export function DepthSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
 const pointer = useMedia('(pointer: fine)'); const reduce = useReducedMotionSetting(); const enabled = pointer && !reduce; const ref = useRef<HTMLElement>(null)
 const x = useMotionValue(0); const y = useMotionValue(0); const sx = useSpring(x, { stiffness: 160, damping: 30 }); const sy = useSpring(y, { stiffness: 160, damping: 30 }); const rx = useTransform(sy, v => -v * .9); const ry = useTransform(sx, v => v * .9)
 return <motion.section ref={ref} className={`depth-surface ${className}`} style={enabled ? { rotateX: rx, rotateY: ry, transformPerspective: 1400 } : undefined} onPointerMove={e => { if (!enabled || !ref.current) return; const r = ref.current.getBoundingClientRect(); x.set((e.clientX - r.left) / r.width - .5); y.set((e.clientY - r.top) / r.height - .5) }} onPointerLeave={() => { x.set(0); y.set(0) }}>{children}</motion.section>
}
