import { api, formatAmount } from '../lib/api';
import { useApi } from '../lib/useApi';

export default function StokvelPage() {
  const { data, error, loading } = useApi(() => api.listStokvels());

  if (loading) return <p className="muted">Loading stokvels…</p>;
  if (error) return <p className="error-text">Backend unreachable: {error}</p>;

  return (
    <>
      {(data?.stokvels ?? []).map((s) => (
        <div className="card" key={s.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>{s.name}</h3>
            <span className="badge neutral">
              {s.approvalThreshold} of {s.members.length} approval
            </span>
          </div>
          <div className="stat-grid" style={{ marginTop: 12 }}>
            <div>
              <div className="stat-label">Pool balance</div>
              <div className="stat-value">{formatAmount(s.balance)} XLM</div>
            </div>
            <div>
              <div className="stat-label">Members</div>
              <div className="stat-value">{s.members.length}</div>
            </div>
            <div>
              <div className="stat-label">Yield vault</div>
              <div className="stat-value">{s.yieldVaultId ? 'Linked' : '—'}</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <h3>Members</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Contributed</th>
                </tr>
              </thead>
              <tbody>
                {s.members.map((m) => (
                  <tr key={m.address}>
                    <td className="muted">{m.address.slice(0, 8)}…{m.address.slice(-4)}</td>
                    <td>{formatAmount(m.contributed)} XLM</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {s.proposals.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>Proposals</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Approvals</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {s.proposals.map((p) => (
                    <tr key={p.id}>
                      <td>{p.kind}</td>
                      <td>{formatAmount(p.amount)} XLM</td>
                      <td>{p.approvals.length} / {s.approvalThreshold}</td>
                      <td>
                        <span className={`badge ${p.executed ? 'low' : 'neutral'}`}>
                          {p.executed ? 'executed' : 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
