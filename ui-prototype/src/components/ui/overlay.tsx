import { useReducedMotionSetting } from '../../hooks/motionPreference'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { X } from 'lucide-react'
export function Overlay({ title, onClose, children, kind = 'modal' }: { title: string; onClose: () => void; children: ReactNode; kind?: 'modal' | 'sheet' | 'drawer' }) {
 const ref = useRef<HTMLDivElement>(null); const titleId = useId(); const closeRef = useRef(onClose); const reduce = useReducedMotionSetting()
 useEffect(() => { closeRef.current = onClose }, [onClose])
 useEffect(() => {
  const previous = document.activeElement as HTMLElement; const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'
  const root = document.getElementById('root'); if (root) root.inert = true
  ref.current?.querySelector<HTMLElement>('button, a, input, select')?.focus()
  function key(e: KeyboardEvent) {
   if (e.key === 'Escape') closeRef.current()
   if (e.key === 'Tab') { const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? []); const first = items[0]; const last = items.at(-1); if (e.shiftKey && (document.activeElement === first || !ref.current?.contains(document.activeElement))) { e.preventDefault(); last?.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() } }
  }
  document.addEventListener('keydown', key)
  return () => { document.body.style.overflow = oldOverflow; if (root) root.inert = false; document.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus() }
 }, [])
 return createPortal(<motion.div className={`overlay overlay-${kind}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : .18 }} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><motion.div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`dialog dialog-${kind}`} initial={reduce ? false : kind === 'drawer' ? { x: -32 } : kind === 'sheet' ? { y: 28 } : { y: 10, scale: .98 }} animate={{ x: 0, y: 0, scale: 1 }} transition={{ duration: .22, ease: [.16, 1, .3, 1] }}><div className="dialog-header"><h2 id={titleId}>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Закрыть"><X size={20} /></button></div>{children}</motion.div></motion.div>, document.body)
}
