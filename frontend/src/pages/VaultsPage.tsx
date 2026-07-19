import { useState } from 'react';
import { api, Vault, formatAmount, formatBps } from '../lib/api';
import { useApi } from '../lib/useApi';
import { useWallet } from '../context/WalletContext';

// Fallback identity when no wallet is connected; matches the backend seed data.
const DEMO_OWNER = 'GDEMOALICEADDRESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

function ActionForms({ vault, owner, onDone }: { vault: Vault; owner: string; onDone: () => void }) {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');
  const [busy, setBusy] = useState<'deposit' | 'withdraw' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const toStroops = (value: string): string | null => {
    const units = Number(value);
    if (!Number.isFinite(units) || units <= 0) return null;
    return String(Math.round(units * 1e7));
  };

  const deposit = async () => {
    const stroops = toStroops(depositAmount);
    if (!stroops) return setMessage('Enter a positive amount');
    setBusy('deposit');
    setMessage(null);
    try {
      const result = await api.deposit(vault.id, owner, stroops);
      setMessage(`Received ${formatAmount(result.sharesReceived)} shares`);
      setDepositAmount('');
      onDone();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'deposit failed');
    } finally {
      setBusy(null);
    }
  };

  const withdraw = async () => {
    const stroops = toStroops(withdrawShares);
    if (!stroops) return setMessage('Enter a positive share amount');
    setBusy('withdraw');
    setMessage(null);
    try {
      const result = await api.withdraw(vault.id, owner, stroops);
      setMessage(`Received ${formatAmount(result.assetsReceived)} ${vault.asset}`);
      setWithdrawShares('');
      onDone();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'withdraw failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="row">
        <input
          placeholder={`Deposit (${vault.asset})`}
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          style={{ width: 150 }}
        />
        <button className="btn-primary" onClick={deposit} disabled={busy !== null}>
          {busy === 'deposit' ? 'Depositing…' : 'Deposit'}
        </button>
        <input
          placeholder="Withdraw (shares)"
          value={withdrawShares}
          onChange={(e) => setWithdrawShares(e.target.value)}
          style={{ width: 150 }}
        />
        <button className="btn-ghost" onClick={withdraw} disabled={busy !== null}>
          {busy === 'withdraw' ? 'Withdrawing…' : 'Withdraw'}
        </button>
      </div>
      {message && <p className="muted" style={{ marginTop: 8 }}>{message}</p>}
    </>
  );
}

export default function VaultsPage() {
  const { data, error, loading, refresh } = useApi(() => api.listVaults());
  const { address } = useWallet();
  const owner = address ?? DEMO_OWNER;

  if (loading) return <p className="muted">Loading vaults…</p>;
  if (error) return <p className="error-text">Backend unreachable: {error}</p>;

  return (
    <>
      {!address && (
        <p className="muted">
          Not connected — actions run against the demo account. Use Connect Wallet to act as
          your own address.
        </p>
      )}
      {(data?.vaults ?? []).map((vault) => (
        <div className="card" key={vault.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h3>{vault.name}</h3>
              <div className="muted">
                {vault.asset} · TVL {formatAmount(vault.totalAssets)} · APY {formatBps(vault.apyBps)}
              </div>
            </div>
            <span className={`badge ${vault.riskLevel}`}>{vault.riskLevel}</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ marginBottom: 8 }}>
              Guardrails: max drawdown {formatBps(vault.guardrails.maxDrawdownBps)}
              {vault.guardrails.whitelistedProtocols.length > 0 &&
                ` · protocols: ${vault.guardrails.whitelistedProtocols.join(', ')}`}
            </div>
            <ActionForms vault={vault} owner={owner} onDone={refresh} />
          </div>
        </div>
      ))}
    </>
  );
}
