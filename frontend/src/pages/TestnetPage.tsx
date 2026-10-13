import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Contract } from 'ethers'
import {
  AGORA_DEPLOYMENTS, AGORA_TESTNET_AUSD, MONAD_TESTNET, TOKEN_ABI, connectWallet,
  displayAmount, getTestnetConfig, injectedWallet, parseStreamId, previewSpend, publicTestnetProvider,
  readStream, submitAction, switchToTestnet, testnetError, tokenAmount, verifyDeployment, verifyHardDenial,
} from '../lib/testnet'
import type { ChainStream, HardDenialProof, LabAction, LabReceipt, SpendPreview, VerifiedDeployment } from '../lib/testnet'

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`
const sectionStyle = { display: 'grid', gap: 14 } as const
const rowStyle = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 } as const
const inputStyle = { width: '100%', minWidth: 0, padding: '11px 12px', border: '1px solid var(--c-border, #d9dde4)', borderRadius: 10, color: 'inherit', background: 'var(--c-bg-surface, transparent)', font: 'inherit' } as const

export function TestnetPage() {
  const { config, errors: configErrors } = useMemo(getTestnetConfig, [])
  const provider = useMemo(() => config ? publicTestnetProvider(config) : undefined, [config])
  const [wallet, setWallet] = useState<{ account: string; chainId: number }>()
  const [deployment, setDeployment] = useState<VerifiedDeployment>()
  const [stream, setStream] = useState<ChainStream>()
  const [streamId, setStreamId] = useState('1')
  const [student, setStudent] = useState('')
  const [fundingParent, setFundingParent] = useState('')
  const [deposit, setDeposit] = useState('10')
  const [dailyRate, setDailyRate] = useState('864')
  const [globalCap, setGlobalCap] = useState('2')
  const [threshold, setThreshold] = useState('0.5')
  const [weeklyLimit, setWeeklyLimit] = useState('5')
  const [recipient, setRecipient] = useState('')
  const [category, setCategory] = useState('groceries')
  const [categoryLimit, setCategoryLimit] = useState('3')
  const [spendAmount, setSpendAmount] = useState('0.01')
  const [memo, setMemo] = useState('Test payment')
  const [preview, setPreview] = useState<SpendPreview>()
  const [denialProof, setDenialProof] = useState<HardDenialProof>()
  const [tokenState, setTokenState] = useState<{ balance: bigint; allowance: bigint }>()
  const [receipts, setReceipts] = useState<LabReceipt[]>([])
  const [pendingHash, setPendingHash] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Configure deployed contract addresses to enable the lab.')
  const correctChain = wallet?.chainId === MONAD_TESTNET.chainId
  const enabled = Boolean(config && deployment && wallet && correctChain && !busy)
  const parentConnected = Boolean(wallet && stream && wallet.account.toLowerCase() === stream.parent.toLowerCase())
  const studentConnected = Boolean(wallet && stream && wallet.account.toLowerCase() === stream.student.toLowerCase())

  const providerCleanup = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    clearTimeout(providerCleanup.current)
    return () => { providerCleanup.current = setTimeout(() => provider?.destroy(), 0) }
  }, [provider])
  useEffect(() => { if (stream && stream.id.toString() !== streamId) setStream(undefined) }, [streamId, stream])
  useEffect(() => { setPreview(undefined); setDenialProof(undefined) }, [streamId, recipient, category, spendAmount])
  useEffect(() => {
    const injected = injectedWallet()
    const changed = () => {
      setWallet(undefined); setStream(undefined); setPreview(undefined); setDenialProof(undefined); setTokenState(undefined)
      setStatus('Wallet account or network changed. Connect again to verify the active signer.')
    }
    injected?.on?.('accountsChanged', changed); injected?.on?.('chainChanged', changed)
    return () => { injected?.removeListener?.('accountsChanged', changed); injected?.removeListener?.('chainChanged', changed) }
  }, [])

  async function refreshToken(account: string) {
    if (!provider || !config) return
    const token = new Contract(AGORA_TESTNET_AUSD, TOKEN_ABI, provider)
    const [balance, allowance] = await Promise.all([token.balanceOf(account), token.allowance(account, config.vault)])
    setTokenState({ balance, allowance })
  }
  async function connect() {
    setBusy(true); setError('')
    try {
      const connection = await connectWallet(); setWallet(connection)
      if (connection.chainId !== MONAD_TESTNET.chainId) { setStatus('Wallet connected. Switch to Monad testnet to enable actions.'); return }
      if (provider && config) {
        setDeployment(await verifyDeployment(provider, config)); await refreshToken(connection.account)
        setStatus('Real deployed code, AUSD metadata and dependency wiring verified. Load a stream or create one below.')
      } else setStatus('Wallet connected. Deployment addresses are still required.')
    } catch (cause) { setDeployment(undefined); setError(testnetError(cause)) }
    finally { setBusy(false) }
  }
  async function switchNetwork() {
    setBusy(true); setError('')
    try { await switchToTestnet(); setStatus('Network switch requested. Connect again to verify the active signer.') }
    catch (cause) { setError(testnetError(cause)) }
    finally { setBusy(false) }
  }
  async function loadStream(id = streamId) {
    if (!provider || !config || !deployment) { setError('Verify a configured deployment by connecting on Monad testnet first.'); return }
    setBusy(true); setError(''); setPreview(undefined)
    try { const next = await readStream(provider, config, parseStreamId(id)); setStream(next); setStatus(`Stream ${next.id} read from block ${next.block}.`) }
    catch (cause) { setStream(undefined); setError(testnetError(cause)) }
    finally { setBusy(false) }
  }
  async function submit(buildAction: () => LabAction) {
    if (!config || !wallet || !deployment || !enabled) { setError('A verified deployment and a connected Monad testnet wallet are required.'); return }
    setBusy(true); setError(''); setPendingHash(''); setPreview(undefined); setDenialProof(undefined)
    try {
      const result = await submitAction(config, wallet.account, buildAction(), hash => {
        setPendingHash(hash); setStatus('Transaction submitted. Waiting for its actual receipt…')
      })
      setReceipts(previous => [result, ...previous].slice(0, 8)); setPendingHash(''); setStatus(result.summary)
      // A successful receipt remains recorded even if a later refresh encounters an RPC error.
      const id = result.streamId?.toString() ?? stream?.id.toString()
      if (result.streamId) setStreamId(result.streamId.toString())
      try {
        if (provider) {
          await refreshToken(wallet.account)
          if (id) setStream(await readStream(provider, config, parseStreamId(id)))
        }
      } catch (cause) { setError(`Receipt confirmed; refreshing current balances failed: ${testnetError(cause)}`) }
    } catch (cause) { setError(testnetError(cause)); setStatus('Action did not return a successful confirmed receipt.') }
    finally { setBusy(false) }
  }
  async function previewPayment() {
    if (!provider || !config || !deployment || !stream) return
    setBusy(true); setError(''); setPreview(undefined)
    try {
      const decision = await previewSpend(provider, config, stream.id, recipient, tokenAmount(spendAmount, deployment.decimals), category)
      setPreview(decision); setStatus('Policy decision read from the deployed contract. No transaction submitted.')
    } catch (cause) { setError(testnetError(cause)) }
    finally { setBusy(false) }
  }
  async function simulateBlockedExecution() {
    if (!provider || !config || !deployment || !stream || !wallet) return
    setBusy(true); setError(''); setDenialProof(undefined)
    try {
      const proof = await verifyHardDenial(provider, config, wallet.account, stream.id, recipient, units(spendAmount), category, memo)
      setDenialProof(proof); setStatus('Execution path simulated against the deployed policy contract. No signature or transaction requested.')
    } catch (cause) { setError(testnetError(cause)) }
    finally { setBusy(false) }
  }
  function units(value: string, allowZero = false): bigint {
    if (!deployment) throw new Error('Verify token decimals first.')
    return tokenAmount(value, deployment.decimals, allowZero)
  }
  const money = (value: bigint) => displayAmount(value, deployment?.decimals ?? 6)
  const field = (label: string, value: string, setter: (next: string) => void, placeholder?: string) => (
    <label className="field" style={{ display: 'grid', gap: 6 }}><span>{label}</span><input style={inputStyle} value={value} placeholder={placeholder} onChange={event => setter(event.target.value)} disabled={busy} /></label>
  )

  return (
    <div className="lab-page" style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 20px 110px', display: 'grid', gap: 22 }}>
      <div className="page-heading" style={{ display: 'block' }}>
        <div className="badge">Monad testnet · real contract lab</div>
        <h1 style={{ marginTop: 12 }}>Verify the money rules.</h1>
        <p className="muted" style={{ marginTop: 10 }}>Use deployed Kin contracts and your wallet on chain 10143. Every write requires your click and wallet confirmation. This lab uses testnet AUSD and has its own balances, separate from the demo.</p>
        <Link to="/" style={{ display: 'inline-block', marginTop: 12 }}>← Back to Kin</Link>
      </div>

      <section className="panel" style={sectionStyle}>
        <h2>1. Connect and verify</h2>
        {configErrors.length > 0 && <div className="notice" role="status"><strong>Lab disabled: deployment configuration is missing or invalid.</strong><ul style={{ margin: '10px 0 10px 20px' }}>{configErrors.map(message => <li key={message}>{message}</li>)}</ul><p>Add these values to frontend/.env.local after deploying and wiring the contracts, then restart Vite. No deployed Kin address is supplied by this build.</p></div>}
        <div style={rowStyle}>
          <button className="btn btn-primary" disabled={busy || !injectedWallet()} onClick={connect}>{busy ? 'Working…' : wallet ? 'Reconnect wallet' : 'Connect wallet'}</button>
          <button className="btn btn-secondary" disabled={busy || !injectedWallet()} onClick={switchNetwork}>Switch to Monad testnet</button>
          {!injectedWallet() && <span className="muted">An injected EVM browser wallet is required.</span>}
        </div>
        {wallet && <p style={{ overflowWrap: 'anywhere' }}>Signer: <code>{wallet.account}</code> · chain {wallet.chainId}{correctChain ? ' ✓' : ' — wrong network'}</p>}
        {deployment && <p>Verified deployed code and wiring at block {deployment.block}. Token decimals: {deployment.decimals}.</p>}
        {config && <details><summary>Configured deployment</summary><div style={{ display: 'grid', gap: 8, marginTop: 12, overflowWrap: 'anywhere' }}>{([['Vault', config.vault], ['Policy', config.policy], ['Queue', config.queue], ['Agora testnet AUSD', AGORA_TESTNET_AUSD]] as const).map(([label, address]) => <div key={label}>{label}: <a href={`${MONAD_TESTNET.explorer}/address/${address}`} target="_blank" rel="noreferrer">{address}</a></div>)}</div></details>}
        <p className="muted"><a href={MONAD_TESTNET.faucet} target="_blank" rel="noreferrer">Test MON faucet</a> · <a href={AGORA_DEPLOYMENTS} target="_blank" rel="noreferrer">Official Agora token / faucet contracts</a> · <a href={MONAD_TESTNET.docs} target="_blank" rel="noreferrer">Monad network sources</a>. Obtain testnet AUSD independently; this page does not mint tokens or provide a fiat on-ramp.</p>
      </section>

      <div role="status" aria-live="polite" className="notice">{status}{pendingHash && <p style={{ marginTop: 8 }}><a href={`${MONAD_TESTNET.explorer}/tx/${pendingHash}`} target="_blank" rel="noreferrer">View submitted transaction</a> · receipt pending</p>}</div>
      {error && <div className="notice" role="alert" style={{ border: '1px solid #db6b62', overflowWrap: 'anywhere' }}>{error}</div>}

      <section className="panel" style={sectionStyle}>
        <h2>2. Create or load a family stream</h2>
        <div className="notice" style={sectionStyle}>
          <strong>Student consent comes first.</strong>
          <p>Connect the receiving student wallet, enter the intended parent wallet and authorize it once. This prevents someone else from reserving your stream with a dust deposit. Then connect the parent to fund and create it.</p>
          {field('Funding parent wallet to authorize', fundingParent, setFundingParent, '0x…')}
          <div style={rowStyle}>
            <button className="btn btn-secondary" disabled={!enabled} onClick={() => submit(() => ({ type: 'authorize-parent', parent: fundingParent }))}>Authorize parent from student wallet</button>
            <button className="btn btn-secondary" disabled={!enabled} onClick={() => submit(() => ({ type: 'authorize-parent', parent: '0x0000000000000000000000000000000000000000' }))}>Revoke unused consent</button>
          </div>
          <p className="muted">Consent belongs to the currently connected wallet and is consumed on creation. It does not transfer tokens.</p>
        </div>
        {tokenState && <p>Your testnet AUSD: {money(tokenState.balance)} · vault allowance: {money(tokenState.allowance)}</p>}
        <div style={{ display: 'grid', gap: 12 }}>
          {field('Receiving student wallet', student, setStudent, '0x… (different from the funding parent)')}
          <div className="grid-two">{field('Initial deposit (AUSD)', deposit, setDeposit)}{field('Accelerated testing rate (AUSD/day)', dailyRate, setDailyRate)}</div>
          <p className="muted">The connected wallet becomes the funding parent. This accelerated test rate makes earned funds available during a short walkthrough; it is not a realistic allowance recommendation. Daily rate is rounded down to integer token units per second. Existing students must load their stream instead.</p>
          {deployment && <p className="muted">Exact proposed rate: {(() => { try { return money(units(dailyRate) / 86400n) } catch { return 'enter a valid rate' } })()} / second after rounding.</p>}
          <div style={rowStyle}>
            <button className="btn btn-secondary" disabled={!enabled} onClick={() => submit(() => ({ type: 'approve-token', deposit: units(deposit) }))}>Approve exact AUSD deposit</button>
            <button className="btn btn-primary" disabled={!enabled} onClick={() => submit(() => {
              const rate = units(dailyRate) / 86400n
              if (rate === 0n) throw new Error('Daily allowance is too small for one token base unit per second. Increase it.')
              return { type: 'create-stream', student, deposit: units(deposit), ratePerSecond: rate }
            })}>Create funded stream</button>
          </div>
        </div>
        <div style={{ ...rowStyle, borderTop: '1px solid var(--c-border, #ddd)', paddingTop: 16 }}>
          <div style={{ flex: '1 1 180px' }}>{field('Existing stream ID', streamId, setStreamId)}</div>
          <button className="btn btn-secondary" disabled={!enabled} onClick={() => loadStream()}>Read stream</button>
        </div>
        {stream && <div className="notice" style={sectionStyle}>
          <strong>Stream {stream.id.toString()} · block {stream.block}</strong>
          <div className="grid-two"><div>Earned: <strong>{money(stream.earned)}</strong></div><div>Escrow remaining: <strong>{money(stream.escrow)}</strong></div></div>
          <p>Rate: {money(stream.rate)} / second · {stream.active ? 'stream active' : 'stream paused'} · {stream.policyActive ? 'policy active' : 'policy not active'}</p>
          <p style={{ overflowWrap: 'anywhere' }}>Parent: {stream.parent}<br />Student: {stream.student}</p>
          <p>Transaction cap: {stream.globalCap === 0n ? 'none configured' : money(stream.globalCap)} · approval above: {stream.threshold === 0n ? 'disabled' : money(stream.threshold)} · weekly cap: {stream.weeklyLimit === 0n ? 'none configured' : money(stream.weeklyLimit)}</p>
          <span className="badge">{parentConnected ? 'Funding parent connected' : studentConnected ? 'Receiving student connected' : 'Read only: connect the parent or student'}</span>
        </div>}
      </section>

      <section className="panel" style={sectionStyle}>
        <h2>3. Parent: set the money rules</h2>
        <p className="muted">Load the stream and connect its funding parent. Zero disables a cap or approval threshold. These buttons each submit one onchain transaction.</p>
        <div className="grid-two">{field('Maximum payment (AUSD)', globalCap, setGlobalCap)}{field('Parent approval above (AUSD)', threshold, setThreshold)}</div>
        {field('Total weekly cap (AUSD)', weeklyLimit, setWeeklyLimit)}
        <button className="btn btn-primary" disabled={!enabled || !parentConnected} onClick={() => submit(() => ({ type: 'set-policy', streamId: stream!.id, globalCap: units(globalCap, true), threshold: units(threshold, true), weeklyLimit: units(weeklyLimit, true) }))}>Save policy onchain</button>
        {field('Approved recipient wallet', recipient, setRecipient, '0x…')}
        <div className="grid-two">{field('Recipient category', category, setCategory)}{field('Category weekly cap (AUSD)', categoryLimit, setCategoryLimit)}</div>
        <div style={rowStyle}>
          <button className="btn btn-secondary" disabled={!enabled || !parentConnected} onClick={() => submit(() => ({ type: 'register-recipient', streamId: stream!.id, recipient, category }))}>Register recipient category</button>
          <button className="btn btn-secondary" disabled={!enabled || !parentConnected} onClick={() => submit(() => ({ type: 'set-category-cap', streamId: stream!.id, category, amount: units(categoryLimit, true) }))}>Save category cap</button>
        </div>
        <p className="muted">Registration prevents the student from changing this merchant’s category to bypass its budget. It does not skip parent approval or any hard cap.</p>
        <div style={rowStyle}>
          <button className="btn btn-secondary" disabled={!enabled || !parentConnected} onClick={() => submit(() => ({ type: 'block-recipient', streamId: stream!.id, recipient, enabled: true }))}>Block recipient</button>
          <button className="btn btn-secondary" disabled={!enabled || !parentConnected} onClick={() => submit(() => ({ type: 'block-recipient', streamId: stream!.id, recipient, enabled: false }))}>Unblock recipient</button>
          <button className="btn btn-secondary" disabled={!enabled || !parentConnected} onClick={() => submit(() => ({ type: 'trust-recipient', streamId: stream!.id, recipient, enabled: true }))}>Trust recipient</button>
          <button className="btn btn-secondary" disabled={!enabled || !parentConnected} onClick={() => submit(() => ({ type: 'trust-recipient', streamId: stream!.id, recipient, enabled: false }))}>Remove trust</button>
        </div>
        <p className="muted">A block always wins. Trust skips only the parent approval threshold; all caps and available-funds checks still apply. Read the actual policy decision below to verify recipient status.</p>
        <div style={rowStyle}>
          <button className="btn btn-secondary" disabled={!enabled || !parentConnected || !stream?.active} onClick={() => submit(() => ({ type: 'pause-stream', streamId: stream!.id }))}>Pause stream</button>
          <button className="btn btn-secondary" disabled={!enabled || !parentConnected || stream?.active} onClick={() => submit(() => ({ type: 'resume-stream', streamId: stream!.id }))}>Resume stream</button>
        </div>
        <p className="muted">Pause freezes accrual and spending while preserving already earned AUSD.</p>
      </section>

      <section className="panel" style={sectionStyle}>
        <h2>4. Student: preview and pay</h2>
        <p className="muted">Use the registered recipient and category above, then connect the stream’s student wallet. A payment above the approval threshold creates a request; it does not pay until the parent approves.</p>
        {field('Payment amount (AUSD)', spendAmount, setSpendAmount)}
        {field('Public memo — omit personal information', memo, setMemo)}
        <div style={rowStyle}>
          <button className="btn btn-secondary" disabled={!enabled || !stream} onClick={previewPayment}>Read actual policy decision</button>
          <button className="btn btn-primary" disabled={!enabled || !studentConnected || !preview?.allowed} onClick={() => submit(() => ({ type: 'spend', streamId: stream!.id, recipient, amount: units(spendAmount), category, memo }))}>{preview?.needsApproval ? 'Request parent approval' : 'Confirm payment in wallet'}</button>
        </div>
        {preview && <div className="notice" role="status"><strong>{preview.allowed ? preview.needsApproval ? 'Parent approval required' : 'Within current policy' : `Blocked: ${preview.reason}`}</strong><p style={{ marginTop: 8 }}>Read at block {preview.block} · recipient/category {preview.registered ? 'matched' : 'not matched'} · blocked {preview.blocked ? 'yes' : 'no'} · trusted {preview.trusted ? 'yes' : 'no'} · category spent {money(preview.categorySpent)}{preview.categoryCap > 0n ? ` / ${money(preview.categoryCap)}` : ' (no category cap)'}. The contract rechecks the current rules during execution.</p></div>}
        <button className="btn btn-secondary" disabled={!enabled || !studentConnected || !preview || preview.allowed} onClick={simulateBlockedExecution}>Verify execution rejects this spend</button>
        {denialProof && <div className="notice" role="status"><strong>{denialProof.denied ? `Contract execution rejected: ${denialProof.reason}` : denialProof.reason}</strong><p style={{ marginTop: 8 }}>Read-only execution simulation at block {denialProof.block}. No wallet signature or token movement.</p>{denialProof.revertData && <details style={{ marginTop: 8 }}><summary>Actual SpendDenied revert bytes</summary><code style={{ display: 'block', overflowWrap: 'anywhere', marginTop: 8 }}>{denialProof.revertData}</code></details>}</div>}
      </section>

      <section className="panel" style={sectionStyle}>
        <h2>5. Parent: resolve actual requests</h2>
        <p className="muted">Approval applies the current hard protections and available earned funds. It cannot override a blocked recipient or exhausted budget.</p>
        {!stream ? <p>Load a stream to read its requests.</p> : stream.pending.length === 0 ? <p>No pending requests were returned for this stream at block {stream.block}.</p> : stream.pending.map(request => <div className="notice" key={request.id.toString()} style={sectionStyle}>
          <strong>Request {request.id.toString()} · {money(request.amount)}</strong>
          <p style={{ overflowWrap: 'anywhere' }}>To {request.recipient}<br />{request.memo}<br />Category hash: {request.category}<br />Expires {new Date(request.expiresAt * 1000).toLocaleString()}</p>
          <div style={rowStyle}>
            <button className="btn btn-primary" disabled={!enabled || !parentConnected} onClick={() => submit(() => ({ type: 'approve-request', streamId: stream.id, requestId: request.id }))}>Approve and execute</button>
            <button className="btn btn-secondary" disabled={!enabled || !parentConnected} onClick={() => submit(() => ({ type: 'decline-request', streamId: stream.id, requestId: request.id }))}>Decline</button>
          </div>
        </div>)}
        {stream && stream.pendingCount > 5 && <p>Showing the first 5 of {stream.pendingCount} pending requests.</p>}
      </section>

      <section className="panel" style={sectionStyle}>
        <h2>Confirmed receipts</h2>
        {receipts.length === 0 ? <p className="muted">No confirmed wallet transaction has been recorded in this lab session.</p> : receipts.map(receipt => <div key={receipt.hash} className="notice"><strong>{receipt.summary}</strong><p style={{ marginTop: 8 }}>Block {receipt.block} · <a href={`${MONAD_TESTNET.explorer}/tx/${receipt.hash}`} target="_blank" rel="noreferrer">{short(receipt.hash)} ↗ View receipt</a></p></div>)}
        <p className="muted">This is an injected-wallet integration, without passkey authentication, a bridge, bank payout or fiat conversion. Local demo activity never appears here.</p>
      </section>
    </div>
  )
}


