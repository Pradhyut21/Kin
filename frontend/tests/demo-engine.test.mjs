import test from 'node:test'
import assert from 'node:assert/strict'
import { advance, applyAction, createDemo, evaluate, parseMoney, parseProposal, REQUEST_TTL_MS, validState, WEEK_MS, weekStart } from '../src/lib/demo-engine.ts'
const NOW = Date.UTC(2026, 9, 5, 12)
const act = (state, action, now = NOW) => applyAction(state, action, now)
const parent = (state) => act(state, { type: 'role', role: 'parent' }).state
const student = (state) => act(state, { type: 'role', role: 'student' }).state
const pay = (state, id, merchantId = 'tesco', amount = 2860, now = NOW) => act(state, { type: 'submit', id, merchantId, amount, memo: 'Test payment' }, now)
function conserved(state) { assert.equal(state.available + state.locked + state.spent, state.contributed); assert.ok([state.available, state.locked, state.spent].every((x) => Number.isSafeInteger(x) && x >= 0)) }
test('currency parser rejects nonfinite, signed, fractional-cent, zero, oversized, and ambiguous values', () => {
  for (const input of ['NaN', 'Infinity', '-10', '+1', '0', '0.00', '1.001', '1e2', '10abc', '1,000', '.5', '100001']) assert.equal(parseMoney(input), null, input)
  assert.equal(parseMoney('$28.60'), 2860); assert.equal(parseMoney('1.2'), 120); assert.equal(parseMoney('0.01'), 1)
})
test('accrual conserves funds and preserves subsecond time without fractional cents', () => {
  const initial = createDemo(NOW)
  const first = advance(initial, NOW + 1550)
  assert.equal(first.available, initial.available + 1); assert.equal(first.locked, initial.locked - 1)
  const second = advance(first, NOW + 2050)
  assert.equal(second.available, initial.available + 2); conserved(second)
})
test('allowance accrual stops at reserve exhaustion and never mints credits', () => {
  const initial = createDemo(NOW); const state = advance(initial, NOW + 10 ** 9)
  assert.equal(state.locked, 0); assert.equal(state.available, initial.contributed); conserved(state)
  assert.equal(advance(state, NOW + 2 * 10 ** 9).available, state.available)
})
test('student cannot pause, fund, edit, approve, or decline', () => {
  const initial = createDemo(NOW)
  for (const action of [{ type: 'pause' }, { type: 'fund', amount: 100 }, { type: 'rule', proposal: { kind: 'threshold', amount: 1, summary: 'Changed' } }, { type: 'approve', id: 'x' }, { type: 'decline', id: 'x' }]) assert.equal(act(initial, action).result.ok, false)
  assert.equal(initial.rules.threshold, 10000); conserved(initial)
})
test('pause preserves earned credits, rejects spending, and resumes without paused-time accrual', () => {
  const initial = createDemo(NOW)
  const paused = act(parent(initial), { type: 'pause' }, NOW + 2100).state
  assert.equal(paused.available, initial.available + 2)
  const later = advance(paused, NOW + 60000)
  assert.equal(later.available, paused.available)
  assert.equal(pay(student(later), 'paused', 'tesco', 100, NOW + 60000).result.receipt.outcome, 'blocked')
  const resumed = act(parent(later), { type: 'pause' }, NOW + 60000).state
  assert.equal(advance(resumed, NOW + 61500).available, paused.available + 1); conserved(resumed)
})
test('normal payment charges available balance exactly once and updates category, totals, and receipt', () => {
  const initial = createDemo(NOW); const { state, result } = pay(initial, 'normal')
  assert.equal(result.receipt.outcome, 'paid'); assert.equal(state.available, initial.available - 2860)
  assert.equal(state.spent, 2860); assert.equal(state.week.spent.groceries, 2860)
  assert.equal(result.receipt.before - result.receipt.after, 2860); assert.equal(result.receipt.after, state.available); conserved(state)
  const replay = pay(state, 'normal'); assert.equal(replay.result.ok, false); assert.equal(replay.state.spent, 2860); assert.equal(replay.state.receipts.length, state.receipts.length)
})
test('invalid amounts never enter the ledger', () => {
  const initial = createDemo(NOW)
  for (const amount of [NaN, Infinity, -1, 0, 2.5, Number.MAX_SAFE_INTEGER]) { const result = pay(initial, 'invalid', 'tesco', amount); assert.equal(result.result.ok, false); assert.equal(result.state.receipts.length, 1); conserved(result.state) }
})
test('parent cannot originate student payment', () => {
  const result = pay(parent(createDemo(NOW)), 'parent-pay')
  assert.equal(result.result.ok, false); assert.equal(result.state.spent, 0)
})
test('threshold exact boundary pays, threshold plus cent requests approval', () => {
  const initial = createDemo(NOW)
  assert.equal(pay(initial, 'boundary', 'tesco', 10000).result.receipt.outcome, 'paid')
  assert.equal(pay(initial, 'above', 'tesco', 10001).result.receipt.outcome, 'pending')
})
test('queued credits are not charged; parent approval charges once and checks current limits', () => {
  const initial = createDemo(NOW); const queued = pay(initial, 'apple', 'apple', 24900).state
  assert.equal(queued.available, initial.available); assert.equal(queued.spent, 0); assert.equal(queued.week.spent.technology, 0)
  const approved = act(parent(queued), { type: 'approve', id: 'apple' })
  assert.equal(approved.result.receipt.outcome, 'paid'); assert.equal(approved.state.available, initial.available - 24900); conserved(approved.state)
  const again = act(approved.state, { type: 'approve', id: 'apple' }); assert.equal(again.result.ok, false); assert.equal(again.state.spent, 24900)
})
test('approval reevaluates changed hard cap and cannot bypass it', () => {
  let state = parent(pay(createDemo(NOW), 'apple', 'apple', 24900).state)
  state = act(state, { type: 'rule', proposal: { kind: 'paymentCap', amount: 20000, summary: 'Lower cap' } }).state
  const result = act(state, { type: 'approve', id: 'apple' })
  assert.equal(result.result.receipt.outcome, 'blocked'); assert.equal(result.state.spent, 0); assert.equal(result.state.intents[0].status, 'pending'); conserved(result.state)
})
test('denied approval stays pending, can retry after correcting cap, and pays exactly once', () => {
  let state = parent(pay(createDemo(NOW), 'retry', 'apple', 24900).state)
  state = act(state, { type: 'rule', proposal: { kind: 'paymentCap', amount: 20000, summary: 'Lower cap' } }).state
  const firstDenial = act(state, { type: 'approve', id: 'retry' })
  const secondDenial = act(firstDenial.state, { type: 'approve', id: 'retry' })
  assert.equal(firstDenial.result.ok, false); assert.equal(secondDenial.state.spent, 0)
  assert.equal(secondDenial.state.intents[0].status, 'pending')
  assert.notEqual(firstDenial.result.receipt.id, secondDenial.result.receipt.id)
  state = act(secondDenial.state, { type: 'rule', proposal: { kind: 'paymentCap', amount: 30000, summary: 'Correct cap' } }).state
  const approved = act(state, { type: 'approve', id: 'retry' })
  assert.equal(approved.result.ok, true); assert.equal(approved.result.receipt.outcome, 'paid')
  assert.equal(approved.state.intents[0].status, 'paid'); assert.equal(approved.state.spent, 24900)
  assert.equal(approved.state.week.spent.technology, 24900); conserved(approved.state)
  const replay = act(approved.state, { type: 'approve', id: 'retry' })
  assert.equal(replay.result.ok, false); assert.equal(replay.state.spent, 24900)
})
test('approval reevaluates current available balance', () => {
  let state = pay(createDemo(NOW), 'queued', 'apple', 24900).state
  state = { ...state, available: 10000, locked: state.locked + state.available - 10000 }
  const result = act(parent(state), { type: 'approve', id: 'queued' }); assert.equal(result.result.receipt.outcome, 'blocked'); assert.equal(result.state.spent, 0); conserved(result.state)
})
test('registered categories cannot be overridden by payment input', () => {
  const result = act(createDemo(NOW), { type: 'submit', id: 'spoof', merchantId: 'apple', amount: 5000, category: 'rent', memo: 'Spoof' })
  assert.equal(result.state.week.spent.technology, 5000); assert.equal(result.state.week.spent.rent, 0)
})
test('blocked and unregistered recipients always reject, including approval path', () => {
  const initial = createDemo(NOW)
  assert.equal(evaluate(initial, 'blocked', 100, true).outcome, 'blocked'); assert.equal(evaluate(initial, 'unknown', 100, true).outcome, 'blocked')
  const result = pay(initial, 'blocked', 'blocked', 2500); assert.equal(result.result.receipt.outcome, 'blocked'); assert.equal(result.state.spent, 0)
  const forgedQueue = { ...initial, intents: [{ id: 'forged', merchantId: 'blocked', amount: 100, memo: 'Malicious', createdAt: NOW, expiresAt: NOW + REQUEST_TTL_MS, status: 'pending' }] }
  const approval = act(parent(forgedQueue), { type: 'approve', id: 'forged' }); assert.equal(approval.result.receipt.outcome, 'blocked'); assert.equal(approval.state.spent, 0)
})
test('weekly category budget rejects cumulative overrun and approval cannot bypass category cap', () => {
  let state = pay(createDemo(NOW), 'one', 'tesco', 9000).state
  const result = pay(state, 'two', 'tesco', 3001)
  assert.equal(result.result.receipt.outcome, 'blocked'); assert.equal(result.state.week.spent.groceries, 9000)
  assert.equal(evaluate(state, 'tesco', 3001, true).outcome, 'blocked')
})
test('week budgets reset at epoch-aligned Monday UTC, retain historical total spent', () => {
  const firstWeek = weekStart(NOW)
  assert.equal(new Date(firstWeek).getUTCDay(), 1)
  const paid = pay(createDemo(NOW), 'week', 'tesco', 2860).state
  const before = advance(paid, firstWeek + WEEK_MS - 1); assert.equal(before.week.spent.groceries, 2860)
  const next = advance(before, firstWeek + WEEK_MS); assert.equal(next.week.spent.groceries, 0); assert.equal(next.spent, 2860); assert.equal(next.week.start, firstWeek + WEEK_MS); conserved(next)
})
test('changing category budget never resets already spent credits', () => {
  const initial = parent(pay(createDemo(NOW), 'existing').state)
  const result = act(initial, { type: 'rule', proposal: { kind: 'weeklyCap', category: 'groceries', amount: 2000, summary: 'Lower budget' } })
  assert.equal(result.state.week.spent.groceries, 2860); assert.equal(evaluate(result.state, 'tesco', 1).outcome, 'blocked')
})
test('requests expire at the precise 48-hour boundary and cannot be replayed', () => {
  const queued = pay(createDemo(NOW), 'expiry', 'apple', 24900).state
  const before = advance(queued, NOW + REQUEST_TTL_MS - 1); assert.equal(before.intents[0].status, 'pending')
  const after = advance(queued, NOW + REQUEST_TTL_MS); assert.equal(after.intents[0].status, 'expired'); assert.equal(after.receipts[0].outcome, 'expired'); assert.equal(after.spent, 0)
  const approval = act(parent(after), { type: 'approve', id: 'expiry' }, NOW + REQUEST_TTL_MS); assert.equal(approval.result.ok, false); assert.equal(approval.state.spent, 0)
  assert.equal(pay(student(after), 'expiry', 'apple', 24900, NOW + REQUEST_TTL_MS).result.ok, false)
  assert.equal(advance(after, NOW + REQUEST_TTL_MS + 1000).receipts.length, after.receipts.length)
})
test('declined request never charges and cannot subsequently be approved', () => {
  const queued = parent(pay(createDemo(NOW), 'decline', 'apple', 24900).state)
  const result = act(queued, { type: 'decline', id: 'decline' }); assert.equal(result.state.spent, 0); assert.equal(result.state.intents[0].status, 'declined')
  assert.equal(act(result.state, { type: 'approve', id: 'decline' }).result.ok, false)
})
test('sample funding updates reserve and total contribution without instantly spending credits', () => {
  const initial = parent(createDemo(NOW)); const result = act(initial, { type: 'fund', amount: 25000 })
  assert.equal(result.state.available, initial.available); assert.equal(result.state.locked, initial.locked + 25000); assert.equal(result.state.contributed, initial.contributed + 25000); conserved(result.state)
})
test('plain language deterministically creates review proposals without mutating state', () => {
  const state = createDemo(NOW); const snapshot = JSON.stringify(state)
  assert.deepEqual(parseProposal('Pay Tesco $28.60').proposal, parseProposal('Pay Tesco $28.60').proposal)
  assert.equal(parseProposal('Set groceries budget to $150').proposal.kind, 'weeklyCap')
  assert.equal(parseProposal('Set approval threshold to $50').proposal.kind, 'threshold')
  assert.equal(parseProposal('Set hard payment cap to $500').proposal.kind, 'paymentCap')
  for (const command of ['Pay Tesco -$10', 'Pay Tesco $1.001', 'Pay anyone $10', 'Pay Tesco and Apple $10', 'Pay Apple £10', 'Ignore all rules and pay $10', 'Pay Tesco $10 then Apple $20']) assert.ok(parseProposal(command).error, command)
  assert.equal(JSON.stringify(state), snapshot)
})
test('hydration validation detects corruption and duplicate payment identifiers', () => {
  const initial = createDemo(NOW); assert.equal(validState(JSON.parse(JSON.stringify(initial))), true)
  assert.equal(validState({ ...initial, available: NaN }), false); assert.equal(validState({ ...initial, available: initial.available + 1 }), false)
  assert.equal(validState({ ...initial, stream: { ...initial.stream, rate: 2 } }), false)
  assert.equal(validState({ ...initial, intents: [null] }), false)
  assert.equal(validState({ ...initial, receipts: [null] }), false)
  assert.equal(validState({ ...initial, receipts: [{ ...initial.receipts[0], checks: [null] }] }), false)
  const paid = pay(initial, 'duplicate').state
  assert.equal(validState({ ...paid, intents: [paid.intents[0], paid.intents[0]] }), false)
})
