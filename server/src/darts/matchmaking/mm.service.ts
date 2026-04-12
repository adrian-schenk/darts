import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { User } from 'src/users/user.entity';
import ConnectionsService from 'src/ws/connections.service';
import DartsGameService from '../game/game.service';

enum MMType {
  RANKED,
  UNRANKED,
  SOLO,
  TEAM,
}

@Injectable()
export default class MatchmakingService {
  queue: Map<string, Array<{ user: User; socketId: string }>> = new Map();
  constructor(
    @Inject(forwardRef(() => ConnectionsService))
    private readonly connectionsService: ConnectionsService,
    @Inject(forwardRef(() => DartsGameService))
    private readonly gameService: DartsGameService,
  ) {}

  async findMatch(mode: string, user: User, userSocketId: string) {
    let possibleOpponents = this.queue.get(mode)?.filter((u) => u.user.id !== user.id) || [];
    console.log(possibleOpponents)
    if (possibleOpponents.length > 0) {
      const opponent = possibleOpponents[Math.floor(Math.random() * possibleOpponents.length)];

      // Remove both players from the queue
      this.leaveQueue(user);
      this.leaveQueue(opponent.user);

      let { gameId } = await this.gameService.createMultiPlayerGame([[user, 'human'], [opponent.user, 'human']], { mode });

      this.connectionsService.broadcast([opponent.socketId, userSocketId], 'match_found', { gameId });
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
      queue.push({ user, socketId });
    }
    
    this.findMatch(mode, user, socketId);

    return { res: true, msg: 'Joined queue' };
  }

  leaveQueue(user: User) {
    for (const [mode, users] of this.queue.entries()) {
      this.queue.set(
        mode,
        users.filter((u) => u.user.id !== user.id),
      );
    }
  }
  
}
