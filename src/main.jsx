import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './lib/toast'
import { ConfirmProvider } from './lib/confirm'
import UpdateBanner from './components/UpdateBanner'
import App from './App'
import './index.css'
createRoot(document.getElementById('root')).render(<HashRouter><ToastProvider><ConfirmProvider><AuthProvider><App /><UpdateBanner /></AuthProvider></ConfirmProvider></ToastProvider></HashRouter>)
if ('serviceWorker' in navigator) window.addEventListener('load', () => {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').then(reg => {
    reg.addEventListener('updatefound', () => { const w = reg.installing; w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) window.dispatchEvent(new Event('app-update')) }) })
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}) })
  }).catch(() => {})
})
