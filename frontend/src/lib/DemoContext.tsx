import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { applyAction, createDemo, validState, type Action, type DemoState, type Result } from './demo-engine'
export const STORAGE_KEY = 'kin.demo.v3'
interface DemoContextValue { state: DemoState; act: (action: Action) => Result; reset: () => void; storageWarning: boolean }
const Context = createContext<DemoContextValue | null>(null)
function restore(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (validState(parsed)) return applyAction(parsed, { type: 'tick' }).state
  } catch { /* Invalid/disabled browser storage starts a fresh demo. */ }
  return createDemo()
}
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(restore)
  const [storageWarning, setStorageWarning] = useState(false)
  const stateRef = useRef(state)
  const act = (action: Action): Result => {
    const result = applyAction(stateRef.current, action)
    stateRef.current = result.state
    setState(result.state)
    return result.result
  }
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setStorageWarning(false) } catch { setStorageWarning(true) }
  }, [state])
  useEffect(() => {
    const interval = window.setInterval(() => act({ type: 'tick' }), 1000)
    return () => window.clearInterval(interval)
  }, [])
  const reset = () => { const fresh = createDemo(); stateRef.current = fresh; setState(fresh) }
  return <Context.Provider value={{ state, act, reset, storageWarning }}>{children}</Context.Provider>
}
export function useDemo() { const context = useContext(Context); if (!context) throw new Error('DemoProvider required'); return context }
export const newId = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`
