import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger';

export interface Persistable {
  snapshot(): unknown;
  restore(data: unknown): void;
}

const SAVE_DEBOUNCE_MS = 250;

/**
 * Snapshots registered services to a single JSON file. Saves are debounced;
 * a mutation-heavy burst produces one write. State is human-readable so it
 * can be inspected or reset (delete the file) during development.
 */
export class Persistence {
  private services = new Map<string, Persistable>();
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly filePath: string) {}

  register(name: string, service: Persistable): void {
    this.services.set(name, service);
  }

  /** Loads the state file if present. Returns true when state was restored. */
  load(): boolean {
    if (!fs.existsSync(this.filePath)) return false;
    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Record<string, unknown>;
      for (const [name, service] of this.services) {
        if (name in raw) service.restore(raw[name]);
      }
      logger.info('state restored', { file: this.filePath });
      return true;
    } catch (err) {
      logger.error('failed to load state; starting fresh', {
        file: this.filePath,
        message: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  schedule(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.saveNow();
    }, SAVE_DEBOUNCE_MS);
  }

  saveNow(): void {
    const state: Record<string, unknown> = {};
    for (const [name, service] of this.services) {
      state[name] = service.snapshot();
    }
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, this.filePath);
  }
}

export const persistence = new Persistence(
  process.env.STATE_FILE ?? path.join(process.cwd(), 'data', 'state.json'),
);
