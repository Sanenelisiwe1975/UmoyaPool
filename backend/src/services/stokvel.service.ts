import { randomUUID } from 'node:crypto';
import { Stokvel, StokvelProposal } from '../types';
import { HttpError } from '../utils/http-error';
import { addAmounts, subAmounts, toBig } from '../utils/amounts';
import { vaultService } from './vault.service';

/**
 * Stokvel: group savings pool with M-of-N approval for payouts. A stokvel is
 * one consumer of the shared vault engine — it can point its balance at a
 * yield vault but owns no yield logic itself.
 */
export class StokvelService {
  private stokvels = new Map<string, Stokvel>();

  snapshot(): unknown {
    return { stokvels: [...this.stokvels.values()] };
  }

  restore(data: unknown): void {
    const state = data as { stokvels: Stokvel[] };
    this.stokvels = new Map(state.stokvels.map((s) => [s.id, s]));
  }

  create(params: { name: string; creator: string; approvalThreshold: number }): Stokvel {
    if (params.approvalThreshold < 1) {
      throw HttpError.badRequest('approvalThreshold must be at least 1');
    }
    const stokvel: Stokvel = {
      id: randomUUID(),
      name: params.name,
      creator: params.creator,
      members: [{ address: params.creator, contributed: '0', joinedAt: Date.now() }],
      approvalThreshold: params.approvalThreshold,
      balance: '0',
      yieldVaultId: null,
      proposals: [],
      createdAt: Date.now(),
    };
    this.stokvels.set(stokvel.id, stokvel);
    return stokvel;
  }

  list(): Stokvel[] {
    return [...this.stokvels.values()];
  }

  get(id: string): Stokvel {
    const stokvel = this.stokvels.get(id);
    if (!stokvel) throw HttpError.notFound(`stokvel ${id} not found`);
    return stokvel;
  }

  join(id: string, address: string): Stokvel {
    const stokvel = this.get(id);
    if (stokvel.members.some((m) => m.address === address)) {
      throw HttpError.conflict('already a member');
    }
    stokvel.members.push({ address, contributed: '0', joinedAt: Date.now() });
    return stokvel;
  }

  contribute(id: string, address: string, amount: string): Stokvel {
    const stokvel = this.get(id);
    const member = this.memberOf(stokvel, address);
    if (toBig(amount) === 0n) throw HttpError.badRequest('contribution must be positive');
    member.contributed = addAmounts(member.contributed, amount);
    stokvel.balance = addAmounts(stokvel.balance, amount);
    return stokvel;
  }

  setYieldVault(id: string, requester: string, vaultId: string): Stokvel {
    const stokvel = this.get(id);
    if (stokvel.creator !== requester) {
      throw HttpError.forbidden('only the creator may set the yield vault');
    }
    vaultService.getVault(vaultId); // validate it exists
    stokvel.yieldVaultId = vaultId;
    return stokvel;
  }

  propose(id: string, proposer: string, params: {
    kind: StokvelProposal['kind'];
    recipient: string;
    amount: string;
  }): StokvelProposal {
    const stokvel = this.get(id);
    this.memberOf(stokvel, proposer);
    if (toBig(params.amount) > toBig(stokvel.balance)) {
      throw HttpError.badRequest('proposal exceeds pool balance');
    }
    const proposal: StokvelProposal = {
      id: randomUUID(),
      kind: params.kind,
      recipient: params.recipient,
      amount: params.amount,
      approvals: [proposer],
      executed: false,
      createdAt: Date.now(),
    };
    stokvel.proposals.push(proposal);
    return proposal;
  }

  approve(id: string, proposalId: string, approver: string): { stokvel: Stokvel; proposal: StokvelProposal } {
    const stokvel = this.get(id);
    this.memberOf(stokvel, approver);
    const proposal = stokvel.proposals.find((p) => p.id === proposalId);
    if (!proposal) throw HttpError.notFound(`proposal ${proposalId} not found`);
    if (proposal.executed) throw HttpError.conflict('proposal already executed');
    if (!proposal.approvals.includes(approver)) proposal.approvals.push(approver);

    if (proposal.approvals.length >= stokvel.approvalThreshold) {
      this.execute(stokvel, proposal);
    }
    return { stokvel, proposal };
  }

  private execute(stokvel: Stokvel, proposal: StokvelProposal): void {
    if (toBig(proposal.amount) > toBig(stokvel.balance)) {
      throw HttpError.conflict('pool balance no longer covers proposal');
    }
    if (proposal.kind === 'invest') {
      if (!stokvel.yieldVaultId) throw HttpError.conflict('no yield vault configured');
      vaultService.deposit(stokvel.yieldVaultId, `stokvel:${stokvel.id}`, proposal.amount);
    }
    stokvel.balance = subAmounts(stokvel.balance, proposal.amount);
    proposal.executed = true;
  }

  private memberOf(stokvel: Stokvel, address: string) {
    const member = stokvel.members.find((m) => m.address === address);
    if (!member) throw HttpError.forbidden(`${address} is not a member of this stokvel`);
    return member;
  }
}

export const stokvelService = new StokvelService();
