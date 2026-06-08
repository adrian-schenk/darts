import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { User } from 'src/users/user.entity';
import ConnectionsService from 'src/ws/connections.service';
import DartsGameService from '../game/game.service';
import { BotUser } from 'src/users/users.service';

enum MMType {
  RANKED,
  UNRANKED,
}

const QueueModeConfigs = {};

@Injectable()
export default class MatchmakingService {
  queue: Map<string, Array<{ user: User; socketId: string, timestamp: number }>> = new Map();
  constructor(
    @Inject(forwardRef(() => ConnectionsService))
    private readonly connectionsService: ConnectionsService,
    @Inject(forwardRef(() => DartsGameService))
    private readonly gameService: DartsGameService,
  ) {
    setInterval(() => this.doMatchMaking(), 2500);
  }

  async doMatchMaking() {
    for (const [mode, users] of this.queue.entries()) {
      if (QueueModeConfigs[mode]?.type != 'ranked') {
        for (const user of users) {
          if (Date.now() - user.timestamp > 30000) {
            this.leaveQueue(user.user);
            let { gameId } = await this.gameService.createMultiPlayerGame([[user.user, 'human'], [BotUser, 'bot']], { mode });

            this.connectionsService.broadcastToUsers([user.user.id.toString()], 'match_found', { gameId });
          }
        }
      }
      if (users.length >= 2) {
        const user1 = users[0];
        const user2 = users[1];

        // Remove both players from the queue
        this.leaveQueue(user1.user);
        this.leaveQueue(user2.user);

        let { gameId } = await this.gameService.createMultiPlayerGame([[user1.user, 'human'], [user2.user, 'human']], { mode });

        this.connectionsService.broadcastToUsers([user1.user.id.toString(), user2.user.id.toString()], 'match_found', { gameId });
      }
    }
  }

  getElo() {}

  updateElo() {}

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

  joinQueue(mode: string, user: User, socketId: string) {
    if (this.isUserInQueue(user)) {
      return { res: false, msg: 'User is already in a queue' };
    }
    if (!this.queue.has(mode)) {
      this.queue.set(mode, []);
    }
    const queue = this.queue.get(mode);
    if (queue) {
      queue.push({ user, socketId, timestamp: Date.now() });
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

    let key = '' + config.gameConfig.startingScore + '/' + config.gameConfig.checkoutMode + '/' + (config.type ?? 'unranked');

    if (!QueueModeConfigs[key]) {
      QueueModeConfigs[key] = key;
    }

    return key;
  }
}
