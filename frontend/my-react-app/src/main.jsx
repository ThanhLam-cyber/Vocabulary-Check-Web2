import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import './App.css'

// Lazy load pages để giảm initial bundle size
const ListPage = lazy(() => import('./pages/ListPage.jsx'))
const CheckPage = lazy(() => import('./pages/Checkpage.jsx'))

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
  </div>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/list" element={<ListPage />} />
          <Route path="/check" element={<CheckPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
)