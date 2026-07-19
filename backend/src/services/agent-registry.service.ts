import { Agent, AgentLevel } from '../types';
import { HttpError } from '../utils/http-error';

/**
 * Know-Your-Agent registry: agents carry a reputation level (0–3) and must be
 * allowlisted before they may deploy vault capital.
 */
export class AgentRegistryService {
  private agents = new Map<string, Agent>();

  snapshot(): unknown {
    return { agents: [...this.agents.values()] };
  }

  restore(data: unknown): void {
    const state = data as { agents: Agent[] };
    this.agents = new Map(state.agents.map((a) => [a.address, a]));
  }

  register(params: { address: string; name: string; owner: string; metadata?: Record<string, string> }): Agent {
    if (this.agents.has(params.address)) {
      throw HttpError.conflict(`agent ${params.address} already registered`);
    }
    const agent: Agent = {
      address: params.address,
      name: params.name,
      owner: params.owner,
      level: 0,
      allowlisted: false,
      registeredAt: Date.now(),
      metadata: params.metadata ?? {},
    };
    this.agents.set(agent.address, agent);
    return agent;
  }

  list(): Agent[] {
    return [...this.agents.values()];
  }

  get(address: string): Agent {
    const agent = this.agents.get(address);
    if (!agent) throw HttpError.notFound(`agent ${address} not registered`);
    return agent;
  }

  setLevel(address: string, level: AgentLevel): Agent {
    const agent = this.get(address);
    agent.level = level;
    return agent;
  }

  setAllowlisted(address: string, allowlisted: boolean): Agent {
    const agent = this.get(address);
    if (allowlisted && agent.level < 1) {
      throw HttpError.forbidden('agent must be at least level 1 to be allowlisted');
    }
    agent.allowlisted = allowlisted;
    return agent;
  }

  assertMayDeploy(address: string): Agent {
    const agent = this.get(address);
    if (!agent.allowlisted) throw HttpError.forbidden(`agent ${address} is not allowlisted`);
    return agent;
  }
}

export const agentRegistryService = new AgentRegistryService();
