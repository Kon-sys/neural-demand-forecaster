import { useSyncExternalStore } from 'react'
export function useMedia(query: string) {
 return useSyncExternalStore(listener => { const media = window.matchMedia(query); media.addEventListener('change', listener); return () => media.removeEventListener('change', listener) }, () => window.matchMedia(query).matches, () => false)
}

