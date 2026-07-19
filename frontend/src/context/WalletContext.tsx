import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { api, setSessionToken } from '../lib/api';

interface WalletState {
  address: string | null;
  connect: (address: string) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

const STORAGE_KEY = 'umoyapool.session';

function loadStored(): { address: string; token: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { address: string; token: string };
    setSessionToken(parsed.token);
    return parsed;
  } catch {
    return null;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(() => loadStored()?.address ?? null);

  const connect = useCallback(async (addr: string) => {
    const { token } = await api.devSession(addr);
    setSessionToken(token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: addr, token }));
    setAddress(addr);
  }, []);

  const disconnect = useCallback(() => {
    setSessionToken(null);
    localStorage.removeItem(STORAGE_KEY);
    setAddress(null);
  }, []);

  const value = useMemo(() => ({ address, connect, disconnect }), [address, connect, disconnect]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
