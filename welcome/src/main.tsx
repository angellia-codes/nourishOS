import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
// The Basalt tokens the internal app defines — the only thing this app borrows
// from src/, and it is a stylesheet, not code.
import '../../src/styles/globals.css'
// welcome-portal.md §9's scoped exception, layered on top of those tokens.
import './glass.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
