import dotenv from 'dotenv';

dotenv.config();

function env(name: string, fallback: string): string {
  const value = process.env[name];
  return value !== undefined && value !== '' ? value : fallback;
}

export const config = {
  port: Number(env('PORT', '3000')),
  nodeEnv: env('NODE_ENV', 'development'),

  // Bearer key accepted for API access in development.
  apiKey: env('API_KEY', 'umoyapool-dev-key'),

  // Separate key required by admin-only routes via the x-admin-key header.
  adminKey: env('ADMIN_KEY', 'umoyapool-admin-key'),

  // Secret used to sign wallet session JWTs.
  jwtSecret: env('JWT_SECRET', 'umoyapool-dev-jwt-secret-change-me'),
  jwtTtlSeconds: Number(env('JWT_TTL_SECONDS', String(60 * 60 * 12))),

  stellar: {
    network: env('STELLAR_NETWORK', 'testnet') as 'testnet' | 'mainnet',
    rpcUrl: env('STELLAR_RPC_URL', 'https://soroban-testnet.stellar.org'),
    horizonUrl: env('STELLAR_HORIZON_URL', 'https://horizon-testnet.stellar.org'),
  },
} as const;
