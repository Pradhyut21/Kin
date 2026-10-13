import fs from 'node:fs'
import path from 'node:path'
import { Contract, FetchRequest, JsonRpcProvider, ZeroAddress, getAddress, isAddress } from 'ethers'

// Read-only readiness check. No private key, signer, deployment or transaction submission is used.
const root = path.resolve(import.meta.dirname, '..')
for (const filename of [path.join(root, '.env'), path.join(root, '..', 'frontend', '.env.local')]) {
  if (!fs.existsSync(filename)) continue
  const text = fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, '')
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!match || match[1] === 'PRIVATE_KEY' || process.env[match[1]]) continue
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\s+#.*$/, '')
  }
}
const CHAIN_ID = 10143n
const AUSD = '0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC'
const rpc = process.env.MONAD_TESTNET_RPC || process.env.VITE_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'
const network = { chainId: Number(CHAIN_ID), rpc, explorer: 'https://testnet.monadscan.com', token: AUSD }
const names = ['STREAM_VAULT_ADDRESS', 'POLICY_MODULE_ADDRESS', 'APPROVAL_QUEUE_ADDRESS']
const supplied = names.map(name => process.env[name] || process.env[`VITE_${name}`])
const missing = names.filter((_, index) => !supplied[index])
if (missing.length) {
  console.log(JSON.stringify({ ready: false, mode: 'disabled', network, missing, guidance: 'No Kin deployment is assumed. Deploy and wire the contracts independently, then set these addresses in contracts/.env or frontend/.env.local. This check never deploys or signs.' }, null, 2))
  process.exit(0)
}
const invalid = names.filter((_, index) => !isAddress(supplied[index]) || supplied[index].toLowerCase() === ZeroAddress)
if (invalid.length || new Set(supplied.map(value => value.toLowerCase())).size !== 3) {
  console.log(JSON.stringify({ ready: false, mode: 'invalid-config', invalid, error: 'Use three distinct, nonzero deployed addresses.' }, null, 2))
  process.exit(1)
}
const connection = new FetchRequest(rpc)
connection.timeout = 15000
const provider = new JsonRpcProvider(connection, undefined, { batchMaxCount: 1, cacheTimeout: -1 })
try {
  const actualChain = (await provider.getNetwork()).chainId
  if (actualChain !== CHAIN_ID) throw new Error(`RPC chain is ${actualChain}, expected ${CHAIN_ID}.`)
  const [vaultAddress, policyAddress, queueAddress] = supplied.map(getAddress)
  const block = await provider.getBlockNumber()
  const codes = await Promise.all([vaultAddress, policyAddress, queueAddress, AUSD].map(address => provider.getCode(address, block)))
  if (codes.some(code => /^0x0*$/.test(code))) throw new Error('One or more configured contracts or Agora testnet AUSD have no code. Verify current testnet deployments after any reset.')
  const vault = new Contract(vaultAddress, ['function supportedToken() view returns (address)', 'function policyModule() view returns (address)'], provider)
  const policy = new Contract(policyAddress, ['function vault() view returns (address)', 'function approvalQueue() view returns (address)'], provider)
  const queue = new Contract(queueAddress, ['function vault() view returns (address)', 'function policyModule() view returns (address)'], provider)
  const token = new Contract(AUSD, ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'], provider)
  const [supportedToken, vaultModule, policyVault, policyQueue, queueVault, queueModule, decimals, symbol] = await Promise.all([
    vault.supportedToken({ blockTag: block }), vault.policyModule({ blockTag: block }), policy.vault({ blockTag: block }), policy.approvalQueue({ blockTag: block }), queue.vault({ blockTag: block }), queue.policyModule({ blockTag: block }), token.decimals({ blockTag: block }), token.symbol({ blockTag: block }),
  ])
  const equal = (a, b) => a.toLowerCase() === b.toLowerCase()
  if (!equal(supportedToken, AUSD)) throw new Error('Supported token differs from official Agora testnet AUSD.')
  if (!equal(vaultModule, policyAddress) || !equal(policyVault, vaultAddress) || !equal(policyQueue, queueAddress) || !equal(queueVault, vaultAddress) || !equal(queueModule, policyAddress)) throw new Error('Deployment dependency wiring is incomplete or mismatched.')
  if (symbol !== 'AUSD' || Number(decimals) < 0 || Number(decimals) > 36) throw new Error('Unexpected token metadata.')
  console.log(JSON.stringify({ ready: true, mode: 'read-only-verified', network, block, contracts: { vault: vaultAddress, policy: policyAddress, queue: queueAddress }, tokenMetadata: { symbol, decimals: Number(decimals) }, limitation: 'Code presence and wiring checks are not an audit. No user stream, wallet transaction, deployment or live-fund movement was performed.' }, null, 2))
} catch (error) {
  console.log(JSON.stringify({ ready: false, mode: 'verification-failed', network, error: error.shortMessage || error.message || String(error) }, null, 2))
  process.exitCode = 1
} finally { provider.destroy() }
