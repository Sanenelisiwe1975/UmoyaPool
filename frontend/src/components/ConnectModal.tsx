import { useState } from 'react';
import { useWallet } from '../context/WalletContext';

const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;

// Seeded demo account, offered as a one-click option in development.
const DEMO_ADDRESS = 'GDEMOALICEADDRESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export default function ConnectModal({ onClose }: { onClose: () => void }) {
  const { connect } = useWallet();
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (addr: string) => {
    if (!STELLAR_ADDRESS.test(addr)) {
      setError('Enter a valid Stellar public key (G…, 56 characters)');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await connect(addr);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'connection failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Connect wallet</h3>
        <p className="muted" style={{ marginBottom: 16 }}>
          Enter your Stellar public key to start a session. Freighter signing and full
          challenge–response auth arrive with on-chain integration.
        </p>
        <input
          placeholder="G…"
          value={address}
          onChange={(e) => setAddress(e.target.value.trim().toUpperCase())}
          style={{ width: '100%' }}
        />
        {error && <p className="error-text" style={{ marginTop: 8 }}>{error}</p>}
        <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={() => submit(DEMO_ADDRESS)} disabled={busy}>
            Use demo account
          </button>
          <button className="btn-primary" onClick={() => submit(address)} disabled={busy}>
            {busy ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}
