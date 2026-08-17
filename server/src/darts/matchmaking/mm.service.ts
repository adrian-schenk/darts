import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { User } from 'src/users/user.entity';
import ConnectionsService from 'src/ws/connections.service';
import DartsGameService from '../game/game.service';
import { BotUser } from 'src/users/users.service';

const RANKED_SUFFIX = '/ranked';
const BOT_BACKFILL_TIMEOUT_MS = 30000;

interface QueueEntry {
  user: User;
  socketId: string;
  timestamp: number;
  config: any;
}

export type { QueueEntry };

@Injectable()
export default class MatchmakingService {
  queue: Map<string, Array<QueueEntry>> = new Map();

  constructor(
    @Inject(forwardRef(() => ConnectionsService))
    private readonly connectionsService: ConnectionsService,
    @Inject(forwardRef(() => DartsGameService))
    private readonly gameService: DartsGameService,
  ) {
    setInterval(() => this.doMatchMaking(), 2500);
  }

  async doMatchMaking() {
    for (const [mode, entries] of this.queue.entries()) {
      if (entries.length === 0) continue;

      const isRanked = mode.endsWith(RANKED_SUFFIX);

      if (entries.length >= 2) {
        const [first, second] = isRanked
          ? this.pickRankedPair(entries)
          : [entries[0], entries[1]];

        this.leaveQueue(first.user);
        this.leaveQueue(second.user);
        await this.startMatch(first, second.user);
        continue;
      }

      const entry = entries[0];
      if (!isRanked && Date.now() - entry.timestamp > BOT_BACKFILL_TIMEOUT_MS) {
        this.leaveQueue(entry.user);
        await this.startMatch(entry, BotUser);
      }
    }
  }

  private pickRankedPair(entries: QueueEntry[]): [QueueEntry, QueueEntry] {
    const sorted = [...entries].sort((a, b) => (a.user.elo ?? 1000) - (b.user.elo ?? 1000));

    let bestPair: [QueueEntry, QueueEntry] = [sorted[0], sorted[1]];
    let smallestGap = Math.abs((sorted[0].user.elo ?? 1000) - (sorted[1].user.elo ?? 1000));

    for (let i = 1; i < sorted.length - 1; i += 1) {
      const gap = Math.abs((sorted[i].user.elo ?? 1000) - (sorted[i + 1].user.elo ?? 1000));
      if (gap < smallestGap) {
        smallestGap = gap;
        bestPair = [sorted[i], sorted[i + 1]];
      }
    }

    return bestPair;
  }

  private async startMatch(entry: QueueEntry, opponent: User) {
    const mode = this.getModeFromEntry(entry);
    const { gameId } = await this.gameService.createMultiPlayerGame(
      [
        [entry.user, 'human'],
        [opponent, opponent.uuid === 'bot' ? 'bot' : 'human'],
      ],
      { mode, ...entry.config },
    );

    this.connectionsService.broadcastToUsers(
      [entry.user.id.toString(), opponent.id.toString()],
      'match_found',
      { gameId },
    );
  }

  private getModeFromEntry(entry: QueueEntry): string {
    const type = entry.config?.type ?? 'unranked';
    return `${entry.config?.gameConfig?.startingScore ?? 501}/${entry.config?.gameConfig?.checkoutMode ?? 'double-out'}/${type}`;
  }

  getQueue(mode: string) {
    return this.queue.get(mode) || [];
  }

  isUserInQueue(user: User) {
    for (const users of this.queue.values()) {
      if (users.some((u) => u.user.id === user.id)) {
        return true;
      }
    }
    return false;
  }

  joinQueue(mode: string, user: User, socketId: string, config: any) {
    if (this.isUserInQueue(user)) {
      return { res: false, msg: 'User is already in a queue' };
    }
    if (!this.queue.has(mode)) {
      this.queue.set(mode, []);
    }
    const queue = this.queue.get(mode);
    if (queue) {
      queue.push({ user, socketId, timestamp: Date.now(), config });
    }
    console.log(`User ${user.username} joined queue for mode ${mode}`);
    return { res: true, msg: 'Joined queue' };
  }

  leaveQueue(user: User) {
    for (const [mode, users] of this.queue.entries()) {
      this.queue.set(
        mode,
        users.filter((u) => u.user.id !== user.id),
      );
    }
    console.log(`User ${user.username} left queue`);
  }

  getQueueNameFromConfig(config: any) {
    const key =
      `${config.gameConfig.startingScore}/${config.gameConfig.checkoutMode}/` +
      `${config.type ?? 'unranked'}`;

    return key;
  }
}
