import { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { ArrowUpRight, Bell, FlaskConical, House, List, RotateCcw, ShieldCheck, Wallet, X } from 'lucide-react'
import { useDemo } from '../lib/DemoContext'
const navItems = [
  { to: '/', icon: House, label: 'Overview' }, { to: '/chat', icon: ArrowUpRight, label: 'Make a payment' },
  { to: '/approvals', icon: Bell, label: 'Approvals' }, { to: '/activity', icon: List, label: 'Activity' }, { to: '/rules', icon: ShieldCheck, label: 'Family rules' },
]
export function AppShell() {
  const { state, act, reset, storageWarning } = useDemo()
  const [resetOpen, setResetOpen] = useState(false)
  const modalRef = useRef<HTMLElement>(null)
  const pending = state.intents.filter((i) => i.status === 'pending').length
  const parent = state.role === 'parent'
  useEffect(() => {
    if (!resetOpen) return
    const previous = document.activeElement as HTMLElement | null
    const buttons = modalRef.current?.querySelectorAll<HTMLButtonElement>('button')
    buttons?.[0]?.focus()
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setResetOpen(false)
      if (event.key !== 'Tab' || !buttons?.length) return
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus() }
  }, [resetOpen])
  return <div className="app-shell">
    <a href="#main" className="skip-link">Skip to content</a>
    <aside className="sidebar"><Link className="brand" to="/" aria-label="Kin overview"><span className="brand-symbol" aria-hidden="true">k</span>kin<span className="brand-period">.</span></Link><p className="sidebar-subtitle">A little closer, every day.</p>
      <nav aria-label="Main navigation" className="side-nav">{navItems.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `side-nav-link ${isActive ? 'active' : ''}`}><Icon size={19} strokeWidth={1.65} /><span>{label}</span>{to === '/approvals' && pending > 0 && <span className="nav-count">{pending}</span>}</NavLink>)}</nav>
      <div className="sidebar-family"><span className="tiny-label">YOUR FAMILY SPACE</span><div className="family-avatar-pair"><span className="avatar priya">P</span><span className="avatar mom">M</span></div><strong>Priya & Mom</strong><p>London ↔ Mumbai</p><span className="connected-label"><span />Connected by care.</span></div>
      <div className="sidebar-bottom"><NavLink className="lab-link" to="/testnet"><FlaskConical size={17} /> Testnet lab <ArrowUpRight size={14} /></NavLink><p>Real signing. Separate experiment.</p><button className="text-button reset-button" onClick={() => setResetOpen(true)}><RotateCcw size={13} />Reset demo</button></div>
    </aside>
    <div className="app-main"><div className="demo-ribbon"><span><span className="demo-dot" /><strong>LOCAL DEMO</strong><span className="demo-description">Sample credits. No real money movement.</span></span><Link to="/testnet">Explore testnet lab <ArrowUpRight size={13} /></Link></div>
      <header className="topbar"><Link className="brand mobile-brand" to="/">kin<span className="brand-period">.</span></Link><div className="breadcrumb"><Wallet size={16} strokeWidth={1.5} /><span>Family wallet</span><span className="breadcrumb-slash">/</span><strong>{parent ? 'Mom’s space' : 'Priya’s space'}</strong></div><div className="role-control"><span className="micro muted">Demo view</span><div className="role-switch" aria-label="Switch demo role"><button onClick={() => act({ type: 'role', role: 'student' })} aria-pressed={!parent} className={!parent ? 'selected' : ''}>Priya</button><button onClick={() => act({ type: 'role', role: 'parent' })} aria-pressed={parent} className={parent ? 'selected' : ''}>Mom</button></div><span className={`avatar avatar-sm ${parent ? 'mom' : 'priya'}`} aria-hidden="true">{parent ? 'M' : 'P'}</span></div></header>
      <main id="main" className="content-area"><Outlet /></main>
      <footer className="app-footer"><button className="text-button footer-reset" onClick={() => setResetOpen(true)}><RotateCcw size={12} />Reset demo</button><span>Made for the people you call home.</span><span>USD demo credits · Role switch is not authentication{storageWarning ? ' · Storage unavailable: changes last only this session.' : ' · Saved on this browser'}</span></footer>
    </div>
    <nav className="bottom-nav" aria-label="Mobile navigation">{navItems.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`} aria-label={label}><Icon size={20} strokeWidth={1.7} /><span>{to === '/' ? 'Home' : to === '/chat' ? 'Pay' : to === '/rules' ? 'Rules' : label}</span>{to === '/approvals' && pending > 0 && <span className="mobile-count">{pending}</span>}</NavLink>)}</nav>
    {resetOpen && <div className="modal-overlay"><section ref={modalRef} className="modal-card" role="dialog" aria-modal="true" aria-labelledby="reset-heading"><button className="icon-button modal-close" aria-label="Cancel reset" onClick={() => setResetOpen(false)}><X size={20} /></button><span className="empty-icon"><RotateCcw size={24} /></span><h2 id="reset-heading">A fresh family story?</h2><p className="muted">Reset the sample credits, receipts, requests, and rules on this browser. Your testnet wallet is separate.</p><div className="button-row"><button className="btn btn-secondary" onClick={() => setResetOpen(false)}>Keep this demo</button><button className="btn btn-primary" onClick={() => { reset(); setResetOpen(false) }}>Reset demo</button></div></section></div>}
  </div>
}
