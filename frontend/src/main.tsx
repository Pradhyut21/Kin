import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AppShell } from './components/AppShell'
import { OnboardingPage } from './pages/OnboardingPage'
import { HomePage } from './pages/HomePage'
import { ChatPage } from './pages/ChatPage'
import { ApprovalsPage } from './pages/ApprovalsPage'
import { ActivityPage } from './pages/ActivityPage'
import { RulesPage } from './pages/RulesPage'
import { OnRampPage } from './pages/OnRampPage'
import { DemoProvider } from './lib/DemoContext'
const TestnetPage = lazy(() => import('./pages/TestnetPage').then((module) => ({ default: module.TestnetPage })))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter><DemoProvider>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/add-money" element={<OnRampPage />} />
          <Route path="/testnet" element={<Suspense fallback={<div className="panel" role="status">Opening the separate testnet lab…</div>}><TestnetPage /></Suspense>} />
        </Route>
        <Route path="*" element={<OnboardingPage />} />
      </Routes>
    </DemoProvider></HashRouter>
  </React.StrictMode>
)
