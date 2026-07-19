import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="landing">
      <div className="brand" style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        Umoya<span style={{ color: 'var(--primary-strong)' }}>Pool</span>
      </div>
      <h1>
        Private and programmable yield for <span>AI agents</span> on Stellar
      </h1>
      <p>
        Deploy capital across Stellar DeFi with on-chain risk guardrails, run confidential
        strategies, save together with stokvels, and let agents pay each other machine-to-machine.
        Mobile-first, low-fee, privacy-native — built for African markets.
      </p>
      <Link to="/app">
        <button className="btn-primary">Launch App</button>
      </Link>
    </div>
  );
}
