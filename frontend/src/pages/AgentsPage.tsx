import { api } from '../lib/api';
import { useApi } from '../lib/useApi';

const LEVEL_LABELS = ['Unverified', 'Basic', 'Verified', 'Trusted'] as const;

export default function AgentsPage() {
  const { data, error, loading } = useApi(() => api.listAgents());

  if (loading) return <p className="muted">Loading agents…</p>;
  if (error) return <p className="error-text">Backend unreachable: {error}</p>;

  return (
    <div className="card">
      <h3>Registered agents</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Address</th>
            <th>KYA level</th>
            <th>Allowlisted</th>
          </tr>
        </thead>
        <tbody>
          {(data?.agents ?? []).map((a) => (
            <tr key={a.address}>
              <td>{a.name}</td>
              <td className="muted">{a.address.slice(0, 8)}…{a.address.slice(-4)}</td>
              <td>
                <span className="badge neutral">
                  L{a.level} · {LEVEL_LABELS[a.level]}
                </span>
              </td>
              <td>
                <span className={`badge ${a.allowlisted ? 'low' : 'high'}`}>
                  {a.allowlisted ? 'yes' : 'no'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
