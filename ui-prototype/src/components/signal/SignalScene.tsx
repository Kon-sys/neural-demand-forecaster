import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { Group, InstancedMesh, Matrix4, Vector3, Color, Mesh } from 'three'
interface Props { active: boolean; processing: boolean; dark: boolean }
type Point = [number, number, number]
function paths() {
 return Array.from({ length: 22 }, (_, strand) => Array.from({ length: 65 }, (_, i): Point => {
  const t = i / 64; const spread = Math.pow(1 - t, 1.3); const phase = strand / 22 * Math.PI * 2
  return [-4.4 + t * 4.5, (Math.sin(phase) * 1.45 + Math.sin(t * 14 + phase) * .18) * spread, (Math.cos(phase) * 1.05 + Math.cos(t * 10) * .12) * spread]
 }))
}
function Sculpture({ active, processing, dark }: Props) {
 const group = useRef<Group>(null); const dots = useRef<InstancedMesh>(null); const core = useRef<Mesh>(null); const time = useRef(0)
 const colors = useMemo(() => { const css = getComputedStyle(document.documentElement); return { history: new Color(css.getPropertyValue(dark ? '--color-shell-muted' : '--color-chart-history').trim()), accent: new Color(css.getPropertyValue(dark ? '--color-focus-inverse' : '--color-signal').trim()), forecast: new Color(css.getPropertyValue('--color-chart-forecast').trim()), core: new Color(css.getPropertyValue(dark ? '--color-shell-selected' : '--color-surface-subtle').trim()) } }, [dark])
 const rails = useMemo(() => paths(), [])
 const rings = useMemo(() => Array.from({ length: 8 }, (_, n) => Array.from({ length: 81 }, (_, i): Point => { const a = i / 80 * Math.PI * 2; const radius = .53 + Math.sin(n / 7 * Math.PI) * .18; return [-.28 + n * .08, Math.sin(a) * radius, Math.cos(a) * radius] })), [])
 const output = useMemo(() => Array.from({ length: 85 }, (_, i): Point => { const t = i / 84; return [.35 + t * 3.85, Math.sin(t * 13) * .35 * t + t * .5, Math.cos(t * 10) * .24 * t] }), [])
 const matrix = useMemo(() => new Matrix4(), []); const position = useMemo(() => new Vector3(), []); const target = useMemo(() => new Vector3(), [])
 useEffect(() => { if (group.current) group.current.rotation.set(.12, -.18, -.1) }, [])
 useFrame((state, delta) => {
  if (!active) return; time.current += Math.min(delta, .05)
  const t = time.current
  if (group.current) { const desiredX = .12 + Math.sin(t * .2) * .045 + state.pointer.y * .07; const desiredY = -.18 + Math.sin(t * .15) * .07 + state.pointer.x * .1; const lerp = 1 - Math.exp(-delta * 4); group.current.rotation.x += (desiredX - group.current.rotation.x) * lerp; group.current.rotation.y += (desiredY - group.current.rotation.y) * lerp }
  if (core.current) core.current.rotation.x = t * .09
  if (dots.current) { for (let n = 0; n < 44; n++) { const rail = rails[n % rails.length]; const p = (t * (processing ? .34 : .1) + n * .137) % 1; const index = p * (rail.length - 1); const a = Math.floor(index); const b = Math.min(a + 1, rail.length - 1); position.set(...rail[a]).lerp(target.set(...rail[b]), index - a); matrix.makeTranslation(position.x, position.y, position.z); dots.current.setMatrixAt(n, matrix) } dots.current.instanceMatrix.needsUpdate = true }
 })
 return <group ref={group}><ambientLight intensity={.7} /><directionalLight position={[0, 3, 5]} intensity={2.8} color={colors.accent} /><directionalLight position={[-3, -1, 2]} intensity={1.5} />{rails.map((rail, i) => <Line key={i} points={rail} color={colors.history} transparent opacity={dark ? .24 + i % 4 * .09 : .18 + i % 4 * .08} lineWidth={.75} />)}{rings.map((ring, i) => <Line key={i} points={ring} color={colors.accent} transparent opacity={.25 + i / 14} lineWidth={i === 3 ? 1.5 : .8} />)}<mesh ref={core} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.47, .47, .035, 48, 1, true]} /><meshStandardMaterial color={colors.core} metalness={.8} roughness={.24} side={2} /></mesh><Line points={output} color={dark ? colors.accent : colors.forecast} lineWidth={1.7} dashed dashSize={.1} gapSize={.07} /><instancedMesh ref={dots} args={[undefined, undefined, 44]} frustumCulled={false}><sphereGeometry args={[.024, 6, 4]} /><meshBasicMaterial color={colors.accent} transparent opacity={.75} /></instancedMesh><Line points={[[-4.4,-1.85,0],[4.2,-1.85,0]]} color={colors.history} transparent opacity={.16} lineWidth={.5} /></group>
}
export default function SignalScene(props: Props) {
 return <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 9.6], fov: 35 }} frameloop={props.active ? 'always' : 'demand'} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} onCreated={({ gl }) => { gl.setClearColor(0x000000, 0) }}><Sculpture {...props} /></Canvas>
}
