import { ArrowUpRight, Check, CheckCircle2, Clock3, ShieldCheck, X, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CATEGORY_LABELS, money, type Merchant, type Receipt } from '../lib/demo-engine'
export function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{subtitle}</p></div>{action}</div>
}
export function MerchantMark({ merchant, small = false }: { merchant?: Merchant; small?: boolean }) {
  return <div className={`merchant-mark ${merchant?.color ?? 'olive'} ${small ? 'small' : ''}`} aria-hidden="true">{merchant?.initials ?? <ShieldCheck size={19} />}</div>
}
export const outcomeLabel = (outcome: Receipt['outcome']) => ({ paid: 'Demo paid', pending: 'Needs Mom', declined: 'Declined', blocked: 'Blocked', expired: 'Expired', funded: 'Sample funding', rule: 'Rule updated', stream: 'Allowance' })[outcome]
export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const Icon = receipt.outcome === 'paid' ? CheckCircle2 : receipt.outcome === 'pending' ? Clock3 : receipt.outcome === 'blocked' || receipt.outcome === 'declined' || receipt.outcome === 'expired' ? XCircle : ShieldCheck
  return <section className={`panel receipt-card ${receipt.outcome}`} aria-label="Evaluation receipt">
    <div className="receipt-top"><span className={`receipt-icon ${receipt.outcome}`}><Icon size={23} /></span><div><p className="eyebrow">LOCAL DEMO RECEIPT</p><h2>{outcomeLabel(receipt.outcome)}</h2></div>{receipt.amount > 0 && <strong className="receipt-amount">{money(receipt.amount)}</strong>}</div>
    <p className="receipt-reason">{receipt.reason}</p>
    {receipt.checks.length > 0 && <ul className="check-list">{receipt.checks.map((check) => <li key={check.name}><span className={check.passed ? 'check-pass' : 'check-fail'}>{check.passed ? <Check size={15} /> : <X size={15} />}</span><div><strong>{check.name}</strong><p>{check.detail}</p></div></li>)}</ul>}
    <div className="receipt-ledger"><div><span>Available before</span><strong>{money(receipt.before)}</strong></div><div><span>Available after</span><strong>{money(receipt.after)}</strong></div><div><span>Reserved after</span><strong>{money(receipt.locked)}</strong></div></div>
    <p className="micro muted receipt-reference">Rule version {receipt.ruleVersion} · {receipt.id.slice(0, 24)} · No external settlement</p>
  </section>
}
export function ReceiptRow({ receipt }: { receipt: Receipt }) {
  return <div className="activity-row"><div className={`activity-symbol ${receipt.outcome}`} aria-hidden="true">{receipt.outcome === 'paid' ? <ArrowUpRight size={19} /> : receipt.outcome === 'pending' ? <Clock3 size={18} /> : receipt.outcome === 'blocked' ? <X size={18} /> : <ShieldCheck size={18} />}</div><div className="activity-info"><strong>{receipt.title}</strong><span>{new Date(receipt.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {outcomeLabel(receipt.outcome)}</span></div><span className={`activity-value ${receipt.outcome}`}>{receipt.amount > 0 ? `${receipt.outcome === 'paid' ? '−' : receipt.outcome === 'funded' ? '+' : ''}${money(receipt.amount)}` : '—'}</span></div>
}
export function EmptyState({ title, description, link, label }: { title: string; description: string; link?: string; label?: string }) {
  return <div className="empty-state"><span className="empty-icon"><ShieldCheck size={28} strokeWidth={1.4} /></span><h3>{title}</h3><p className="muted">{description}</p>{link && <Link className="btn btn-secondary" to={link}>{label}</Link>}</div>
}
export function MerchantDetails({ merchant }: { merchant: Merchant }) {
  return <div className="merchant-details"><MerchantMark merchant={merchant} /><div><strong>{merchant.name}</strong><p className="muted">{CATEGORY_LABELS[merchant.category]} · {merchant.blocked ? 'Blocked recipient' : 'Registered demo recipient'}</p></div></div>
}
