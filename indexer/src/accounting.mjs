/** Mirrors StreamVault._checkpoint at event time; all amounts and timestamps are bigint. */
export function checkpoint(stream, timestamp) {
  if (timestamp < stream.lastWithdrawn || stream.accruedBalance > stream.depositedBalance) {
    throw new Error('Invalid stream checkpoint')
  }
  let earned = stream.accruedBalance
  if (stream.active) {
    if (stream.ratePerSecond <= 0n) throw new Error('Invalid active stream rate')
    const remaining = stream.depositedBalance - earned
    const elapsed = timestamp - stream.lastWithdrawn
    earned = elapsed > remaining / stream.ratePerSecond
      ? stream.depositedBalance
      : earned + elapsed * stream.ratePerSecond
  }
  return { ...stream, accruedBalance: earned, lastWithdrawn: timestamp }
}

export function withdraw(stream, amount, timestamp) {
  const updated = checkpoint(stream, timestamp)
  if (amount <= 0n || amount > updated.accruedBalance) throw new Error('Invalid indexed withdrawal')
  return { ...updated, accruedBalance: updated.accruedBalance - amount, depositedBalance: updated.depositedBalance - amount }
}
