import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
// The Basalt tokens the internal app defines — the only thing the portal
// borrows from src/, and it is a stylesheet, not code.
import '../../src/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
