import { useState } from 'react';
import { api, formatBps } from '../lib/api';
import { useApi } from '../lib/useApi';

export default function StrategiesPage() {
  const { data, error, loading, refresh } = useApi(() => api.listStrategies());
  const [busyId, setBusyId] = useState<string | null>(null);

  const subscribe = async (id: string) => {
    setBusyId(id);
    try {
      await api.subscribe(id);
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="muted">Loading strategies…</p>;
  if (error) return <p className="error-text">Backend unreachable: {error}</p>;

  return (
    <>
      {(data?.strategies ?? []).map((s) => (
        <div className="card" key={s.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h3>{s.name}</h3>
              <div className="muted">{s.description}</div>
            </div>
            <span className={`badge ${s.riskLevel}`}>{s.riskLevel}</span>
          </div>
          <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
            <span className="muted">
              {s.kind} · fee {formatBps(s.feeBps)} · {s.subscribers} subscriber{s.subscribers === 1 ? '' : 's'}
            </span>
            <button
              className="btn-ghost"
              onClick={() => subscribe(s.id)}
              disabled={busyId === s.id || !s.active}
            >
              {busyId === s.id ? 'Subscribing…' : s.active ? 'Subscribe' : 'Inactive'}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
