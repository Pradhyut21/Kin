export interface Checkpoint {
  ratePerSecond: bigint
  depositedBalance: bigint
  accruedBalance: bigint
  lastWithdrawn: bigint
  active: boolean
}
export function checkpoint<T extends Checkpoint>(stream: T, timestamp: bigint): T
export function withdraw<T extends Checkpoint>(stream: T, amount: bigint, timestamp: bigint): T
