import { randomBytes } from 'node:crypto';
import { Keypair } from '@stellar/stellar-sdk';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { HttpError } from '../utils/http-error';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

interface Challenge {
  nonce: string;      // base64
  expiresAt: number;
}

/**
 * Wallet authentication: the server hands out a random nonce, the wallet
 * signs its raw bytes with the account's ed25519 key, and a valid signature
 * earns a session JWT. Challenges are single-use and short-lived.
 */
export class AuthService {
  private challenges = new Map<string, Challenge>();

  createChallenge(address: string): { challenge: string; expiresAt: number } {
    this.assertValidAddress(address);
    const challenge: Challenge = {
      nonce: randomBytes(32).toString('base64'),
      expiresAt: Date.now() + CHALLENGE_TTL_MS,
    };
    this.challenges.set(address, challenge);
    return { challenge: challenge.nonce, expiresAt: challenge.expiresAt };
  }

  verify(address: string, signatureBase64: string): string {
    const challenge = this.challenges.get(address);
    if (!challenge) throw HttpError.unauthorized('no challenge issued for this address');
    this.challenges.delete(address); // single use, pass or fail
    if (Date.now() > challenge.expiresAt) throw HttpError.unauthorized('challenge expired');

    let valid = false;
    try {
      const keypair = Keypair.fromPublicKey(address);
      valid = keypair.verify(
        Buffer.from(challenge.nonce, 'base64'),
        Buffer.from(signatureBase64, 'base64'),
      );
    } catch {
      valid = false;
    }
    if (!valid) throw HttpError.unauthorized('invalid signature');

    return this.issueToken(address);
  }

  issueToken(address: string): string {
    return jwt.sign({ sub: address }, config.jwtSecret, { expiresIn: config.jwtTtlSeconds });
  }

  private assertValidAddress(address: string): void {
    try {
      Keypair.fromPublicKey(address);
    } catch {
      throw HttpError.badRequest('not a valid Stellar public key');
    }
  }
}

export const authService = new AuthService();
