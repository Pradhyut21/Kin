import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import solc from 'solc';
import { Contract, ContractFactory, FetchRequest, JsonRpcProvider, Wallet, ZeroAddress } from 'ethers';

const project = path.resolve(import.meta.dirname, '..');
const flags = new Set(process.argv.slice(2));
const allowed = new Set(['--plan', '--broadcast', '--resume', '--offline', '--help']);
const CHAIN_ID = 10143;
const TOKEN = '0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC';
const EXPLORER = 'https://testnet.monadscan.com';
if (flags.has('--help')) {
  console.log('Read/compile plan: npm.cmd run deploy:plan [-- --offline]\nUser-authorized testnet broadcast: npm.cmd run deploy:testnet -- --broadcast\nContinue saved deployment: npm.cmd run deploy:testnet -- --broadcast --resume\nNo transaction is signed without the explicit --broadcast flag.');
  process.exit(0);
}
if ([...flags].some(flag => !allowed.has(flag)) || (flags.has('--broadcast') && (flags.has('--plan') || flags.has('--offline'))) || (flags.has('--resume') && !flags.has('--broadcast'))) {
  console.error('Invalid flag combination. Use --help. Broadcast requires --broadcast and cannot be combined with --plan/--offline.');
  process.exit(1);
}
const broadcast = flags.has('--broadcast');
// Only local contracts/.env is read. No environment value is printed.
const envPath = path.join(project, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\s+#.*$/, '');
  }
}
const rpc = process.env.MONAD_TESTNET_RPC || 'https://testnet-rpc.monad.xyz';
if (process.env.TOKEN_ADDRESS && process.env.TOKEN_ADDRESS.toLowerCase() !== TOKEN.toLowerCase()) {
  console.error('TOKEN_ADDRESS must match the official Agora Monad testnet AUSD address. Nothing was signed.');
  process.exit(1);
}
const label = process.env.KIN_DEPLOYMENT_NAME || 'monad-testnet';
if (!/^[a-z0-9_-]+$/i.test(label)) { console.error('KIN_DEPLOYMENT_NAME may only contain letters, digits, underscores and hyphens.'); process.exit(1); }
const directory = path.join(project, 'deployments');
const manifestPath = path.join(directory, label + '.json');
const planPath = path.join(directory, label + '.plan.json');
fs.mkdirSync(directory, { recursive: true });
const sources = {};
function collect(folder) {
  for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, item.name);
    if (item.isDirectory()) collect(full);
    else if (item.name.endsWith('.sol')) sources[path.relative(project, full).replaceAll('\\', '/')] = { content: fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, '') };
  }
}
collect(path.join(project, 'src'));
const sourceHash = createHash('sha256').update(JSON.stringify(sources)).digest('hex');
const compiled = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources, settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } } })));
for (const item of compiled.errors || []) if (item.severity === 'error') console.error(item.formattedMessage);
if ((compiled.errors || []).some(item => item.severity === 'error')) process.exit(1);
const artifacts = Object.fromEntries(['StreamVault', 'ApprovalQueue', 'PolicyModule'].map(name => [name, compiled.contracts[`src/${name}.sol`][name]]));
const plan = {
  mode: broadcast ? 'broadcast-requested' : 'read-only-plan',
  ready: false, chainId: CHAIN_ID, token: TOKEN, compiler: solc.version(), sourceHash,
  contracts: Object.fromEntries(Object.entries(artifacts).map(([name, item]) => [name, { creationBytecodeBytes: item.evm.bytecode.object.length / 2 }])),
  stages: ['deploy StreamVault(AUSD)', 'deploy ApprovalQueue(vault)', 'deploy PolicyModule(vault, queue)', 'queue.setPolicyModule(policy)', 'vault.setPolicyModule(policy)', 'read back code, token and dependency wiring'],
  existingManifest: fs.existsSync(manifestPath) ? manifestPath : null,
  signing: 'No signatures in plan mode. Explicit --broadcast plus a locally supplied PRIVATE_KEY is required.',
  exclusions: 'KinAccount is excluded. No sample family stream, deposit, token approval or sponsor integration is created by deployment.',
};
if (flags.has('--offline')) {
  plan.mode = 'offline-compile-plan'; plan.networkVerified = false;
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}
const request = new FetchRequest(rpc); request.timeout = 15000;
const provider = new JsonRpcProvider(request, CHAIN_ID, { batchMaxCount: 1, cacheTimeout: -1 });
let manifest;
const save = () => { if (manifest) fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2)); };
const safeFailure = error => error?.shortMessage || error?.code || 'Operation failed. Check network, gas funds and saved public receipts.';
try {
  if ((await provider.getNetwork()).chainId !== BigInt(CHAIN_ID)) throw new Error('Wrong chain; Monad testnet is required.');
  if (/^0x0*$/.test(await provider.getCode(TOKEN))) throw new Error('Official testnet AUSD has no code. Verify current token deployment; nothing was signed.');
  const token = new Contract(TOKEN, ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'], provider);
  const [symbol, decimals] = await Promise.all([token.symbol(), token.decimals()]);
  if (symbol !== 'AUSD' || Number(decimals) > 36) throw new Error('Unexpected testnet token metadata; nothing was signed.');
  plan.networkVerified = true; plan.block = await provider.getBlockNumber(); plan.tokenMetadata = { symbol, decimals: Number(decimals) };
  plan.ready = true;
  if (!broadcast) {
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    console.log(JSON.stringify(plan, null, 2));
    process.exitCode = 0;
  } else {
    if (fs.existsSync(manifestPath) && !flags.has('--resume')) throw new Error('A deployment record already exists. Use --broadcast --resume to finish it; automatic redeployment is refused.');
    if (flags.has('--resume') && !fs.existsSync(manifestPath)) throw new Error('No deployment record exists to resume.');
    const secret = process.env.PRIVATE_KEY;
    if (!secret || !/^0x[0-9a-fA-F]{64}$/.test(secret)) throw new Error('Supply a valid locally stored PRIVATE_KEY. It is never required by plan mode or printed.');
    let signer;
    try { signer = new Wallet(secret, provider); } catch { throw new Error('PRIVATE_KEY is invalid; no transaction was sent.'); }
    const deployer = await signer.getAddress();
    if (flags.has('--resume')) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.sourceHash !== sourceHash || manifest.chainId !== CHAIN_ID || manifest.token.toLowerCase() !== TOKEN.toLowerCase() || manifest.deployer.toLowerCase() !== deployer.toLowerCase()) throw new Error('Saved deployment does not match these source files, chain, token and deployer.');
    } else {
      manifest = { chainId: CHAIN_ID, token: TOKEN, deployer, compiler: solc.version(), sourceHash, status: 'in-progress', contracts: {}, transactions: [], startedAt: new Date().toISOString() };
      save();
    }
    const overrides = { chainId: CHAIN_ID };
    const equal = (a, b) => a.toLowerCase() === b.toLowerCase();
    async function recoverPending(stage) {
      const previous = [...manifest.transactions].reverse().find(item => item.stage === stage);
      if (!previous) return undefined;
      if (previous.status === 'failed') throw new Error('A previous transaction reverted. Automatic resubmission is refused; inspect the saved receipt.');
      if (previous.status === 'submitted') {
        const receipt = await provider.getTransactionReceipt(previous.hash);
        if (!receipt) throw new Error('A previous transaction is still pending or unavailable. Wait and inspect the saved hash; do not redeploy.');
        previous.status = receipt.status === 1 ? 'confirmed' : 'failed'; previous.block = receipt.blockNumber;
        if (receipt.contractAddress) previous.contractAddress = receipt.contractAddress;
        save();
        if (previous.status === 'failed') throw new Error('A saved deployment transaction reverted. Inspect its receipt before continuing.');
      }
      return previous;
    }
    async function send(stage, operation) {
      await recoverPending(stage);
      const response = await operation();
      const evidence = { stage, hash: response.hash, status: 'submitted' };
      manifest.transactions.push(evidence); save();
      console.log(`${stage}: ${EXPLORER}/tx/${response.hash}`);
      const receipt = await response.wait(1, 120000);
      if (!receipt) throw new Error('No receipt was received before timeout. Saved transaction must be checked before retrying.');
      evidence.status = receipt.status === 1 ? 'confirmed' : 'failed'; evidence.block = receipt.blockNumber;
      if (receipt.contractAddress) evidence.contractAddress = receipt.contractAddress;
      save();
      if (receipt.status !== 1) throw new Error('Transaction reverted. Earlier deployment evidence is retained.');
      return receipt;
    }
    async function deploy(name, args) {
      const recovered = await recoverPending(`deploy:${name}`);
      if (!manifest.contracts[name] && recovered?.contractAddress) { manifest.contracts[name] = recovered.contractAddress; save(); }
      if (manifest.contracts[name]) {
        if (/^0x0*$/.test(await provider.getCode(manifest.contracts[name]))) throw new Error('A saved contract address no longer has code. Automatic redeployment is refused.');
        return new Contract(manifest.contracts[name], artifacts[name].abi, signer);
      }
      const factory = new ContractFactory(artifacts[name].abi, artifacts[name].evm.bytecode.object, signer);
      let instance;
      const receipt = await send(`deploy:${name}`, async () => { instance = await factory.deploy(...args, overrides); return instance.deploymentTransaction(); });
      if (!receipt.contractAddress) throw new Error('Successful deployment receipt did not include an address. Inspect evidence manually.');
      manifest.contracts[name] = receipt.contractAddress; save();
      return new Contract(receipt.contractAddress, artifacts[name].abi, signer);
    }
    const vault = await deploy('StreamVault', [TOKEN]);
    if (!equal(await vault.supportedToken(), TOKEN) || !equal(await vault.owner(), deployer)) throw new Error('Saved vault has a different token or owner.');
    const queue = await deploy('ApprovalQueue', [vault.target]);
    if (!equal(await queue.vault(), vault.target) || !equal(await queue.owner(), deployer)) throw new Error('Saved queue has a different vault or owner.');
    const policy = await deploy('PolicyModule', [vault.target, queue.target]);
    if (!equal(await policy.vault(), vault.target) || !equal(await policy.approvalQueue(), queue.target)) throw new Error('Saved policy dependencies differ.');
    for (const [name, contract] of [['queue', queue], ['vault', vault]]) {
      const current = await contract.policyModule();
      if (equal(current, policy.target)) continue;
      if (!equal(current, ZeroAddress)) throw new Error('A one-time dependency is already wired to a different module.');
      const previous = await recoverPending(`wire:${name}`);
      if (previous?.status === 'confirmed') throw new Error('Saved wiring receipt is confirmed but its state differs. Inspect manually.');
      await send(`wire:${name}`, () => contract.setPolicyModule(policy.target, overrides));
    }
    if (!equal(await vault.policyModule(), policy.target) || !equal(await queue.policyModule(), policy.target)) throw new Error('Final dependency verification failed. Saved contracts may require manual wiring.');
    manifest.status = 'complete'; manifest.verifiedAtBlock = await provider.getBlockNumber(); manifest.completedAt = new Date().toISOString(); save();
    console.log(JSON.stringify({ status: 'complete', publicEvidence: manifestPath, chainId: CHAIN_ID, token: TOKEN, contracts: manifest.contracts }, null, 2));
  }
} catch (error) {
  const message = safeFailure(error);
  // Custom local errors are safe, while ethers errors print only short classification, never payload/private key.
  const publicError = error?.code ? String(message) : String(error?.message || message);
  if (manifest) { manifest.status = 'partial'; manifest.lastError = publicError; save(); }
  else { plan.ready = false; plan.error = publicError; fs.writeFileSync(planPath, JSON.stringify(plan, null, 2)); }
  console.error(JSON.stringify({ status: 'blocked', error: publicError, publicEvidence: manifest ? manifestPath : planPath, signingMode: broadcast ? 'broadcast explicitly requested; inspect saved receipts before any retry' : 'read-only plan; no signing' }, null, 2));
  process.exitCode = 1;
} finally { provider.destroy(); }
