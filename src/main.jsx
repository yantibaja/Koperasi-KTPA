import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './lib/toast'
import App from './App'
import './index.css'
createRoot(document.getElementById('root')).render(<HashRouter><ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider></HashRouter>)
