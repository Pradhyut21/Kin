import { useState } from 'react'
import { ArrowRight, Check, Clock3, ShieldCheck, X } from 'lucide-react'
import { useDemo } from '../lib/DemoContext'
import { evaluate, MERCHANTS, money, type Receipt } from '../lib/demo-engine'
import { EmptyState, MerchantDetails, PageHeading, ReceiptCard } from '../components/Shared'
export function ApprovalsPage() {
  const { state, act } = useDemo()
  const [message, setMessage] = useState('')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const pending = state.intents.filter((i) => i.status === 'pending')
  const resolved = state.intents.filter((i) => i.status !== 'pending' && state.receipts.some((r) => r.intentId === i.id && r.outcome === 'pending'))
  const parent = state.role === 'parent'
  function handle(type: 'approve' | 'decline', id: string) { const result = act({ type, id }); setMessage(result.message); setReceipt(result.receipt ?? null) }
  return <div className="page-enter"><PageHeading eyebrow="A CONVERSATION, NOT A COMPROMISE" title={parent ? 'A little yes goes a long way.' : 'Some plans are better shared.'} subtitle="The bigger purchases come here. Nothing is charged until Mom approves." action={<span className="pending-pill"><Clock3 size={15} />{pending.length} waiting</span>} />
    {!parent && <div className="notice amber-notice"><ShieldCheck size={18} /><div>You’re viewing Priya’s requests. Only Mom’s parent demo can approve or decline.</div><button className="text-button" onClick={() => act({ type: 'role', role: 'parent' })}>Switch to Mom <ArrowRight size={14} /></button></div>}
    {message && <p className="notice" role="status">{message}</p>}
    <div className="approvals-layout"><section>{pending.length === 0 ? <div className="panel"><EmptyState title="A little peace and quiet." description="No pending requests. Try the Apple purchase from the overview to start a conversation." link="/chat?story=approval" label="Try a bigger purchase" /></div> : <div className="approval-list">{pending.map((intent) => {
      const merchant = MERCHANTS.find((m) => m.id === intent.merchantId)!
      const evaluation = evaluate(state, intent.merchantId, intent.amount, true)
      const hours = Math.max(0, Math.ceil((intent.expiresAt - Date.now()) / 3600000))
      return <article key={intent.id} className="panel approval-card"><div className="section-title"><span className="badge amber-badge">PRIYA’S REQUEST</span><span className="micro muted"><Clock3 size={12} />Expires in {hours}h</span></div><MerchantDetails merchant={merchant} /><div className="approval-amount">{money(intent.amount)}</div><p className="muted">{intent.memo || 'A little purchase to consider.'}</p><div className="approval-explanation"><ShieldCheck size={17} /><p>{evaluation.outcome === 'blocked' ? evaluation.reason : 'This recipient is registered. Current hard limits, budget, and balance pass. Approval will check them again.'}</p></div><div className="button-row"><button className="btn btn-secondary" disabled={!parent} onClick={() => handle('decline', intent.id)}><X size={16} />Decline</button><button className="btn btn-primary" disabled={!parent} onClick={() => handle('approve', intent.id)}><Check size={16} />{evaluation.outcome === 'blocked' ? 'Check & reject' : 'Approve demo payment'}</button></div><p className="micro muted">Queued credits are not reserved or charged. A later spend or rule change can prevent approval.</p></article>
    })}</div>}{resolved.length > 0 && <section className="panel resolved-panel"><h2>Conversations we’ve had.</h2>{resolved.map((intent) => <div className="resolved-row" key={intent.id}><span className={intent.status === 'paid' ? 'check-pass' : 'check-fail'}>{intent.status === 'paid' ? <Check size={17} /> : <X size={17} />}</span><div><strong>{MERCHANTS.find((m) => m.id === intent.merchantId)?.name}</strong><p>{intent.status === 'paid' ? 'Approved and recorded' : intent.status}</p></div><strong>{money(intent.amount)}</strong></div>)}</section>}</section><aside>{receipt ? <ReceiptCard receipt={receipt} /> : <section className="payment-note"><span className="note-icon"><Clock3 size={31} strokeWidth={1.3} /></span><p className="eyebrow">FAMILY, IN THE LOOP</p><h2>Yes, when it fits.<br />No, when it matters.</h2><p>Approval changes one thing: the threshold check. A blocked recipient, hard cap, weekly budget, or insufficient balance always stops the payment.</p><div className="note-rule"><span>Request lifetime</span><strong>48 hours</strong></div><div className="note-rule"><span>Student access</span><strong>View only</strong></div><p className="micro muted">This parent switch is a demo control, not real authentication.</p></section>}</aside></div>
  </div>
}
