/** Envio v3 handlers. Addresses must be single real deployments before enabling the chain. */
import { indexer } from 'envio'
import { checkpoint, withdraw } from './accounting.mjs'

type EventKey = { chainId: number; srcAddress: string; logIndex: number; block: { number: number; timestamp: number } }
const eventId = (event: EventKey) => `${event.chainId}_${event.block.number}_${event.logIndex}`
const streamId = (event: EventKey & { params: { streamId: bigint } }) => `${event.chainId}_${event.srcAddress.toLowerCase()}_${event.params.streamId}`
const metadata = (event: EventKey) => ({ lastEventTimestamp: BigInt(event.block.timestamp), lastEventBlock: BigInt(event.block.number) })

indexer.onEvent({ contract: 'StreamVault', event: 'StreamCreated' }, async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp)
  context.Stream.set({
    id: streamId(event), vault: event.srcAddress.toLowerCase(), streamId: event.params.streamId,
    parent: event.params.parent.toLowerCase(), student: event.params.student.toLowerCase(), token: event.params.token.toLowerCase(),
    ratePerSecond: event.params.ratePerSecond, depositedBalance: event.params.depositedBalance,
    accruedBalance: 0n, startTime: timestamp, lastWithdrawn: timestamp, active: true, createdAt: timestamp, ...metadata(event),
  })
})

indexer.onEvent({ contract: 'StreamVault', event: 'StreamFunded' }, async ({ event, context }) => {
  const existing = await context.Stream.getOrThrow(streamId(event))
  const updated = checkpoint(existing, BigInt(event.block.timestamp))
  if (existing.depositedBalance + event.params.amount !== event.params.newBalance) throw new Error('Funding event inconsistent with indexed escrow')
  context.Stream.set({ ...updated, depositedBalance: event.params.newBalance, ...metadata(event) })
  context.StreamFunded.set({ id: eventId(event), streamId: event.params.streamId, amount: event.params.amount,
    newBalance: event.params.newBalance, timestamp: BigInt(event.block.timestamp) })
})

indexer.onEvent({ contract: 'StreamVault', event: 'Withdrawn' }, async ({ event, context }) => {
  const existing = await context.Stream.getOrThrow(streamId(event))
  context.Stream.set({ ...withdraw(existing, event.params.amount, BigInt(event.block.timestamp)), ...metadata(event) })
})

indexer.onEvent({ contract: 'StreamVault', event: 'RateUpdated' }, async ({ event, context }) => {
  const existing = await context.Stream.getOrThrow(streamId(event))
  context.Stream.set({ ...checkpoint(existing, BigInt(event.block.timestamp)), ratePerSecond: event.params.newRatePerSecond, ...metadata(event) })
})

indexer.onEvent({ contract: 'StreamVault', event: 'StreamPaused' }, async ({ event, context }) => {
  const existing = await context.Stream.getOrThrow(streamId(event))
  context.Stream.set({ ...checkpoint(existing, BigInt(event.block.timestamp)), active: false, ...metadata(event) })
})

indexer.onEvent({ contract: 'StreamVault', event: 'StreamResumed' }, async ({ event, context }) => {
  const existing = await context.Stream.getOrThrow(streamId(event))
  context.Stream.set({ ...existing, active: true, lastWithdrawn: BigInt(event.block.timestamp), ...metadata(event) })
})

indexer.onEvent({ contract: 'PolicyModule', event: 'SpendExecuted' }, async ({ event, context }) => {
  context.SpendEvent.set({ id: eventId(event), streamId: event.params.streamId, recipient: event.params.recipient.toLowerCase(),
    amount: event.params.amount, category: event.params.category, memo: event.params.memo, timestamp: BigInt(event.block.timestamp) })
})

indexer.onEvent({ contract: 'PolicyModule', event: 'PolicySet' }, async ({ event, context }) => {
  context.PolicyUpdate.set({ id: eventId(event), streamId: event.params.streamId, globalCap: event.params.globalCap,
    approvalThreshold: event.params.approvalThreshold, timestamp: BigInt(event.block.timestamp) })
})

function policyRecord(event: EventKey & { params: { streamId: bigint } }, kind: string, value: Record<string, string | boolean>) {
  return { id: eventId(event), streamId: event.params.streamId, kind, value: JSON.stringify(value), timestamp: BigInt(event.block.timestamp) }
}
indexer.onEvent({ contract: 'PolicyModule', event: 'CategoryCapSet' }, async ({ event, context }) => {
  context.PolicyEvent.set(policyRecord(event, 'category_cap', { category: event.params.category, limit: event.params.limit.toString(), period: event.params.period.toString() }))
})
indexer.onEvent({ contract: 'PolicyModule', event: 'AllowlistUpdated' }, async ({ event, context }) => {
  context.PolicyEvent.set(policyRecord(event, 'allowlist', { recipient: event.params.recipient.toLowerCase(), allowed: event.params.allowed }))
})
indexer.onEvent({ contract: 'PolicyModule', event: 'BlocklistUpdated' }, async ({ event, context }) => {
  context.PolicyEvent.set(policyRecord(event, 'blocklist', { recipient: event.params.recipient.toLowerCase(), blocked: event.params.blocked }))
})
indexer.onEvent({ contract: 'PolicyModule', event: 'RecipientCategorySet' }, async ({ event, context }) => {
  context.PolicyEvent.set(policyRecord(event, 'recipient_category', { recipient: event.params.recipient.toLowerCase(), category: event.params.category }))
})
indexer.onEvent({ contract: 'PolicyModule', event: 'PolicyHashUpdated' }, async ({ event, context }) => {
  context.PolicyEvent.set(policyRecord(event, 'policy_hash', { hash: event.params.hash }))
})
indexer.onEvent({ contract: 'PolicyModule', event: 'SpendQueued' }, async ({ event, context }) => {
  context.PolicyEvent.set(policyRecord(event, 'spend_queued', { requestId: event.params.requestId.toString(), recipient: event.params.recipient.toLowerCase(), amount: event.params.amount.toString() }))
})

indexer.onEvent({ contract: 'ApprovalQueue', event: 'RequestCreated' }, async ({ event, context }) => {
  context.ApprovalRequest.set({ id: `${event.chainId}_${event.srcAddress.toLowerCase()}_${event.params.requestId}`, requestId: event.params.requestId,
    streamId: event.params.streamId, student: event.params.student.toLowerCase(), recipient: event.params.recipient.toLowerCase(),
    amount: event.params.amount, memo: event.params.memo, expiresAt: event.params.expiresAt,
    status: 'pending', createdAt: BigInt(event.block.timestamp), resolvedAt: undefined })
})
indexer.onEvent({ contract: 'ApprovalQueue', event: 'RequestApproved' }, async ({ event, context }) => {
  const existing = await context.ApprovalRequest.getOrThrow(`${event.chainId}_${event.srcAddress.toLowerCase()}_${event.params.requestId}`)
  context.ApprovalRequest.set({ ...existing, status: 'approved', resolvedAt: BigInt(event.block.timestamp) })
})
indexer.onEvent({ contract: 'ApprovalQueue', event: 'RequestDeclined' }, async ({ event, context }) => {
  const existing = await context.ApprovalRequest.getOrThrow(`${event.chainId}_${event.srcAddress.toLowerCase()}_${event.params.requestId}`)
  context.ApprovalRequest.set({ ...existing, status: 'declined', resolvedAt: BigInt(event.block.timestamp) })
})
