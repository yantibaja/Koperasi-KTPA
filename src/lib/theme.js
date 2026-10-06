import { useSyncExternalStore } from 'react'
const subs = new Set()
let dark = localStorage.getItem('tema') ? localStorage.getItem('tema') === 'gelap' : window.matchMedia('(prefers-color-scheme: dark)').matches
const apply = () => document.documentElement.classList.toggle('dark', dark)
apply()
export const toggleTheme = () => { dark = !dark; localStorage.setItem('tema', dark ? 'gelap' : 'terang'); apply(); subs.forEach(f => f()) }
export const useTheme = () => [useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => dark), toggleTheme]
