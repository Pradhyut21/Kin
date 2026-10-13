import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import solc from 'solc';
import ganache from 'ganache';
import { BrowserProvider, ContractFactory, id, ZeroHash, MaxUint256, ZeroAddress } from 'ethers';

const project = path.resolve(import.meta.dirname, '..');
const sources = {};
for (const dir of ['src', 'test', 'script']) {
  const collect = (folder) => {
    for (const file of fs.readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, file.name);
      if (file.isDirectory()) collect(full);
      else if (file.name.endsWith('.sol')) sources[path.relative(project, full).replaceAll('\\', '/')] = { content: fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, '') };
    }
  };
  collect(path.join(project, dir));
}
const output = JSON.parse(solc.compile(JSON.stringify({
  language: 'Solidity', sources,
  settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } },
})));
for (const error of output.errors ?? []) console.log(error.formattedMessage);
assert(!(output.errors ?? []).some(error => error.severity === 'error'), 'Solidity compilation failed');
const artifactDir = path.join(project, 'artifacts');
fs.mkdirSync(artifactDir, { recursive: true });
for (const [source, contracts] of Object.entries(output.contracts)) {
  for (const [name, artifact] of Object.entries(contracts)) {
    fs.writeFileSync(path.join(artifactDir, `${name}.json`), JSON.stringify({ source, contractName: name, compilerVersion: solc.version(), abi: artifact.abi, bytecode: `0x${artifact.evm.bytecode.object}` }, null, 2));
  }
}
console.log(`Compiled ${Object.keys(sources).length} Solidity source files with ${solc.version()}.`);
if (process.argv.includes('--compile-only')) process.exit(0);

const rpc = ganache.provider({
  logging: { quiet: true },
  chain: { chainId: 31337, time: new Date('2026-01-01T00:00:00Z') },
  miner: { timestampIncrement: 0 },
  wallet: { deterministic: true, totalAccounts: 6 },
});
const provider = new BrowserProvider(rpc);
provider.pollingInterval = 10;
const [parent, student, merchant, outsider] = await Promise.all([0, 1, 2, 3].map(index => provider.getSigner(index)));
const [parentAddress, studentAddress, merchantAddress, outsiderAddress] = await Promise.all([parent, student, merchant, outsider].map(signer => signer.getAddress()));
const category = id('groceries');
const deploy = async (source, name, args = []) => {
  const artifact = output.contracts[source][name];
  const contract = await new ContractFactory(artifact.abi, artifact.evm.bytecode.object, parent).deploy(...args);
  await contract.waitForDeployment();
  return contract;
};
const token = await deploy('test/KinTest.t.sol', 'MockUSDC');
const vault = await deploy('src/StreamVault.sol', 'StreamVault', [token.target]);
const queue = await deploy('src/ApprovalQueue.sol', 'ApprovalQueue', [vault.target]);
const policy = await deploy('src/PolicyModule.sol', 'PolicyModule', [vault.target, queue.target]);
const tx = async promise => (await promise).wait();
const warp = async seconds => { await rpc.request({ method: 'evm_increaseTime', params: [seconds] }); await rpc.request({ method: 'evm_mine', params: [] }); };
const reject = async operation => {
  let rejected = false;
  try { const result = await operation(); if (typeof result?.wait === 'function') await result.wait(); } catch { rejected = true; }
  assert(rejected, 'Expected this call to revert');
};
await tx(queue.setPolicyModule(policy.target));
await tx(vault.setPolicyModule(policy.target));
await tx(token.mint(parentAddress, 2000000));
await tx(token.approve(vault.target, MaxUint256));
await tx(vault.connect(student).authorizeParent(parentAddress));
await tx(vault.createStream(studentAddress, token.target, 100, 1000000));
await tx(policy.setPolicy(1, 0, 0, 0, id('initial')));
await tx(policy.setRecipientCategory(1, merchantAddress, category));
await tx(policy.setCategoryCap(1, category, 1000000, 604800));
await warp(100);
assert.equal(await vault.streamedAmount(1), 10000n);
const spend = amount => tx(policy.connect(student).executeSpend(1, merchantAddress, amount, category, 'groceries'));
const queued = async () => {
  await tx(policy.setPolicy(1, 0, 1000, 0, id('approval')));
  await spend(2000);
  return (await queue.nextRequestId()) - 1n;
};
let snapshot = await rpc.request({ method: 'evm_snapshot', params: [] });
let passed = 0;
const test = async (name, body) => {
  await rpc.request({ method: 'evm_revert', params: [snapshot] });
  snapshot = await rpc.request({ method: 'evm_snapshot', params: [] });
  try { await body(); passed++; console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}`); throw error; }
};

await test('dust deposit cannot reserve a victim student stream', async () => {
  await reject(() => vault.createStream(outsiderAddress, token.target, 100, 1));
  assert.equal(await vault.studentStream(outsiderAddress), 0n);
});
await test('student consent is bound to the correct parent', async () => {
  await tx(vault.connect(outsider).authorizeParent(merchantAddress));
  await reject(() => vault.createStream(outsiderAddress, token.target, 100, 1000));
  assert.equal(await vault.authorizedParent(outsiderAddress), merchantAddress);
});
await test('consent is consumed once and cannot replay creation', async () => {
  assert.equal(await vault.authorizedParent(studentAddress), ZeroAddress);
  await reject(() => vault.createStream(studentAddress, token.target, 100, 1000));
  await reject(() => vault.connect(student).authorizeParent(parentAddress));
});
await test('student can revoke and reauthorize before creation', async () => {
  await tx(vault.connect(outsider).authorizeParent(parentAddress));
  await tx(vault.connect(outsider).authorizeParent(ZeroAddress));
  await reject(() => vault.createStream(outsiderAddress, token.target, 100, 1000));
  await tx(vault.connect(outsider).authorizeParent(parentAddress));
  await tx(vault.createStream(outsiderAddress, token.target, 100, 1000));
  assert.equal(await vault.studentStream(outsiderAddress), 2n);
  assert.equal(await vault.authorizedParent(outsiderAddress), ZeroAddress);
});
await test('partial withdrawals preserve unspent entitlement', async () => {
  await spend(1000); assert.equal(await vault.streamedAmount(1), 9000n);
  await spend(500); assert.equal(await vault.streamedAmount(1), 8500n);
  assert.equal(await token.balanceOf(merchantAddress), 1500n);
});
await test('pause stops accrual/spending and resume preserves earned balance', async () => {
  await tx(vault.pause(1)); await warp(1000);
  assert.equal(await vault.streamedAmount(1), 10000n);
  await reject(() => spend(500));
  await tx(vault.resume(1)); await warp(10);
  assert.equal(await vault.streamedAmount(1), 11000n);
});
await test('rate changes retain entitlement at the previous rate', async () => {
  await tx(vault.updateRate(1, 200)); await warp(10);
  assert.equal(await vault.streamedAmount(1), 12000n);
});
await test('funding after exhaustion cannot accrue retroactively', async () => {
  await warp(20000); assert.equal(await vault.streamedAmount(1), 1000000n);
  await tx(vault.fund(1, 100000)); assert.equal(await vault.streamedAmount(1), 1000000n);
  await warp(10); assert.equal(await vault.streamedAmount(1), 1001000n);
});
await test('pausing and funding never erase entitlement', async () => {
  await tx(vault.pause(1)); await warp(500);
  await tx(vault.fund(1, 100000)); assert.equal(await vault.streamedAmount(1), 10000n);
  await tx(vault.updateRate(1, 200)); await tx(vault.resume(1)); await warp(10);
  assert.equal(await vault.streamedAmount(1), 12000n);
});
await test('only the recorded parent can approve or decline', async () => {
  const requestId = await queued();
  await reject(() => queue.connect(outsider).approve(requestId));
  await reject(() => queue.connect(student).decline(requestId));
  assert.equal((await queue.getRequest(requestId)).executed, false);
});
await test('queue retains student/category and approvals are single use', async () => {
  const requestId = await queued(); const request = await queue.getRequest(requestId);
  assert.equal(request.student, studentAddress); assert.equal(request.parent, parentAddress); assert.equal(request.category, category);
  await tx(queue.approve(requestId)); assert.equal(await token.balanceOf(merchantAddress), 2000n);
  assert.equal(await vault.streamedAmount(1), 8000n);
  await reject(() => queue.approve(requestId)); await reject(() => queue.decline(requestId));
});
await test('declines never transfer funds and cannot be approved later', async () => {
  const requestId = await queued(); await tx(queue.decline(requestId));
  assert.equal(await token.balanceOf(merchantAddress), 0n);
  await reject(() => queue.approve(requestId));
});
await test('expiry rejects at the exact boundary', async () => {
  const requestId = await queued(); await warp(172800);
  assert.equal((await queue.getPending(1)).length, 0);
  await reject(() => queue.approve(requestId)); await reject(() => queue.decline(requestId));
});
await test('nonexistent request cannot be approved', async () => { await reject(() => queue.approve(999)); });
for (const [name, change] of [
  ['global cap', () => tx(policy.setPolicy(1, 1500, 1000, 0, ZeroHash))],
  ['blocklist', () => tx(policy.setBlocklist(1, merchantAddress, true))],
  ['policy active flag', () => tx(policy.setPolicyActive(1, false))],
  ['stream pause', () => tx(vault.pause(1))],
  ['category cap', () => tx(policy.setCategoryCap(1, category, 1500, 604800))],
  ['weekly cap', () => tx(policy.setPolicy(1, 0, 1000, 1500, ZeroHash))],
  ['recipient category binding', () => tx(policy.setRecipientCategory(1, merchantAddress, id('rent')))],
]) {
  await test(`approval rechecks current ${name}`, async () => {
    const requestId = await queued(); await change();
    await reject(() => queue.approve(requestId));
    assert.equal((await queue.getRequest(requestId)).executed, false);
    assert.equal(await token.balanceOf(merchantAddress), 0n);
  });
}
await test('approval rechecks remaining earned funds after another spend', async () => {
  const requestId = await queued(); await tx(policy.setAllowlist(1, merchantAddress, true)); await spend(9000);
  await reject(() => queue.approve(requestId)); assert.equal((await queue.getRequest(requestId)).executed, false);
});
await test('merchant category spoofing and unregistered recipients fail', async () => {
  await reject(() => policy.connect(student).executeSpend(1, merchantAddress, 500, id('rent'), 'spoof'));
  await reject(() => policy.connect(student).executeSpend(1, outsiderAddress, 500, category, 'unknown'));
});
await test('allowlist skips approval and still enforces every hard cap', async () => {
  await tx(policy.setAllowlist(1, merchantAddress, true)); await tx(policy.setPolicy(1, 500, 100, 0, ZeroHash));
  assert.equal((await policy.canSpend(1, merchantAddress, 600, category)).allowed, false);
  await tx(policy.setPolicy(1, 0, 100, 0, ZeroHash)); await tx(policy.setCategoryCap(1, category, 500, 604800));
  assert.equal((await policy.canSpend(1, merchantAddress, 600, category)).allowed, false);
  await spend(400); assert.equal(await queue.nextRequestId(), 1n);
});
await test('disabled weekly cap tracks spend when re-enabled', async () => {
  await spend(1000); await tx(policy.setPolicy(1, 0, 0, 1500, ZeroHash));
  assert.equal((await policy.canSpend(1, merchantAddress, 600, category)).allowed, false);
});
await test('category cap edits retain spend and disabled caps count usage', async () => {
  await tx(policy.setCategoryCap(1, category, 0, 604800)); await spend(1000);
  await tx(policy.setCategoryCap(1, category, 1500, 604800));
  assert.equal((await policy.canSpend(1, merchantAddress, 600, category)).allowed, false);
});
await test('authorization protects rules, spends, queue callbacks, vault, and wiring', async () => {
  await reject(() => policy.connect(outsider).setPolicy(1, 0, 0, 0, ZeroHash));
  await reject(() => policy.connect(parent).executeSpend(1, merchantAddress, 500, category, 'wrong role'));
  await reject(() => policy.connect(outsider).executeApprovedSpend(1, merchantAddress, 500, category, 'fake approval'));
  await reject(() => vault.connect(outsider).executeWithdrawal(1, merchantAddress, 500));
  await reject(() => queue.connect(outsider).createRequest(1, merchantAddress, 500, category, 'fake'));
  await reject(() => vault.connect(outsider).setPolicyModule(policy.target));
  await reject(() => vault.setPolicyModule(policy.target));
  await reject(() => queue.setPolicyModule(policy.target));
});
await test('fee tokens revert funding/payment and roll back accounting', async () => {
  await tx(token.setFee(true)); await reject(() => spend(1000)); await reject(() => vault.fund(1, 10000));
  assert.equal(await vault.streamedAmount(1), 10000n); assert.equal(await token.balanceOf(merchantAddress), 0n);
  assert.equal((await vault.getStream(1)).depositedBalance, 1000000n);
});
await test('zero amounts, bad memo and invalid stream configuration fail', async () => {
  await reject(() => spend(0));
  await reject(() => policy.connect(student).executeSpend(1, merchantAddress, 500, category, 'x'.repeat(201)));
  await reject(() => policy.setCategoryCap(1, category, 100, 0));
  await reject(() => vault.createStream(ZeroAddress, token.target, 100, 1000));
  await reject(() => vault.createStream(outsiderAddress, ZeroAddress, 100, 1000));
  await reject(() => vault.createStream(studentAddress, token.target, 100, 1000));
});
await test('weekly/category windows expire and caps become available', async () => {
  await tx(policy.setPolicy(1, 0, 0, 1500, ZeroHash)); await tx(policy.setCategoryCap(1, category, 1500, 604800));
  await spend(1000); assert.equal((await policy.canSpend(1, merchantAddress, 600, category)).allowed, false);
  await warp(604800); assert.equal((await policy.canSpend(1, merchantAddress, 600, category)).allowed, true);
});
await test('maximal rate saturates before multiplication overflow', async () => {
  await tx(vault.updateRate(1, MaxUint256)); await warp(2);
  assert.equal(await vault.streamedAmount(1), 1000000n);
});
await test('50 deterministic accrual/property cases stay within escrow', async () => {
  let seed = 123456789n;
  for (let i = 0; i < 50; i++) {
    const save = await rpc.request({ method: 'evm_snapshot', params: [] });
    seed = (1103515245n * seed + 12345n) % (2n ** 128n);
    const rate = seed + 1n;
    const elapsed = Number(seed % 31536000n);
    await tx(vault.updateRate(1, rate)); await warp(elapsed);
    const earned = await vault.streamedAmount(1); const escrow = (await vault.getStream(1)).depositedBalance;
    assert(earned >= 10000n && earned <= escrow);
    await rpc.request({ method: 'evm_revert', params: [save] });
  }
});
await rpc.disconnect();
console.log(`${passed} regression groups passed on an in-process local EVM. No network deployment or live funds used.`);

