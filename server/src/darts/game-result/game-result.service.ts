import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { GameEntity } from '../game/entities/game.entity';
import { GameState } from '../game/gameState';
import type { GameResultContext } from '../game/gameEndHandler';

const DEFAULT_ELO = 1000;
const ELO_K_FACTOR = 32;

@Injectable()
export class GameResultService {
  constructor(
    @InjectModel(GameEntity.name) private readonly gameModel: Model<GameEntity>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly usersService: UsersService,
  ) {}

  async recordFinishedGame(context: GameResultContext): Promise<void> {
    const { gameState, winnerPlayerUuid } = context;
    const winnerUserId =
      gameState.playerStates.get(winnerPlayerUuid)?.userId ?? null;

    const players: Array<{
      userId: number;
      username: string;
      winner: boolean;
      stats: Record<string, any>;
    }> = [];
    for (const [uuid, playerState] of gameState.playerStates) {
      const user = await this.usersService.findById(playerState.userId);
      players.push({
        userId: playerState.userId,
        username: playerState.playername || user?.username || `Player ${playerState.userId}`,
        winner: uuid === winnerPlayerUuid,
        stats: { ...(playerState.stats?.stats ?? {}) },
      });
    }

    await this.gameModel.updateOne(
      { gameId: gameState.gameId },
      {
        $set: {
          status: 'finished',
          winnerUserId: winnerUserId !== null ? String(winnerUserId) : null,
          finishedAt: new Date(),
          result: { winnerPlayerUuid, players },
          updatedAt: new Date(),
        },
      },
    );

    if (gameState.config?.isRanked) {
      await this.updateElo(gameState, winnerPlayerUuid);
    }
  }

  private async updateElo(gameState: GameState, winnerPlayerUuid: string) {
    const playerStates = Array.from(gameState.playerStates.values());
    if (playerStates.length !== 2) return;

    const winnerUserId = gameState.playerStates.get(winnerPlayerUuid)?.userId;
    const loserUserId = playerStates.find(
      (p) => p.userId !== winnerUserId,
    )?.userId;
    if (winnerUserId === undefined || loserUserId === undefined) return;

    const winner = await this.userRepository.findOneBy({ id: winnerUserId });
    const loser = await this.userRepository.findOneBy({ id: loserUserId });
    if (!winner || !loser) return;
    if (winner.uuid === 'bot' || loser.uuid === 'bot') return;

    const winnerElo = winner.elo ?? DEFAULT_ELO;
    const loserElo = loser.elo ?? DEFAULT_ELO;

    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const winnerDelta = Math.round(ELO_K_FACTOR * (1 - expectedWinner));
    const loserDelta = Math.round(ELO_K_FACTOR * (0 - (1 - expectedWinner)));

    winner.elo = winnerElo + winnerDelta;
    loser.elo = loserElo + loserDelta;

    await this.userRepository.save([winner, loser]);
  }
}
