import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import ConnectModal from './ConnectModal';

const NAV = [
  { to: '/app', label: 'Portfolio', end: true },
  { to: '/app/vaults', label: 'Vaults' },
  { to: '/app/stokvel', label: 'Stokvel' },
  { to: '/app/strategies', label: 'Strategies' },
  { to: '/app/agents', label: 'Agents' },
];

const TITLES: Record<string, string> = {
  '/app': 'Portfolio',
  '/app/vaults': 'Vaults',
  '/app/stokvel': 'Stokvel',
  '/app/strategies': 'Strategy Marketplace',
  '/app/agents': 'Agent Registry',
};

export default function Layout() {
  const { pathname } = useLocation();
  const { address, disconnect } = useWallet();
  const [showConnect, setShowConnect] = useState(false);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          Umoya<span>Pool</span>
        </div>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </aside>
      <div className="main">
        <header className="header">
          <h1>{TITLES[pathname] ?? 'UmoyaPool'}</h1>
          {address ? (
            <div className="row">
              <span className="badge neutral">
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
              <button className="btn-ghost" onClick={disconnect}>
                Disconnect
              </button>
            </div>
          ) : (
            <button className="btn-ghost" onClick={() => setShowConnect(true)}>
              Connect Wallet
            </button>
          )}
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      {showConnect && <ConnectModal onClose={() => setShowConnect(false)} />}
    </div>
  );
}
