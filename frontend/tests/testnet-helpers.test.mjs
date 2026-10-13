import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { Interface } from 'ethers'
import { AGORA_TESTNET_AUSD, MONAD_TESTNET, POLICY_ABI, QUEUE_ABI, VAULT_ABI, TOKEN_ABI, categoryKey, decodeHardDenial, getTestnetConfig, safeReplacementReceipt, submitAction, testnetError, tokenAmount } from '../src/lib/testnet.ts'

const addresses = { vault: '0x0000000000000000000000000000000000000011', policy: '0x0000000000000000000000000000000000000012', queue: '0x0000000000000000000000000000000000000013', account: '0x0000000000000000000000000000000000000021', other: '0x0000000000000000000000000000000000000022' }
const config = { ...addresses, rpc: MONAD_TESTNET.rpc }
const configured = { VITE_STREAM_VAULT_ADDRESS: addresses.vault, VITE_POLICY_MODULE_ADDRESS: addresses.policy, VITE_APPROVAL_QUEUE_ADDRESS: addresses.queue }

test('missing or invalid deployment cannot enable the lab', () => {
  assert.equal(getTestnetConfig({}).config, undefined)
  assert.equal(getTestnetConfig({}).errors.length, 3)
  assert.equal(getTestnetConfig({ ...configured, VITE_POLICY_MODULE_ADDRESS: addresses.vault }).config, undefined)
  assert.equal(getTestnetConfig({ ...configured, VITE_MONAD_RPC_URL: 'http://example.com' }).config, undefined)
  assert.deepEqual(getTestnetConfig(configured).errors, [])
})
test('AUSD parsing rejects ambiguous and imprecise payment inputs', () => {
  assert.equal(tokenAmount('0.01', 6), 10000n)
  assert.equal(tokenAmount('0', 6, true), 0n)
  for (const value of ['0', '-1', '1,000', '1e3', '0.0000001', 'Infinity']) assert.throws(() => tokenAmount(value, 6))
  assert.throws(() => categoryKey('rent <script>'))
})
test('actual SpendDenied data is decoded while unrelated failures remain failures', () => {
  const data = new Interface(POLICY_ABI).encodeErrorResult('SpendDenied', [6])
  assert.equal(decodeHardDenial({ data }).reason, 'Transaction cap exceeded')
  assert.equal(decodeHardDenial({ info: { error: { data: { result: data } } } }).code, 6)
  assert.equal(decodeHardDenial({ data: '0xdeadbeef' }), undefined)
  assert.match(testnetError({ data }), /Contract rejected/)
  assert.match(testnetError({ code: 4001 }), /cancelled/)
})
test('same-action gas speedups are confirmed; changed actions and cancellations are refused', () => {
  const original = { chainId: 10143n, nonce: 5, from: addresses.account, to: addresses.policy, data: '0xabcdef', value: 0n }
  const hash = '0x' + 'ab'.repeat(32)
  const replacement = { ...original, hash }
  const receipt = { status: 1, hash }
  const error = { code: 'TRANSACTION_REPLACED', cancelled: false, reason: 'repriced', replacement, receipt }
  assert.equal(safeReplacementReceipt(error, original), receipt)
  for (const changed of [{ cancelled: true }, { reason: 'cancelled' }, { receipt: { ...receipt, status: 0 } }, { replacement: { ...replacement, chainId: 143n } }, { replacement: { ...replacement, data: '0xbeef' } }, { replacement: { ...replacement, value: 1n } }, { replacement: { ...replacement, to: addresses.other } }, { replacement: { ...replacement, nonce: 6 } }]) assert.equal(safeReplacementReceipt({ ...error, ...changed }, original), undefined)
})
test('wallet chain and account changes are rejected before signing', async () => {
  const previous = globalThis.window
  try {
    let requests = []
    globalThis.window = { ethereum: { request: async ({ method }) => { requests.push(method); return method === 'eth_chainId' ? '0x8f' : [addresses.account] } } }
    await assert.rejects(() => submitAction(config, addresses.account, { type: 'approve-token', deposit: 1n }, () => assert.fail('must not submit')), /Switch your wallet/)
    assert.deepEqual(requests, ['eth_chainId'])
    requests = []
    globalThis.window.ethereum.request = async ({ method }) => { requests.push(method); return method === 'eth_chainId' ? '0x279f' : [addresses.other] }
    await assert.rejects(() => submitAction(config, addresses.account, { type: 'approve-token', deposit: 1n }, () => assert.fail('must not submit')), /account changed/)
    assert(!requests.includes('eth_sendTransaction'))
  } finally { globalThis.window = previous }
})
test('network switch during asynchronous gas estimation never produces a confirmed action', async () => {
  const previous = globalThis.window
  let chain = '0x279f', gasChanged = false, sendRequests = []
  const byAddress = new Map([[addresses.vault.toLowerCase(), new Interface(VAULT_ABI)], [addresses.policy.toLowerCase(), new Interface(POLICY_ABI)], [addresses.queue.toLowerCase(), new Interface(QUEUE_ABI)], [AGORA_TESTNET_AUSD.toLowerCase(), new Interface(TOKEN_ABI)]])
  const result = (to, name) => {
    if (name === 'supportedToken') return [AGORA_TESTNET_AUSD]
    if (name === 'policyModule') return [addresses.policy]
    if (name === 'vault') return [addresses.vault]
    if (name === 'approvalQueue') return [addresses.queue]
    if (name === 'decimals') return [6]
    if (name === 'symbol') return ['AUSD']
    throw new Error('Unexpected call ' + name)
  }
  globalThis.window = { ethereum: { request: async ({ method, params }) => {
    if (method === 'eth_chainId') return chain
    if (method === 'eth_accounts') return [addresses.account]
    if (method === 'eth_blockNumber') return '0x64'
    if (method === 'eth_getCode') return '0x1234'
    if (method === 'eth_call') { const tx=params[0], iface=byAddress.get(tx.to.toLowerCase()), fn=iface.getFunction(tx.data.slice(0,10)); return iface.encodeFunctionResult(fn,result(tx.to,fn.name)) }
    if (method === 'eth_estimateGas') { gasChanged=true; chain='0x8f'; return '0x186a0' }
    if (method === 'eth_sendTransaction') { sendRequests.push(params[0]); throw Object.assign(new Error('wrong wallet network'), { code: 4901 }) }
    if (method === 'eth_getTransactionCount') return '0x0'
    throw new Error('Unexpected wallet method ' + method)
  } } }
  try {
    await assert.rejects(() => submitAction(config, addresses.account, { type: 'approve-token', deposit: 1n }, () => assert.fail('must not record submission')))
    assert.equal(gasChanged, true)
    assert.equal(sendRequests.length, 0, 'fixed provider must reject chain change before eth_sendTransaction')
    for (const request of sendRequests) assert.equal(request.chainId, '0x279f')
  } finally { globalThis.window = previous }
})
test('browser output tuples and events match freshly compiled contract ABIs', t => {
  for (const [abi,name] of [[VAULT_ABI,'StreamVault'],[POLICY_ABI,'PolicyModule'],[QUEUE_ABI,'ApprovalQueue']]) {
    const file = new URL('../../contracts/artifacts/' + name + '.json', import.meta.url)
    if (!fs.existsSync(file)) { t.skip('Run contracts npm compile to generate ABI evidence.'); return }
    const browser=new Interface(abi), compiled=new Interface(JSON.parse(fs.readFileSync(file,'utf8')).abi)
    for (const fragment of browser.fragments) {
      if (fragment.type === 'function') assert.equal(compiled.getFunction(fragment.format('sighash')).format('minimal'),fragment.format('minimal'))
      if (fragment.type === 'event') assert.equal(compiled.getEvent(fragment.format('sighash')).format('minimal'),fragment.format('minimal'))
    }
  }
})
