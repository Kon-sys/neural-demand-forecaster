import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react'
import { Pause, Play } from 'lucide-react'
import { useReducedMotionSetting } from '@/shared/hooks/motionPreference'
import { useMedia } from '@/shared/hooks/useMedia'
const Scene = lazy(() => import('./SignalScene'))
function StaticCore({ processing }: { processing: boolean }) {
 return <svg className={`signal-static ${processing ? 'is-processing' : ''}`} viewBox="0 0 700 320" fill="none" aria-hidden="true"><g className="static-rails">{Array.from({ length: 15 }, (_, i) => { const y = 38 + i * 17; return <path key={i} d={`M 30 ${y} C 110 ${y - 30}, 180 ${y + 36}, 260 ${y} S 320 160, 352 160`} stroke="currentColor" opacity={.2 + i % 3 * .15} /> })}</g><g className="static-core">{[0, 1, 2, 3, 4].map(i => <ellipse key={i} cx={328 + i * 12} cy="160" rx="24" ry={62 - Math.abs(i - 2) * 8} stroke="var(--color-signal)" opacity={.25 + i * .13} />)}</g><path className="static-output" d="M352 160 C400 160 411 122 442 139 S477 188 510 148 S552 107 580 130 S620 170 668 109" stroke="var(--color-chart-forecast)" strokeWidth="2" strokeDasharray="6 4" />{[70, 110, 150, 190, 230].map((x, i) => <circle key={x} cx={x} cy={80 + i * 31} r="3" fill="currentColor" opacity=".5" />)}<path d="M40 277H668" stroke="currentColor" opacity=".12" /><path d="M352 70V264" stroke="currentColor" opacity=".2" strokeDasharray="2 7" /></svg>
}
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
 state = { failed: false }
 static getDerivedStateFromError() { return { failed: true } }
 render() { return this.state.failed ? this.props.fallback : this.props.children }
}
export function SignalCore({ processing = false, dark = false }: { processing?: boolean; dark?: boolean }) {
 const mobile = useMedia('(max-width: 767px)'); const reduce = useReducedMotionSetting(); const [visible, setVisible] = useState(false); const [documentVisible, setDocumentVisible] = useState(true); const [paused, setPaused] = useState(false); const [webgl, setWebgl] = useState(false); const root = useRef<HTMLDivElement>(null)
 useEffect(() => { const element = root.current; if (!element) return; const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .05 }); observer.observe(element); const onVisibility = () => setDocumentVisible(!document.hidden); document.addEventListener('visibilitychange', onVisibility); return () => { observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility) } }, [])
 useEffect(() => { if (mobile || reduce) return; const frame = requestAnimationFrame(() => { const canvas = document.createElement('canvas'); const context = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }); if (context) { context.getExtension('WEBGL_lose_context')?.loseContext(); setWebgl(true) } }); return () => cancelAnimationFrame(frame) }, [mobile, reduce])
 const staticView = <StaticCore processing={processing && !reduce} />
 const renderScene = webgl && !mobile && !reduce && visible
 return <div ref={root} className={`signal-core ${dark ? 'signal-core-dark' : ''} ${processing ? 'signal-core-processing' : ''}`} aria-label="Схематическое преобразование исторических данных в прогноз"><div className="signal-core-visual" aria-hidden="true">{renderScene ? <SceneBoundary fallback={staticView}><Suspense fallback={staticView}><Scene active={visible && documentVisible && !paused} processing={processing} dark={dark} /></Suspense></SceneBoundary> : staticView}</div><div className="core-captions" aria-hidden="true"><span>ИСТОРИЯ</span><span>СИГНАЛ</span><span>ПРОГНОЗ</span></div>{!processing && !mobile && !reduce && webgl && <button className="core-pause" aria-label={paused ? 'Включить движение визуализации' : 'Приостановить движение визуализации'} onClick={() => setPaused(v => !v)}>{paused ? <Play size={13} /> : <Pause size={13} />}<span>{paused ? 'Продолжить' : 'Пауза'}</span></button>}</div>
}
