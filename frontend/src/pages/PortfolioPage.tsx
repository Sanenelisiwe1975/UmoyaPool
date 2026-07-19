import { api, formatAmount, formatBps } from '../lib/api';
import { useApi } from '../lib/useApi';
import { useWallet } from '../context/WalletContext';

function MyPositions({ owner }: { owner: string }) {
  const { data, error, loading } = useApi(() => api.positions(owner));
  const vaultsQuery = useApi(() => api.listVaults());

  if (loading || vaultsQuery.loading) return null;
  if (error) return <p className="error-text">{error}</p>;

  const positions = data?.positions ?? [];
  const vaultName = (id: string) =>
    vaultsQuery.data?.vaults.find((v) => v.id === id)?.name ?? id.slice(0, 8);

  return (
    <div className="card">
      <h3>My positions</h3>
      {positions.length === 0 ? (
        <p className="muted">No positions yet — make a deposit from the Vaults page.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Vault</th>
              <th>Shares</th>
              <th>Cost basis</th>
              <th>Current value</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.vaultId}>
                <td>{vaultName(p.vaultId)}</td>
                <td>{formatAmount(p.shares)}</td>
                <td>{formatAmount(p.costBasis)}</td>
                <td>{formatAmount(p.currentValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function PortfolioPage() {
  const { data, error, loading } = useApi(() => api.listVaults());
  const { address } = useWallet();

  if (loading) return <p className="muted">Loading portfolio…</p>;
  if (error) return <p className="error-text">Backend unreachable: {error}</p>;

  const vaults = data?.vaults ?? [];
  const tvl = vaults.reduce((sum, v) => sum + Number(v.totalAssets), 0);
  const deployed = vaults.reduce((sum, v) => sum + Number(v.deployedAssets), 0);
  const avgApy = vaults.length
    ? vaults.reduce((sum, v) => sum + v.apyBps, 0) / vaults.length
    : 0;

  return (
    <>
      <div className="stat-grid">
        <div className="card">
          <div className="stat-label">Total value locked</div>
          <div className="stat-value">{formatAmount(String(tvl))} </div>
          <div className="muted">across {vaults.length} vaults</div>
        </div>
        <div className="card">
          <div className="stat-label">Capital deployed</div>
          <div className="stat-value">{formatAmount(String(deployed))}</div>
          <div className="muted">working in strategies</div>
        </div>
        <div className="card">
          <div className="stat-label">Average APY</div>
          <div className="stat-value">{formatBps(avgApy)}</div>
          <div className="muted">advertised, across vaults</div>
        </div>
      </div>

      {address && <MyPositions owner={address} key={address} />}

      <div className="card">
        <h3>Vault overview</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Vault</th>
              <th>Asset</th>
              <th>TVL</th>
              <th>Deployed</th>
              <th>APY</th>
              <th>Risk</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vaults.map((v) => (
              <tr key={v.id}>
                <td>{v.name}</td>
                <td>{v.asset}</td>
                <td>{formatAmount(v.totalAssets)}</td>
                <td>{formatAmount(v.deployedAssets)}</td>
                <td>{formatBps(v.apyBps)}</td>
                <td><span className={`badge ${v.riskLevel}`}>{v.riskLevel}</span></td>
                <td>
                  <span className={`badge ${v.paused ? 'high' : 'low'}`}>
                    {v.paused ? 'paused' : 'active'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
