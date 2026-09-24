import { useReducedMotionSetting } from '../../hooks/motionPreference'
import { useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
function Content() { const outlet = useOutlet(); const [snapshot] = useState(outlet); return snapshot }
export function PageTransition() {
 const { pathname } = useLocation(); const reduce = useReducedMotionSetting()
 return <AnimatePresence mode="wait" initial={false}><motion.main id="main-content" key={pathname} initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.008, filter: 'blur(3px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none', transform: 'none' } }} exit={reduce ? { opacity: 0, transition: { duration: .05 } } : { opacity: 0, scale: .992, filter: 'blur(2px)', transition: { duration: .1 } }} transition={{ duration: reduce ? .08 : .22, ease: [.16, 1, .3, 1] }} onAnimationComplete={() => { document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true }) }}><Content /></motion.main></AnimatePresence>
}
