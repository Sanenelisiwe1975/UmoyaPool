import { randomUUID } from 'node:crypto';
import { Payment } from '../types';
import { HttpError } from '../utils/http-error';
import { toBig } from '../utils/amounts';

const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * x402-style machine-to-machine payments: a payment request is created,
 * settled by reference, and each settlement may be consumed exactly once
 * (replay protection).
 */
export class PaymentService {
  private payments = new Map<string, Payment>();
  private consumed = new Set<string>();

  snapshot(): unknown {
    return { payments: [...this.payments.values()], consumed: [...this.consumed] };
  }

  restore(data: unknown): void {
    const state = data as { payments: Payment[]; consumed: string[] };
    this.payments = new Map(state.payments.map((p) => [p.id, p]));
    this.consumed = new Set(state.consumed);
  }

  request(params: { from: string; to: string; amount: string; asset: string; memo?: string; ttlMs?: number }): Payment {
    if (toBig(params.amount) === 0n) throw HttpError.badRequest('amount must be positive');
    const now = Date.now();
    const payment: Payment = {
      id: randomUUID(),
      from: params.from,
      to: params.to,
      amount: params.amount,
      asset: params.asset,
      memo: params.memo ?? '',
      status: 'pending',
      createdAt: now,
      expiresAt: now + (params.ttlMs ?? DEFAULT_TTL_MS),
    };
    this.payments.set(payment.id, payment);
    return payment;
  }

  settle(id: string): Payment {
    const payment = this.get(id);
    if (payment.status === 'settled') throw HttpError.conflict('payment already settled');
    if (Date.now() > payment.expiresAt) {
      payment.status = 'expired';
      throw HttpError.conflict('payment request expired');
    }
    payment.status = 'settled';
    return payment;
  }

  /** One-shot verification: succeeds once per settled payment, then is consumed. */
  consume(id: string): Payment {
    const payment = this.get(id);
    if (payment.status !== 'settled') throw HttpError.conflict('payment is not settled');
    if (this.consumed.has(id)) throw HttpError.conflict('payment already consumed');
    this.consumed.add(id);
    return payment;
  }

  get(id: string): Payment {
    const payment = this.payments.get(id);
    if (!payment) throw HttpError.notFound(`payment ${id} not found`);
    return payment;
  }

  list(address?: string): Payment[] {
    const all = [...this.payments.values()];
    return address ? all.filter((p) => p.from === address || p.to === address) : all;
  }
}

export const paymentService = new PaymentService();
