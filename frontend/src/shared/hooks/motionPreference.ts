import { useSyncExternalStore } from 'react'
let override = false
const listeners = new Set<() => void>()
export function setReducedMotionDemo(value: boolean) { override = value; document.documentElement.toggleAttribute('data-reduced-motion', value); listeners.forEach(listener => listener()) }
export function useReducedMotionSetting() { return useSyncExternalStore(listener => { const media = matchMedia('(prefers-reduced-motion: reduce)'); listeners.add(listener); media.addEventListener('change', listener); return () => { listeners.delete(listener); media.removeEventListener('change', listener) } }, () => override || matchMedia('(prefers-reduced-motion: reduce)').matches, () => false) }
export function useReducedMotionOverride() { return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => override, () => false) }

