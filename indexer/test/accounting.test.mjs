import assert from 'node:assert/strict'
import test from 'node:test'
import { checkpoint, withdraw } from '../src/accounting.mjs'
const initial = () => ({ ratePerSecond: 10n, depositedBalance: 1000n, accruedBalance: 0n, lastWithdrawn: 100n, active: true })

test('partial withdrawal preserves earned entitlement instead of resetting the live balance', () => {
  const s = withdraw(initial(), 60n, 110n)
  assert.equal(s.depositedBalance, 940n)
  assert.equal(s.accruedBalance, 40n)
  assert.equal(checkpoint(s, 115n).accruedBalance, 90n)
})
test('pausing retains accrued value and stops further accrual until resume', () => {
  const paused = { ...checkpoint(initial(), 110n), active: false }
  assert.equal(checkpoint(paused, 200n).accruedBalance, 100n)
  const resumed = { ...paused, lastWithdrawn: 200n, active: true }
  assert.equal(checkpoint(resumed, 205n).accruedBalance, 150n)
})
test('rate changes accrue at the old rate before applying the new rate', () => {
  const changed = { ...checkpoint(initial(), 110n), ratePerSecond: 20n }
  assert.equal(checkpoint(changed, 115n).accruedBalance, 200n)
})
test('top-up after exhaustion does not retroactively accrue the new deposit', () => {
  const exhausted = checkpoint(initial(), 1000n)
  assert.equal(exhausted.accruedBalance, 1000n)
  const funded = { ...exhausted, depositedBalance: 1500n }
  assert.equal(checkpoint(funded, 1000n).accruedBalance, 1000n)
  assert.equal(checkpoint(funded, 1010n).accruedBalance, 1100n)
})
test('overflow-sized rates saturate before multiplication and invalid withdrawals fail', () => {
  assert.equal(checkpoint({ ...initial(), ratePerSecond: 2n ** 255n }, 101n).accruedBalance, 1000n)
  assert.throws(() => withdraw(initial(), 200n, 110n), /Invalid indexed withdrawal/)
  assert.throws(() => checkpoint(initial(), 99n), /Invalid stream checkpoint/)
})
