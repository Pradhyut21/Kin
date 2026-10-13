import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Check, Clock3, ShieldCheck, Sparkles, X } from 'lucide-react'
import { newId, useDemo } from '../lib/DemoContext'
import { CATEGORY_LABELS, evaluate, MERCHANTS, money, parseMoney, parseProposal, type Proposal, type Receipt } from '../lib/demo-engine'
import { MerchantDetails, PageHeading, ReceiptCard } from '../components/Shared'
const stories = { groceries: { merchantId: 'tesco', amount: 2860, memo: 'The weekly grocery shop' }, approval: { merchantId: 'apple', amount: 24900, memo: 'Headphones for studying' }, blocked: { merchantId: 'blocked', amount: 2500, memo: 'A boundary check' } }
export function ChatPage() {
  const { state, act } = useDemo()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<'form' | 'language'>('form')
  const [merchantId, setMerchantId] = useState('tesco')
  const [amount, setAmount] = useState('28.60')
  const [memo, setMemo] = useState('')
  const [input, setInput] = useState('')
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [intentId, setIntentId] = useState(newId)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const name = params.get('story') as keyof typeof stories
    const story = stories[name]
    if (story) { setMerchantId(story.merchantId); setAmount((story.amount / 100).toFixed(2)); setMemo(story.memo); setProposal({ kind: 'payment', ...story, summary: '' }); setIntentId(newId()); setReceipt(null); setError('') }
  }, [params])
  function review() {
    setError(''); setReceipt(null)
    if (mode === 'language') {
      const result = parseProposal(input)
      if (result.error || !result.proposal) { setError(result.error ?? 'Please enter a request.'); setProposal(null); return }
      setProposal(result.proposal)
    } else {
      const parsed = parseMoney(amount)
      if (parsed === null) { setError('Enter a positive amount with at most two decimal places.'); setProposal(null); return }
      setProposal({ kind: 'payment', merchantId, amount: parsed, memo, summary: '' })
    }
    setIntentId(newId())
  }
  function confirm() {
    if (!proposal) return
    const result = proposal.kind === 'payment' ? act({ type: 'submit', id: intentId, merchantId: proposal.merchantId, amount: proposal.amount, memo: proposal.memo }) : act({ type: 'rule', proposal })
    if (result.receipt) { setReceipt(result.receipt); setProposal(null); setError('') } else setError(result.message)
  }
  const merchant = MERCHANTS.find((m) => m.id === merchantId)!
  const selectedMerchant = proposal?.kind === 'payment' ? MERCHANTS.find((m) => m.id === proposal.merchantId) : null
  const evaluation = proposal?.kind === 'payment' ? evaluate(state, proposal.merchantId, proposal.amount) : null
  return <div className="page-enter"><PageHeading eyebrow="A LITTLE FREEDOM, A LITTLE CARE" title="For the everyday. And the someday." subtitle="Choose a recipient. Review the rules. Keep your family in the loop." />
    {state.role !== 'student' && <div className="notice amber-notice"><ShieldCheck size={18} /><div>You’re in Mom’s demo view. Switch to Priya to make a payment. Rule proposals can be reviewed by Mom.</div><button className="text-button" onClick={() => act({ type: 'role', role: 'student' })}>Switch to Priya <ArrowRight size={14} /></button></div>}
    <div className="payment-layout"><div><section className="panel payment-panel"><div className="section-title"><h2>A little out. A lot of possibility.</h2><span className="badge">USD DEMO CREDITS</span></div><div className="segmented"><button className={mode === 'form' ? 'active' : ''} aria-pressed={mode === 'form'} onClick={() => { setMode('form'); setProposal(null); setError('') }}>Payment details</button><button className={mode === 'language' ? 'active' : ''} aria-pressed={mode === 'language'} onClick={() => { setMode('language'); setProposal(null); setError('') }}><Sparkles size={14} />Plain language</button></div>
      <form onSubmit={(event) => { event.preventDefault(); review() }}>
      {mode === 'form' ? <><label className="field"><span>Who’s it for?</span><select id="merchant-select" value={merchantId} onChange={(event) => { setMerchantId(event.target.value); setProposal(null) }}>{MERCHANTS.map((m) => <option key={m.id} value={m.id}>{m.name}{m.blocked ? ' · blocked' : ''}</option>)}</select></label><div className="selected-merchant"><MerchantDetails merchant={merchant} /></div><label className="field amount-field"><span>How much?</span><div className="amount-input-wrap"><span aria-hidden="true">$</span><input id="payment-amount" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setProposal(null) }} placeholder="0.00" autoComplete="off" required maxLength={12} aria-describedby="amount-help" /><small>USD</small></div></label><p id="amount-help" className="micro muted">Available to spend: {money(state.available)} · Reserved: {money(state.locked)}</p><label className="field"><span>A little note <small>optional</small></span><input value={memo} onChange={(event) => { setMemo(event.target.value); setProposal(null) }} placeholder="What’s the plan?" maxLength={200} /></label></> : <><label className="field"><span>Say it in your own words</span><textarea id="plain-language-input" rows={4} value={input} onChange={(event) => { setInput(event.target.value); setProposal(null) }} placeholder="Pay Tesco $28.60 for groceries" required maxLength={300} /></label><div className="suggestion-chips">{['Pay Tesco $28.60', 'Pay Apple $249', 'Set groceries budget to $150'].map((text) => <button type="button" key={text} onClick={() => { setInput(text); setProposal(null) }}>{text}</button>)}</div><p className="micro muted parser-disclosure"><Sparkles size={13} />Deterministic demo parser. No external AI. Your words create a proposal for review; they never move credits or alter rules automatically.</p></>}
      <button type="submit" className="btn btn-primary btn-full" id="review-payment-btn">Review {mode === 'form' ? 'payment' : 'proposal'} <ArrowRight size={17} /></button></form>
      {error && <p className="form-error" role="alert">{error}</p>}
    </section><div className="payment-principle"><ShieldCheck size={18} /><p>The category is bound to the registered recipient. Parent approval can’t bypass a blocked recipient, a hard limit, or the available balance.</p></div></div>
    <aside className="payment-aside">{receipt ? <><ReceiptCard receipt={receipt} /><div className="button-row receipt-actions"><button className="btn btn-secondary" onClick={() => { setReceipt(null); setProposal(null) }}>Another little plan</button><Link className="btn btn-primary" to={receipt.outcome === 'pending' ? '/approvals' : '/activity'}>{receipt.outcome === 'pending' ? 'View Mom’s inbox' : 'View activity'}<ArrowUpRight size={15} /></Link></div></> : proposal ? <section className="panel review-panel" aria-label="Review proposal"><div className="section-title"><span className="eyebrow">REVIEW BEFORE YOU CONFIRM</span><span className="step-badge">02</span></div><h2>{proposal.kind === 'payment' ? 'Does this look right?' : 'A new family rule?'}</h2>{proposal.kind === 'payment' && selectedMerchant ? <><MerchantDetails merchant={selectedMerchant} /><div className="review-amount">{money(proposal.amount)}</div>{proposal.memo && <p className="muted review-memo">“{proposal.memo}”</p>}<div className={`evaluation-banner ${evaluation?.outcome}`}><span>{evaluation?.outcome === 'allowed' ? <Check size={19} /> : evaluation?.outcome === 'approval' ? <Clock3 size={18} /> : <X size={19} />}</span><div><strong>{evaluation?.outcome === 'allowed' ? 'Within the family rules' : evaluation?.outcome === 'approval' ? 'A little check-in with Mom' : 'A family boundary'}</strong><p>{evaluation?.reason}</p></div></div><ul className="check-list preview-checks">{evaluation?.checks.map((check) => <li key={check.name}><span className={check.passed ? 'check-pass' : 'check-fail'}>{check.passed ? <Check size={14} /> : <X size={14} />}</span><strong>{check.name}</strong></li>)}</ul><p className="micro muted">Rule version {state.rules.version}. All checks run again on confirmation. Requests expire after 48 hours.</p><button id="confirm-payment-btn" className="btn btn-primary btn-full" disabled={state.role !== 'student'} onClick={confirm}>{evaluation?.outcome === 'approval' ? 'Ask Mom · no charge yet' : evaluation?.outcome === 'blocked' ? 'Record blocked attempt' : `Confirm demo payment · ${money(proposal.amount)}`}<ArrowRight size={16} /></button></> : <><p className="rule-proposal-summary">{proposal.summary}</p><p className="muted">Review only. Nothing has changed yet.</p><button className="btn btn-primary btn-full" disabled={state.role !== 'parent'} onClick={confirm}>Apply reviewed rule <Check size={16} /></button>{state.role !== 'parent' && <button className="text-button" onClick={() => act({ type: 'role', role: 'parent' })}>Switch to Mom’s demo to apply</button>}</>}<button className="text-button review-cancel" onClick={() => setProposal(null)}>Cancel proposal</button></section> : <section className="payment-note"><span className="note-icon"><ShieldCheck size={32} strokeWidth={1.2} /></span><p className="eyebrow">YOUR FAMILY’S HANDSHAKE</p><h2>A little independence.<br />A lot of trust.</h2><p>Small payments happen within the rules. Bigger plans start a conversation. Some boundaries stay boundaries.</p><div className="note-rule"><span>Ask Mom above</span><strong>{money(state.rules.threshold)}</strong></div><div className="note-rule"><span>Maximum per payment</span><strong>{money(state.rules.paymentCap)}</strong></div><Link className="text-button" to="/rules">See our family rules <ArrowUpRight size={14} /></Link></section>}</aside></div>
  </div>
}
