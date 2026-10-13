/// <reference types="vite/client" />
import { BrowserProvider, Contract, FetchRequest, Interface, JsonRpcProvider, TransactionResponse, ZeroAddress, formatUnits, getAddress, id, isAddress, parseUnits } from 'ethers'
import type { Eip1193Provider, Provider, TransactionReceipt } from 'ethers'

// Official network/token sources, checked 2026-10-05. Runtime code/wiring checks remain mandatory.
export const MONAD_TESTNET = { chainId: 10143, chainHex: '0x279f', rpc: 'https://testnet-rpc.monad.xyz', explorer: 'https://testnet.monadscan.com', faucet: 'https://faucet.monad.xyz', docs: 'https://docs.monad.xyz/ai/current-facts' } as const
export const AGORA_TESTNET_AUSD = '0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC'
export const AGORA_DEPLOYMENTS = 'https://docs.agora.finance/developer/contract-deployments'

export const VAULT_ABI = [
  'function supportedToken() view returns (address)', 'function policyModule() view returns (address)',
  'function getStream(uint256) view returns (tuple(address parent,address student,address token,uint256 ratePerSecond,uint256 startTime,uint256 lastWithdrawn,uint256 depositedBalance,bool active,uint256 accruedBalance))',
  'function authorizeParent(address parent)', 'function authorizedParent(address) view returns (address)',
  'event ParentAuthorized(address indexed student,address indexed parent)',
  'function studentStream(address) view returns (uint256)', 'function streamedAmount(uint256) view returns (uint256)',
  'function createStream(address student,address token,uint256 ratePerSecond,uint256 initialDeposit) returns (uint256)',
  'function fund(uint256,uint256)', 'function pause(uint256)', 'function resume(uint256)',
  'event StreamCreated(uint256 indexed streamId,address indexed parent,address indexed student,address token,uint256 ratePerSecond,uint256 depositedBalance)',
] as const
export const POLICY_ABI = [
  'function vault() view returns (address)', 'function approvalQueue() view returns (address)',
  'function policies(uint256) view returns (uint256 globalCap,uint256 approvalThreshold,uint256 weeklyLimit,bool active)',
  'function categoryCaps(uint256,bytes32) view returns (uint256 limitPerPeriod,uint256 periodSeconds,uint256 spentThisPeriod,uint256 periodStart)',
  'function recipientCategory(uint256,address) view returns (bytes32)',
  'function blocklist(uint256,address) view returns (bool)', 'function allowlist(uint256,address) view returns (bool)',
  'function setBlocklist(uint256,address,bool)', 'function setAllowlist(uint256,address,bool)',
  'function canSpend(uint256,address,uint256,bytes32) view returns (bool allowed,bool needsApproval)',
  'function denialReason(uint256,address,uint256,bytes32) view returns (uint8)',
  'function setPolicy(uint256,uint256,uint256,uint256,bytes32)',
  'function setRecipientCategory(uint256,address,bytes32)', 'function setCategoryCap(uint256,bytes32,uint256,uint256)',
  'function executeSpend(uint256,address,uint256,bytes32,string)',
  'event SpendExecuted(uint256 indexed streamId,address indexed recipient,uint256 amount,bytes32 category,string memo)',
  'event SpendQueued(uint256 indexed streamId,uint256 requestId,address recipient,uint256 amount)',
  'error SpendDenied(uint8 reason)', 'error NotParent()', 'error NotStudentAccount()', 'error InvalidConfiguration()', 'error InvalidMemo()',
] as const
export const QUEUE_ABI = [
  'function vault() view returns (address)', 'function policyModule() view returns (address)',
  'function getPending(uint256) view returns (uint256[])',
  'function getRequest(uint256) view returns (tuple(uint256 id,uint256 streamId,address student,address recipient,uint256 amount,bytes32 category,string memo,uint256 createdAt,uint256 expiresAt,bool executed,bool approved,address parent))',
  'function approve(uint256)', 'function decline(uint256)',
  'event RequestApproved(uint256 indexed requestId,address approvedBy)', 'event RequestDeclined(uint256 indexed requestId,address declinedBy)',
  'error NotParentOfStream()', 'error RequestNotFound()', 'error RequestAlreadyExecuted()', 'error RequestExpiredError()',
] as const
export const TOKEN_ABI = ['function symbol() view returns (string)', 'function decimals() view returns (uint8)', 'function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'] as const

export interface InjectedWallet extends Eip1193Provider {
  on?: (event: string, listener: (...args: unknown[]) => void) => void
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void
}
export function injectedWallet(): InjectedWallet | undefined { return (window as Window & { ethereum?: InjectedWallet }).ethereum }
export interface TestnetConfig { vault: string; policy: string; queue: string; rpc: string }
export function getTestnetConfig(environment?: Record<string, string | undefined>): { config?: TestnetConfig; errors: string[] } {
  const env = environment ?? (import.meta.env as Record<string, string | undefined> | undefined) ?? {}
  const values = [env.VITE_STREAM_VAULT_ADDRESS, env.VITE_POLICY_MODULE_ADDRESS, env.VITE_APPROVAL_QUEUE_ADDRESS]
  const names = ['VITE_STREAM_VAULT_ADDRESS', 'VITE_POLICY_MODULE_ADDRESS', 'VITE_APPROVAL_QUEUE_ADDRESS']
  const errors = values.flatMap((value, index) => !value ? [`${names[index]} is missing.`] : !isAddress(value) || value.toLowerCase() === ZeroAddress ? [`${names[index]} must be a nonzero address.`] : [])
  const rpc = env.VITE_MONAD_RPC_URL || MONAD_TESTNET.rpc
  try { if (new URL(rpc).protocol !== 'https:') errors.push('VITE_MONAD_RPC_URL must use HTTPS.') } catch { errors.push('VITE_MONAD_RPC_URL is invalid.') }
  if (!errors.length && new Set(values.map(value => value!.toLowerCase())).size !== 3) errors.push('Vault, policy and queue must have different addresses.')
  return errors.length ? { errors } : { errors, config: { vault: getAddress(values[0]!), policy: getAddress(values[1]!), queue: getAddress(values[2]!), rpc } }
}
export function publicTestnetProvider(config: TestnetConfig): JsonRpcProvider { const request = new FetchRequest(config.rpc); request.timeout = 15000; return new JsonRpcProvider(request, undefined, { batchMaxCount: 1, cacheTimeout: -1 }) }
export async function connectWallet(): Promise<{ account: string; chainId: number }> {
  const wallet = injectedWallet()
  if (!wallet) throw new Error('Install an EVM wallet browser extension to use this lab.')
  const accounts = await wallet.request({ method: 'eth_requestAccounts' }) as string[]
  if (!accounts[0]) throw new Error('The wallet did not share an account.')
  return { account: getAddress(accounts[0]), chainId: Number(BigInt(await wallet.request({ method: 'eth_chainId' }) as string)) }
}
export async function switchToTestnet(): Promise<void> {
  const wallet = injectedWallet()
  if (!wallet) throw new Error('No injected wallet is available.')
  try { await wallet.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: MONAD_TESTNET.chainHex }] }) }
  catch (error) {
    if ((error as { code?: number }).code !== 4902) throw error
    await wallet.request({ method: 'wallet_addEthereumChain', params: [{ chainId: MONAD_TESTNET.chainHex, chainName: 'Monad Testnet', nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 }, rpcUrls: [MONAD_TESTNET.rpc], blockExplorerUrls: [MONAD_TESTNET.explorer] }] })
    await wallet.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: MONAD_TESTNET.chainHex }] })
  }
}
function sameAddress(left: string, right: string): boolean { return left.toLowerCase() === right.toLowerCase() }
export function tokenAmount(text: string, decimals: number, allowZero = false): bigint {
  if (!/^\d+(\.\d+)?$/.test(text.trim())) throw new Error('Enter a plain positive AUSD amount, without commas or exponent notation.')
  const amount = parseUnits(text.trim(), decimals)
  if (amount < 0n || (!allowZero && amount === 0n)) throw new Error('Amount must be greater than zero.')
  return amount
}
export function displayAmount(value: bigint, decimals: number): string { return `${formatUnits(value, decimals)} AUSD` }
export function categoryKey(category: string): string {
  if (!/^[a-z][a-z0-9_-]{0,31}$/.test(category)) throw new Error('Use a category such as groceries, rent or transport (lowercase, up to 32 characters).')
  return id(category)
}
export function parseStreamId(text: string): bigint { if (!/^[1-9]\d*$/.test(text)) throw new Error('Stream ID must be a positive whole number.'); return BigInt(text) }

export interface VerifiedDeployment { block: number; decimals: number; symbol: string }
export async function verifyDeployment(provider: Provider, config: TestnetConfig): Promise<VerifiedDeployment> {
  if ((await provider.getNetwork()).chainId !== BigInt(MONAD_TESTNET.chainId)) throw new Error('RPC is not Monad testnet (10143).')
  const block = await provider.getBlockNumber()
  const addresses = [config.vault, config.policy, config.queue, AGORA_TESTNET_AUSD]
  const codes = await Promise.all(addresses.map(address => provider.getCode(address, block)))
  if (codes.some(code => /^0x0*$/.test(code))) throw new Error('A configured contract or the official testnet AUSD has no deployed code. Check addresses and the current testnet deployment.')
  const vault = new Contract(config.vault, VAULT_ABI, provider), policy = new Contract(config.policy, POLICY_ABI, provider), queue = new Contract(config.queue, QUEUE_ABI, provider), token = new Contract(AGORA_TESTNET_AUSD, TOKEN_ABI, provider)
  const [supportedToken, vaultModule, policyVault, policyQueue, queueVault, queueModule, decimals, symbol] = await Promise.all([
    vault.supportedToken({ blockTag: block }), vault.policyModule({ blockTag: block }), policy.vault({ blockTag: block }), policy.approvalQueue({ blockTag: block }), queue.vault({ blockTag: block }), queue.policyModule({ blockTag: block }), token.decimals({ blockTag: block }), token.symbol({ blockTag: block }),
  ])
  if (!sameAddress(supportedToken, AGORA_TESTNET_AUSD)) throw new Error('Vault token does not match official Agora testnet AUSD. This lab is disabled for this deployment.')
  if (!sameAddress(vaultModule, config.policy) || !sameAddress(policyVault, config.vault) || !sameAddress(policyQueue, config.queue) || !sameAddress(queueVault, config.vault) || !sameAddress(queueModule, config.policy)) throw new Error('Vault, policy and approval queue are not fully wired to each other.')
  const precision = Number(decimals)
  if (!Number.isInteger(precision) || precision < 0 || precision > 36 || symbol !== 'AUSD') throw new Error('Unexpected token metadata. Verify Agora deployment before continuing.')
  return { block, decimals: precision, symbol }
}
export interface PendingApproval { id: bigint; recipient: string; amount: bigint; category: string; memo: string; expiresAt: number }
export interface ChainStream {
  id: bigint; block: number; parent: string; student: string; active: boolean; earned: bigint; escrow: bigint; rate: bigint
  globalCap: bigint; threshold: bigint; weeklyLimit: bigint; policyActive: boolean; pending: PendingApproval[]; pendingCount: number
}
export async function readStream(provider: Provider, config: TestnetConfig, streamId: bigint): Promise<ChainStream> {
  const block = await provider.getBlockNumber()
  const vault = new Contract(config.vault, VAULT_ABI, provider), policy = new Contract(config.policy, POLICY_ABI, provider), queue = new Contract(config.queue, QUEUE_ABI, provider)
  const [stream, earned, rules, pendingIds] = await Promise.all([vault.getStream(streamId, { blockTag: block }), vault.streamedAmount(streamId, { blockTag: block }), policy.policies(streamId, { blockTag: block }), queue.getPending(streamId, { blockTag: block })])
  if (stream.parent === ZeroAddress) throw new Error(`Stream ${streamId} does not exist. Create it as the funding parent first.`)
  const pending = await Promise.all((pendingIds as bigint[]).slice(0, 5).map(async requestId => {
    const request = await queue.getRequest(requestId, { blockTag: block })
    return { id: request.id as bigint, recipient: request.recipient as string, amount: request.amount as bigint, category: request.category as string, memo: request.memo as string, expiresAt: Number(request.expiresAt) }
  }))
  return { id: streamId, block, parent: stream.parent, student: stream.student, active: stream.active, earned, escrow: stream.depositedBalance, rate: stream.ratePerSecond, globalCap: rules.globalCap, threshold: rules.approvalThreshold, weeklyLimit: rules.weeklyLimit, policyActive: rules.active, pending, pendingCount: pendingIds.length }
}
export const DENIALS = ['Allowed', 'Stream or policy is paused', 'Invalid recipient', 'Recipient/category registration does not match', 'Zero amount', 'Recipient is blocked', 'Transaction cap exceeded', 'Category budget exceeded', 'Weekly budget exceeded', 'Not enough earned AUSD'] as const
export interface SpendPreview { allowed: boolean; needsApproval: boolean; reason: string; categoryCap: bigint; categorySpent: bigint; registered: boolean; blocked: boolean; trusted: boolean; block: number }
export async function previewSpend(provider: Provider, config: TestnetConfig, streamId: bigint, recipient: string, amount: bigint, category: string): Promise<SpendPreview> {
  const address = getAddress(recipient), hash = categoryKey(category), block = await provider.getBlockNumber(), policy = new Contract(config.policy, POLICY_ABI, provider)
  const [decision, reason, registration, cap, blocked, trusted] = await Promise.all([policy.canSpend(streamId, address, amount, hash, { blockTag: block }), policy.denialReason(streamId, address, amount, hash, { blockTag: block }), policy.recipientCategory(streamId, address, { blockTag: block }), policy.categoryCaps(streamId, hash, { blockTag: block }), policy.blocklist(streamId, address, { blockTag: block }), policy.allowlist(streamId, address, { blockTag: block })])
  const current = await provider.getBlock(block)
  const expired = Number(cap.periodSeconds) === 0 || (current?.timestamp ?? 0) >= Number(cap.periodStart) + Number(cap.periodSeconds)
  return { allowed: decision.allowed, needsApproval: decision.needsApproval, reason: DENIALS[Number(reason)] ?? `Denied (${reason})`, categoryCap: cap.limitPerPeriod, categorySpent: expired ? 0n : cap.spentThisPeriod, registered: registration === hash, blocked, trusted, block }
}
export type LabAction =
  | { type: 'approve-token'; deposit: bigint }
  | { type: 'authorize-parent'; parent: string }
  | { type: 'create-stream'; student: string; deposit: bigint; ratePerSecond: bigint }
  | { type: 'set-policy'; streamId: bigint; globalCap: bigint; threshold: bigint; weeklyLimit: bigint }
  | { type: 'register-recipient'; streamId: bigint; recipient: string; category: string }
  | { type: 'set-category-cap'; streamId: bigint; category: string; amount: bigint }
  | { type: 'spend'; streamId: bigint; recipient: string; amount: bigint; category: string; memo: string }
  | { type: 'block-recipient' | 'trust-recipient'; streamId: bigint; recipient: string; enabled: boolean }
  | { type: 'pause-stream' | 'resume-stream'; streamId: bigint }
  | { type: 'approve-request' | 'decline-request'; streamId: bigint; requestId: bigint }

export interface LabReceipt { hash: string; block: number; summary: string; streamId?: bigint }
/// Called only from a deliberate browser button click. No background signing or delegated key exists.
export async function submitAction(config: TestnetConfig, expectedAccount: string, action: LabAction, onSubmitted: (hash: string) => void): Promise<LabReceipt> {
  const wallet = injectedWallet()
  if (!wallet) throw new Error('No injected wallet is available.')
  if (Number(BigInt(await wallet.request({ method: 'eth_chainId' }) as string)) !== MONAD_TESTNET.chainId) throw new Error('Switch your wallet to Monad testnet before submitting.')
  const accounts = await wallet.request({ method: 'eth_accounts' }) as string[]
  if (!accounts[0] || !sameAddress(accounts[0], expectedAccount)) throw new Error('Wallet account changed. Connect again before submitting.')
  // Guard at the transport boundary as ethers performs asynchronous gas estimation after our click checks.
  const guarded: Eip1193Provider = { request: async request => {
    if (request.method === 'eth_sendTransaction' || request.method === 'eth_signTransaction') {
      const currentChain = Number(BigInt(await wallet.request({ method: 'eth_chainId' }) as string))
      const currentAccounts = await wallet.request({ method: 'eth_accounts' }) as string[]
      if (currentChain !== MONAD_TESTNET.chainId || !currentAccounts[0] || !sameAddress(currentAccounts[0], expectedAccount)) throw new Error('Wallet account or network changed during transaction preparation. Connect again.')
      const transaction = Array.isArray(request.params) ? request.params[0] as { from?: string; chainId?: string } : undefined
      if (!transaction?.from || !sameAddress(transaction.from, expectedAccount) || !transaction.chainId || Number(BigInt(transaction.chainId)) !== MONAD_TESTNET.chainId) throw new Error('Prepared transaction is missing its expected signer or Monad testnet chain ID.')
    }
    return wallet.request(request)
  } }
  const provider = new BrowserProvider(guarded, MONAD_TESTNET.chainId, { cacheTimeout: -1 })
  const checked = await verifyDeployment(provider, config)
  const signer = await provider.getSigner(expectedAccount)
  const vault = new Contract(config.vault, VAULT_ABI, signer), policy = new Contract(config.policy, POLICY_ABI, signer), queue = new Contract(config.queue, QUEUE_ABI, signer), token = new Contract(AGORA_TESTNET_AUSD, TOKEN_ABI, signer)
  if ('streamId' in action) {
    const stream = await vault.getStream(action.streamId)
    const expectedRole = action.type === 'spend' ? stream.student : stream.parent
    if (!sameAddress(expectedAccount, expectedRole)) throw new Error(action.type === 'spend' ? 'Connect the receiving student wallet to submit a spend.' : 'Connect this stream’s funding parent wallet for this action.')
  }
  const overrides = { chainId: BigInt(MONAD_TESTNET.chainId) }
  const send = async (operation: () => Promise<TransactionResponse>): Promise<TransactionResponse> => {
    const chain = Number(BigInt(await wallet.request({ method: 'eth_chainId' }) as string))
    const active = await wallet.request({ method: 'eth_accounts' }) as string[]
    if (chain !== MONAD_TESTNET.chainId || !active[0] || !sameAddress(active[0], expectedAccount)) throw new Error('Wallet account or network changed before signing. Connect again.')
    return operation()
  }
  let response: TransactionResponse
  switch (action.type) {
    case 'approve-token':
      if (action.deposit <= 0n) throw new Error('Deposit must be positive.')
      response = await send(() => token.approve(config.vault, action.deposit, overrides)); break
    case 'authorize-parent': {
      const parent = getAddress(action.parent)
      if (sameAddress(parent, expectedAccount)) throw new Error('A funding parent must differ from the student wallet.')
      response = await send(() => vault.authorizeParent(parent, overrides)); break
    }
    case 'create-stream': {
      const student = getAddress(action.student)
      if (student === ZeroAddress || sameAddress(student, expectedAccount) || action.deposit <= 0n || action.ratePerSecond <= 0n) throw new Error('Use a different nonzero student wallet and positive deposit/rate.')
      if (!sameAddress(await vault.authorizedParent(student), expectedAccount)) throw new Error('The student must authorize this funding parent wallet before creation.');
      if (await vault.studentStream(student) !== 0n) throw new Error('This student already has a stream. Load its existing stream ID.')
      if (await token.balanceOf(expectedAccount) < action.deposit) throw new Error('Your wallet does not have enough testnet AUSD.')
      if (await token.allowance(expectedAccount, config.vault) < action.deposit) throw new Error('Approve this exact deposit first.')
      await vault.createStream.staticCall(student, AGORA_TESTNET_AUSD, action.ratePerSecond, action.deposit)
      response = await send(() => vault.createStream(student, AGORA_TESTNET_AUSD, action.ratePerSecond, action.deposit, overrides)); break
    }
    case 'set-policy': {
      const hash = id(JSON.stringify({ globalCap: String(action.globalCap), threshold: String(action.threshold), weeklyLimit: String(action.weeklyLimit) }))
      response = await send(() => policy.setPolicy(action.streamId, action.globalCap, action.threshold, action.weeklyLimit, hash, overrides)); break
    }
    case 'register-recipient': response = await send(() => policy.setRecipientCategory(action.streamId, getAddress(action.recipient), categoryKey(action.category), overrides)); break
    case 'set-category-cap': response = await send(() => policy.setCategoryCap(action.streamId, categoryKey(action.category), action.amount, 604800, overrides)); break
    case 'block-recipient': response = await send(() => policy.setBlocklist(action.streamId, getAddress(action.recipient), action.enabled, overrides)); break
    case 'trust-recipient': response = await send(() => policy.setAllowlist(action.streamId, getAddress(action.recipient), action.enabled, overrides)); break
    case 'pause-stream': response = await send(() => vault.pause(action.streamId, overrides)); break
    case 'resume-stream': response = await send(() => vault.resume(action.streamId, overrides)); break
    case 'spend':
      if (new TextEncoder().encode(action.memo).length > 200) throw new Error('Memo must fit within 200 UTF-8 bytes.')
      await policy.executeSpend.staticCall(action.streamId, getAddress(action.recipient), action.amount, categoryKey(action.category), action.memo)
      response = await send(() => policy.executeSpend(action.streamId, getAddress(action.recipient), action.amount, categoryKey(action.category), action.memo, overrides)); break
    case 'approve-request': {
      const req = await queue.getRequest(action.requestId)
      if (req.streamId !== action.streamId) throw new Error('This request belongs to a different stream.')
      await queue.approve.staticCall(action.requestId); response = await send(() => queue.approve(action.requestId, overrides)); break
    }
    case 'decline-request': {
      const req = await queue.getRequest(action.requestId)
      if (req.streamId !== action.streamId) throw new Error('This request belongs to a different stream.')
      await queue.decline.staticCall(action.requestId); response = await send(() => queue.decline(action.requestId, overrides)); break
    }
  }
  if (response.chainId !== BigInt(MONAD_TESTNET.chainId)) throw new Error('Wallet returned a transaction for a different chain. No Monad receipt was recorded.')
  onSubmitted(response.hash)
  // Receipt verification stays pinned to Monad even if the user changes their wallet network/account.
  const receiptProvider = publicTestnetProvider(config)
  let receipt: TransactionReceipt | null
  try {
    if ((await receiptProvider.getNetwork()).chainId !== BigInt(MONAD_TESTNET.chainId)) throw new Error('Receipt RPC is not Monad testnet.')
    const pinned = new TransactionResponse(response, receiptProvider).replaceableTransaction(checked.block)
    try { receipt = await pinned.wait(1, 120000) }
    catch (error) {
      const replacement = safeReplacementReceipt(error, response)
      if (!replacement) throw error
      receipt = replacement
      onSubmitted(replacement.hash)
    }
  } finally { receiptProvider.destroy() }
  if (!receipt || receipt.status !== 1) throw new Error(`Transaction ${response.hash} was not confirmed successfully. Check its explorer receipt.`)
  let summary = 'Transaction confirmed.', createdStream: bigint | undefined
  const vaultInterface = new Interface(VAULT_ABI), policyInterface = new Interface(POLICY_ABI), queueInterface = new Interface(QUEUE_ABI)
  for (const log of receipt.logs) {
    if (sameAddress(log.address, config.vault)) {
      const event = vaultInterface.parseLog(log)
      if (event?.name === 'ParentAuthorized') summary = event.args.parent === ZeroAddress ? 'Student consent revoked.' : 'Student consent for the funding parent confirmed.'
      if (event?.name === 'StreamCreated') { createdStream = event.args.streamId; summary = `Stream ${createdStream} created.` }
    }
    if (sameAddress(log.address, config.policy)) {
      const event = policyInterface.parseLog(log)
      if (event?.name === 'SpendQueued') summary = `Request ${event.args.requestId} queued for the funding parent. No payment executed.`
      if (event?.name === 'SpendExecuted') summary = 'AUSD payment executed and confirmed.'
    }
    if (sameAddress(log.address, config.queue)) {
      const event = queueInterface.parseLog(log)
      if (event?.name === 'RequestDeclined') summary = `Request ${event.args.requestId} declined. No payment executed.`
    }
  }
  return { hash: receipt.hash, block: receipt.blockNumber, summary, streamId: createdStream }
}
/// A gas-price replacement may confirm the same action; cancellations and changed calldata may not.
export function safeReplacementReceipt(error: unknown, original: Pick<TransactionResponse, 'chainId' | 'nonce' | 'from' | 'to' | 'data' | 'value'>): TransactionReceipt | undefined {
  const value = error as { code?: string; cancelled?: boolean; reason?: string; replacement?: TransactionResponse; receipt?: TransactionReceipt }
  const replacement = value?.replacement, receipt = value?.receipt
  if (value?.code !== 'TRANSACTION_REPLACED' || value.cancelled !== false || value.reason !== 'repriced' || !replacement || !receipt || receipt.status !== 1) return undefined
  if (original.chainId !== BigInt(MONAD_TESTNET.chainId) || replacement.chainId !== original.chainId || replacement.nonce !== original.nonce || !sameAddress(replacement.from, original.from) || replacement.to?.toLowerCase() !== original.to?.toLowerCase() || replacement.data.toLowerCase() !== original.data.toLowerCase() || replacement.value !== original.value || receipt.hash.toLowerCase() !== replacement.hash.toLowerCase()) return undefined
  return receipt
}
export interface HardDenialProof { denied: boolean; block: number; reason: string; revertData?: string }
export function decodeHardDenial(error: unknown): { reason: string; code: number; revertData: string } | undefined {
  const value = error as { data?: unknown; info?: { error?: { data?: unknown } }; error?: { data?: unknown } }
  if (!value) return undefined
  for (const candidate of [value.data, value.info?.error?.data, value.error?.data]) {
    const data = typeof candidate === 'string' ? candidate : (candidate as { result?: string } | undefined)?.result
    if (!data || !/^0x[0-9a-f]+$/i.test(data)) continue
    try {
      const decoded = new Interface(POLICY_ABI).parseError(data)
      if (decoded?.name === 'SpendDenied') {
        const code = Number(decoded.args.reason)
        if (code > 0 && code < DENIALS.length) return { reason: DENIALS[code], code, revertData: data }
      }
    } catch { /* Unknown revert bytes are not a verified money-policy denial. */ }
  }
  return undefined
}

/// @notice Reads the execution path with eth_call as the actual student; it does not request a signature.
export async function verifyHardDenial(provider: Provider, config: TestnetConfig, account: string, streamId: bigint, recipient: string, amount: bigint, category: string, memo: string): Promise<HardDenialProof> {
  const stream = await readStream(provider, config, streamId)
  if (!sameAddress(account, stream.student)) throw new Error('Connect this stream’s student wallet to simulate its execution path.')
  const block = await provider.getBlockNumber()
  const data = new Interface(POLICY_ABI).encodeFunctionData('executeSpend', [streamId, getAddress(recipient), amount, categoryKey(category), memo])
  try {
    await provider.call({ to: config.policy, from: account, data, blockTag: block })
    return { denied: false, block, reason: 'Execution simulation succeeded. This spend is not currently a hard denial.' }
  } catch (error) {
    const denial = decodeHardDenial(error)
    if (!denial) throw error
    return { denied: true, block, reason: denial.reason, revertData: denial.revertData }
  }
}
export function testnetError(error: unknown): string {
  const denial = decodeHardDenial(error)
  if (denial) return `Contract rejected the spend: ${denial.reason}.`
  const value = (error && typeof error === 'object' ? error : { message: String(error) }) as { code?: string | number; shortMessage?: string; reason?: string; message?: string }
  if (value.code === 'ACTION_REJECTED' || value.code === 4001) return 'Wallet request cancelled. No confirmed change.'
  return value.shortMessage ?? value.reason ?? value.message ?? 'Testnet request failed. No success was recorded.'
}




