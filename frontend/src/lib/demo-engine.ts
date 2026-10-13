// The local demo is a simulator. These rules do not authorize real money movement.
export type Role = 'student' | 'parent'
export type Category = 'groceries' | 'rent' | 'transport' | 'technology' | 'entertainment'
export const CATEGORIES: Category[] = ['groceries', 'rent', 'transport', 'technology', 'entertainment']
export const CATEGORY_LABELS: Record<Category, string> = { groceries: 'Groceries', rent: 'Housing', transport: 'Transport', technology: 'Technology', entertainment: 'Entertainment' }
export interface Merchant { id: string; name: string; category: Category; initials: string; color: string; blocked: boolean; description: string }
export const MERCHANTS: readonly Merchant[] = [
  { id: 'tesco', name: 'Tesco', category: 'groceries', initials: 'T', color: 'rose', blocked: false, description: 'Groceries & everyday essentials' },
  { id: 'rent', name: 'Southbank Living', category: 'rent', initials: 'S', color: 'sand', blocked: false, description: 'Priya’s student accommodation' },
  { id: 'apple', name: 'Apple', category: 'technology', initials: 'a', color: 'lavender', blocked: false, description: 'Devices & study equipment' },
  { id: 'tfl', name: 'Transport for London', category: 'transport', initials: 'Tf', color: 'blue', blocked: false, description: 'Tube, bus & rail travel' },
  { id: 'blocked', name: 'Lucky Spins', category: 'entertainment', initials: '!', color: 'rose', blocked: true, description: 'Blocked recipient · gambling' },
]
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MONDAY_EPOCH = Date.UTC(1970, 0, 5)
export const REQUEST_TTL_MS = 48 * 60 * 60 * 1000
export const weekStart = (time: number) => MONDAY_EPOCH + Math.floor((time - MONDAY_EPOCH) / WEEK_MS) * WEEK_MS
export const money = (minor: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(minor / 100)
export function parseMoney(input: string): number | null {
  const clean = input.trim().replace(/^\$\s*/, '')
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(clean)) return null
  const [whole, fraction = ''] = clean.split('.')
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(value) && value > 0 && value <= 10_000_000 ? value : null
}
const emptySpent = (): Record<Category, number> => ({ groceries: 0, rent: 0, transport: 0, technology: 0, entertainment: 0 })
export interface Rules { version: number; threshold: number; paymentCap: number; weeklyCaps: Record<Category, number> }
export interface Check { name: string; passed: boolean; detail: string }
export interface Evaluation { outcome: 'allowed' | 'approval' | 'blocked'; reason: string; checks: Check[]; merchant?: Merchant }
export interface Intent { id: string; merchantId: string; amount: number; memo: string; createdAt: number; expiresAt: number; status: 'pending' | 'paid' | 'declined' | 'blocked' | 'expired' }
export interface Receipt {
  id: string; intentId?: string; title: string; amount: number; at: number; outcome: 'paid' | 'pending' | 'declined' | 'blocked' | 'expired' | 'funded' | 'rule' | 'stream';
  reason: string; checks: Check[]; before: number; after: number; locked: number; ruleVersion: number; weekStart: number
}
export interface DemoState {
  version: 3; role: Role; available: number; locked: number; spent: number; contributed: number;
  stream: { paused: boolean; rate: number; settledAt: number }; rules: Rules;
  week: { start: number; spent: Record<Category, number> }; intents: Intent[]; receipts: Receipt[]
}
export function createDemo(now = Date.now()): DemoState {
  return {
    version: 3, role: 'student', available: 184250, locked: 60000, spent: 0, contributed: 244250,
    stream: { paused: false, rate: 1, settledAt: now },
    rules: { version: 1, threshold: 10000, paymentCap: 100000, weeklyCaps: { groceries: 12000, rent: 100000, transport: 8000, technology: 40000, entertainment: 7500 } },
    week: { start: weekStart(now), spent: emptySpent() }, intents: [], receipts: [{
      id: 'initial-funding', title: 'Sample family wallet created', amount: 244250, at: now, outcome: 'funded',
      reason: '$1,842.50 available + $600.00 in the allowance reserve. Sample credits only.', checks: [], before: 0, after: 184250, locked: 60000, ruleVersion: 1, weekStart: weekStart(now),
    }],
  }
}
export function advance(state: DemoState, now = Date.now()): DemoState {
  if (!Number.isFinite(now) || now < state.stream.settledAt) return state
  let next = state
  if (weekStart(now) !== state.week.start) next = { ...next, week: { start: weekStart(now), spent: emptySpent() } }
  if (next.stream.paused || next.locked === 0) {
    next = { ...next, stream: { ...next.stream, settledAt: now } }
  } else {
    const seconds = Math.floor((now - next.stream.settledAt) / 1000)
    if (seconds > 0) {
      const amount = Math.min(next.locked, seconds * next.stream.rate)
      next = { ...next, available: next.available + amount, locked: next.locked - amount, stream: { ...next.stream, settledAt: next.stream.settledAt + seconds * 1000 } }
    }
  }
  const expired = next.intents.filter((i) => i.status === 'pending' && now >= i.expiresAt)
  if (expired.length) {
    next = { ...next, intents: next.intents.map((i) => expired.some((e) => e.id === i.id) ? { ...i, status: 'expired' as const } : i), receipts: [...expired.map((i) => makeReceipt(next, {
      id: `${i.id}-expired`, intentId: i.id, title: MERCHANTS.find((m) => m.id === i.merchantId)?.name ?? 'Payment request', amount: i.amount, at: now, outcome: 'expired', reason: 'Request expired after 48 hours. No credits were deducted.', checks: [],
    })), ...next.receipts] }
  }
  return next
}
export function evaluate(state: DemoState, merchantId: string, amount: number, approved = false): Evaluation {
  const merchant = MERCHANTS.find((m) => m.id === merchantId)
  const valid = Number.isSafeInteger(amount) && amount > 0
  const checks: Check[] = [
    { name: 'Allowance status', passed: !state.stream.paused, detail: state.stream.paused ? 'Mom paused the allowance. Spending is suspended until she resumes it; earned credits are preserved.' : 'The family allowance is active.' },
    { name: 'Valid amount', passed: valid, detail: 'A positive amount with at most two decimal places.' },
    { name: 'Recipient registry', passed: !!merchant && !merchant.blocked, detail: merchant?.blocked ? 'This recipient is blocked. Parent approval cannot override this.' : merchant ? `${merchant.name} is registered as ${CATEGORY_LABELS[merchant.category].toLowerCase()}.` : 'Unknown recipients are not allowed in this demo.' },
    { name: 'Payment limit', passed: valid && amount <= state.rules.paymentCap, detail: `${money(state.rules.paymentCap)} maximum per payment, including approved payments.` },
    { name: 'Available balance', passed: valid && amount <= state.available, detail: `${money(state.available)} available. Reserved allowance is not spendable.` },
    { name: 'Weekly category budget', passed: !!merchant && valid && (state.week.spent[merchant.category] + amount <= state.rules.weeklyCaps[merchant.category]), detail: merchant ? `${money(state.week.spent[merchant.category])} used of ${money(state.rules.weeklyCaps[merchant.category])} for ${CATEGORY_LABELS[merchant.category].toLowerCase()}.` : 'A registered recipient determines the category.' },
  ]
  const failed = checks.find((c) => !c.passed)
  if (failed) return { outcome: 'blocked', reason: failed.detail, checks, merchant }
  const needsApproval = amount > state.rules.threshold && !approved
  checks.push({ name: 'Family approval', passed: !needsApproval, detail: approved ? 'Mom explicitly approved this request. All hard limits were checked again.' : `Payments above ${money(state.rules.threshold)} need Mom’s approval.` })
  return { outcome: needsApproval ? 'approval' : 'allowed', reason: needsApproval ? 'Ask Mom first. Credits stay available until she approves.' : approved ? 'Approved by Mom and all current limits passed.' : 'Within your family’s rules. Ready to pay.', checks, merchant }
}
type ReceiptInput = Pick<Receipt, 'id' | 'title' | 'amount' | 'at' | 'outcome' | 'reason' | 'checks'> & { intentId?: string; before?: number }
function makeReceipt(state: DemoState, fields: ReceiptInput): Receipt {
  return { before: state.available, after: state.available, locked: state.locked, ruleVersion: state.rules.version, weekStart: state.week.start, ...fields }
}
export type RuleProposal = { kind: 'threshold' | 'paymentCap'; amount: number; summary: string } | { kind: 'weeklyCap'; category: Category; amount: number; summary: string }
export type Proposal = { kind: 'payment'; merchantId: string; amount: number; memo: string; summary: string } | RuleProposal
export function parseProposal(text: string): { proposal?: Proposal; error?: string } {
  const lower = text.trim().toLowerCase()
  if (/[£₹]|\b(inr|gbp|rupees|pounds)\b/.test(lower)) return { error: 'Use USD demo credits ($). This demo does not convert or transfer real currencies.' }
  const values = lower.match(/(?:\$\s*)?\d+(?:\.\d+)?/g) ?? []
  if (values.length !== 1 || /[-+]\s*\$?\s*\d/.test(lower)) return { error: 'Include exactly one positive dollar amount, for example “Pay Tesco $28.60”.' }
  const amount = parseMoney(values[0])
  if (amount === null) return { error: 'Enter a positive amount with no more than two decimal places.' }
  if (/\b(set|limit|cap|threshold|approval|budget)\b/.test(lower)) {
    if (/\b(threshold|approval)\b/.test(lower)) return { proposal: { kind: 'threshold', amount, summary: `Ask Mom for payments above ${money(amount)}.` } }
    if (/\b(payment|per.payment|single|hard)\b/.test(lower)) return { proposal: { kind: 'paymentCap', amount, summary: `Set the hard limit per payment to ${money(amount)}.` } }
    const category = CATEGORIES.find((c) => lower.includes(c) || (c === 'groceries' && lower.includes('grocery')) || (c === 'rent' && lower.includes('housing')))
    if (category) return { proposal: { kind: 'weeklyCap', category, amount, summary: `Set the ${CATEGORY_LABELS[category].toLowerCase()} weekly budget to ${money(amount)}.` } }
    return { error: 'Name a category, approval threshold, or payment cap. Existing rules have not changed.' }
  }
  const merchants = MERCHANTS.filter((m) => lower.includes(m.name.toLowerCase()) || (m.id === 'rent' && /\b(rent|landlord|southbank)\b/.test(lower)) || (m.id === 'blocked' && /\b(casino|gambling|lucky spins)\b/.test(lower)) || (m.id === 'tfl' && /\b(tfl|tube|transport)\b/.test(lower)))
  if (merchants.length !== 1) return { error: 'Name exactly one registered recipient: Tesco, Southbank Living, Apple, TfL, or Lucky Spins.' }
  return { proposal: { kind: 'payment', merchantId: merchants[0].id, amount, memo: text.trim().slice(0, 200), summary: `Pay ${money(amount)} to ${merchants[0].name}.` } }
}
export type Action =
  | { type: 'tick' }
  | { type: 'role'; role: Role }
  | { type: 'submit'; id: string; merchantId: string; amount: number; memo: string }
  | { type: 'approve' | 'decline'; id: string }
  | { type: 'rule'; proposal: RuleProposal }
  | { type: 'pause' }
  | { type: 'fund'; amount: number }
export interface Result { ok: boolean; message: string; receipt?: Receipt }
export function applyAction(original: DemoState, action: Action, now = Date.now()): { state: DemoState; result: Result } {
  let state = advance(original, now)
  const error = (message: string) => ({ state, result: { ok: false, message } })
  if (action.type === 'tick') return { state, result: { ok: true, message: '' } }
  if (action.type === 'role') {
    if (action.role !== 'student' && action.role !== 'parent') return error('Choose a valid demo role.')
    return { state: { ...state, role: action.role }, result: { ok: true, message: `Demo role changed to ${action.role}. This switch is not authentication.` } }
  }
  if (action.type === 'submit') {
    if (state.role !== 'student') return error('Switch to Priya’s student demo to request a payment.')
    if (!action.id || state.intents.some((i) => i.id === action.id)) return error('This payment identifier was already used. No credits were deducted again.')
    if (!Number.isSafeInteger(action.amount) || action.amount <= 0 || action.amount > 10_000_000) return error('Enter a valid positive amount in cents.')
    const evaluation = evaluate(state, action.merchantId, action.amount)
    const outcome = evaluation.outcome === 'allowed' ? 'paid' : evaluation.outcome === 'approval' ? 'pending' : 'blocked'
    const before = state.available
    if (outcome === 'paid' && evaluation.merchant) state = charge(state, evaluation.merchant.category, action.amount)
    const intent: Intent = { id: action.id, merchantId: action.merchantId, amount: action.amount, memo: action.memo.slice(0, 200), createdAt: now, expiresAt: now + REQUEST_TTL_MS, status: outcome }
    const receipt = makeReceipt(state, { id: `${action.id}-created`, intentId: action.id, title: evaluation.merchant?.name ?? 'Unknown recipient', amount: action.amount, at: now, outcome, reason: outcome === 'paid' ? 'Confirmed by Priya. All family checks passed, and the local demo balance was updated.' : evaluation.reason, checks: evaluation.checks, before })
    state = { ...state, intents: [intent, ...state.intents], receipts: [receipt, ...state.receipts] }
    return { state, result: { ok: outcome !== 'blocked', message: outcome === 'paid' ? 'Demo payment recorded.' : outcome === 'pending' ? 'Request sent to Mom’s demo inbox. Nothing charged yet.' : 'Payment blocked. No credits were deducted.', receipt } }
  }
  if (state.role !== 'parent') return error('Only Mom’s parent demo can approve payments, edit rules, or manage the allowance.')
  if (action.type === 'approve' || action.type === 'decline') {
    const intent = state.intents.find((i) => i.id === action.id)
    if (!intent || intent.status !== 'pending') return error('This request is no longer pending. It cannot be approved or processed twice.')
    if (now >= intent.expiresAt) return error('This request expired. Ask Priya to submit a new one.')
    const evaluation = evaluate(state, intent.merchantId, intent.amount, true)
    const outcome = action.type === 'decline' ? 'declined' : evaluation.outcome === 'allowed' ? 'paid' : 'blocked'
    const before = state.available
    if (outcome === 'paid' && evaluation.merchant) state = charge(state, evaluation.merchant.category, intent.amount)
    const receipt = makeReceipt(state, { id: `${intent.id}-${outcome}-${state.receipts.length}`, intentId: intent.id, title: evaluation.merchant?.name ?? 'Unknown recipient', amount: intent.amount, at: now, outcome, reason: outcome === 'declined' ? 'Mom declined the request. No credits were deducted.' : outcome === 'blocked' ? `${evaluation.reason} The request remains pending until it expires.` : evaluation.reason, checks: evaluation.checks, before })
    const nextStatus: Intent['status'] = outcome === 'blocked' ? 'pending' : outcome
    state = { ...state, intents: state.intents.map((i) => i.id === intent.id ? { ...i, status: nextStatus } : i), receipts: [receipt, ...state.receipts] }
    return { state, result: { ok: outcome !== 'blocked', message: outcome === 'paid' ? 'Approved and recorded in the demo ledger.' : outcome === 'declined' ? 'Request declined.' : 'Current rules blocked this approval. No credits were deducted. The request remains pending until it expires.', receipt } }
  }
  if (action.type === 'rule') {
    const proposal = action.proposal
    if (!['threshold', 'paymentCap', 'weeklyCap'].includes(proposal.kind)) return error('Unknown family rule type.')
    if (!Number.isSafeInteger(proposal.amount) || proposal.amount <= 0 || proposal.amount > 10_000_000) return error('Rule amounts must be positive, finite demo credits.')
    if (proposal.kind === 'weeklyCap' && !CATEGORIES.includes(proposal.category)) return error('Unknown budget category.')
    state = { ...state, rules: { ...state.rules, version: state.rules.version + 1, ...(proposal.kind === 'weeklyCap' ? { weeklyCaps: { ...state.rules.weeklyCaps, [proposal.category]: proposal.amount } } : proposal.kind === 'threshold' ? { threshold: proposal.amount } : { paymentCap: proposal.amount }) } }
    const receipt = makeReceipt(state, { id: `rule-${state.rules.version}-${now}`, title: 'Family rule updated', amount: 0, at: now, outcome: 'rule', reason: proposal.summary, checks: [] })
    return { state: { ...state, receipts: [receipt, ...state.receipts] }, result: { ok: true, message: 'Rule applied after your review.', receipt } }
  }
  if (action.type === 'pause') {
    state = { ...state, stream: { ...state.stream, paused: !state.stream.paused, settledAt: now } }
    const receipt = makeReceipt(state, { id: `stream-${now}-${state.receipts.length}`, title: state.stream.paused ? 'Allowance paused' : 'Allowance resumed', amount: 0, at: now, outcome: 'stream', reason: state.stream.paused ? 'Accrual and spending are paused. Earned credits are preserved, and reserved credits stay in the allowance.' : 'Accrual and spending resumed. Paused time does not accrue additional credits.', checks: [] })
    return { state: { ...state, receipts: [receipt, ...state.receipts] }, result: { ok: true, message: receipt.title, receipt } }
  }
  if (action.type === 'fund') {
    if (!Number.isSafeInteger(action.amount) || action.amount <= 0 || action.amount > 10_000_000 || !Number.isSafeInteger(state.contributed + action.amount)) return error('Enter a positive sample contribution of at most $100,000.00.')
    state = { ...state, locked: state.locked + action.amount, contributed: state.contributed + action.amount, stream: { ...state.stream, settledAt: now } }
    const receipt = makeReceipt(state, { id: `fund-${now}-${state.receipts.length}`, title: 'Sample allowance topped up', amount: action.amount, at: now, outcome: 'funded', reason: 'Sample credits added to the reserved allowance. No bank, card, or crypto transaction occurred.', checks: [] })
    return { state: { ...state, receipts: [receipt, ...state.receipts] }, result: { ok: true, message: 'Sample credits added to the allowance reserve.', receipt } }
  }
  return error('Unknown demo action.')
}
function charge(state: DemoState, category: Category, amount: number): DemoState {
  return { ...state, available: state.available - amount, spent: state.spent + amount, week: { ...state.week, spent: { ...state.week.spent, [category]: state.week.spent[category] + amount } } }
}
export function validState(value: unknown): value is DemoState {
  if (!value || typeof value !== 'object') return false
  const s = value as DemoState
  const integer = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0
  return s.version === 3 && (s.role === 'student' || s.role === 'parent') && [s.available, s.locked, s.spent, s.contributed].every(integer)
    && s.available + s.locked + s.spent === s.contributed && !!s.stream && typeof s.stream.paused === 'boolean' && s.stream.rate === 1 && integer(s.stream.settledAt)
    && !!s.rules && integer(s.rules.version) && s.rules.version > 0 && integer(s.rules.threshold) && s.rules.threshold > 0 && integer(s.rules.paymentCap) && s.rules.paymentCap > 0
    && !!s.week && integer(s.week.start) && CATEGORIES.every((c) => integer(s.rules.weeklyCaps?.[c]) && s.rules.weeklyCaps[c] > 0 && integer(s.week.spent?.[c]))
    && Array.isArray(s.intents) && s.intents.every((i) => !!i && typeof i === 'object' && typeof i.id === 'string' && typeof i.merchantId === 'string' && integer(i.amount) && i.amount > 0 && typeof i.memo === 'string' && integer(i.createdAt) && integer(i.expiresAt) && ['pending', 'paid', 'declined', 'blocked', 'expired'].includes(i.status))
    && new Set(s.intents.map((i) => i.id)).size === s.intents.length
    && Array.isArray(s.receipts) && s.receipts.every((r) => !!r && typeof r === 'object' && typeof r.id === 'string' && typeof r.title === 'string' && typeof r.reason === 'string' && integer(r.amount) && integer(r.at) && integer(r.before) && integer(r.after) && integer(r.locked) && integer(r.ruleVersion) && integer(r.weekStart) && ['paid', 'pending', 'declined', 'blocked', 'expired', 'funded', 'rule', 'stream'].includes(r.outcome) && Array.isArray(r.checks) && r.checks.every((c) => !!c && typeof c === 'object' && typeof c.name === 'string' && typeof c.detail === 'string' && typeof c.passed === 'boolean'))
}
