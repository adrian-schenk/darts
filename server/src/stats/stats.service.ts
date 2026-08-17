import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from 'src/users/users.service';
import { GameEntity } from 'src/darts/game/entities/game.entity';
import { DartEventEntity } from 'src/darts/darts_event/dart_event.entity';

interface PlayerResultSnapshot {
  userId: number;
  username: string;
  winner: boolean;
  stats: Record<string, any>;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(GameEntity.name) private readonly gameModel: Model<GameEntity>,
    @InjectModel(DartEventEntity.name)
    private readonly dartEventModel: Model<DartEventEntity>,
    private readonly usersService: UsersService,
  ) {}

  async getHistory(userId: number) {
    const games = await this.gameModel
      .find({ status: 'finished', 'result.players.userId': userId })
      .sort({ finishedAt: -1 })
      .limit(100)
      .exec();

    return games.map((game) => this.toHistoryEntry(game, userId));
  }

  async getOverview(userId: number) {
    const games = await this.gameModel
      .find({ status: 'finished', 'result.players.userId': userId })
      .exec();

    const ranked = games
      .map((game) => this.toHistoryEntry(game, userId))
      .filter((entry) => entry.outcome === 'win' || entry.outcome === 'loss');

    const wins = ranked.filter((entry) => entry.outcome === 'win').length;
    const losses = ranked.filter((entry) => entry.outcome === 'loss').length;
    const played = wins + losses;

    const averages = ranked
      .map((entry) => entry.stats?.avg?.value)
      .filter((value): value is number => typeof value === 'number');

    const checkouts = ranked
      .map((entry) => entry.stats?.percentage_checkout?.value)
      .filter((value): value is number => typeof value === 'number');

    const bestCheckouts = ranked
      .map((entry) => entry.stats?.max_checkout?.value)
      .filter((value): value is number => typeof value === 'number');

    const user = await this.usersService.findById(userId);

    return {
      gamesPlayed: played,
      wins,
      losses,
      winRate: played > 0 ? wins / played : 0,
      average: averages.length ? this.mean(averages) : null,
      bestCheckout: bestCheckouts.length ? Math.max(...bestCheckouts) : null,
      checkoutPercentage: checkouts.length ? this.mean(checkouts) : null,
      elo: user?.elo ?? 1000,
    };
  }

  async getAimHeatmap(userId: number) {
    const events = await this.dartEventModel
      .find({ type: 'dart_hit', user: userId })
      .exec();

    return events
      .map((event) => {
        const { x, y } = event.payload?.throw ?? {};
        return { x, y, value: 1 };
      })
      .filter((point) => typeof point.x === 'number' && typeof point.y === 'number');
  }

  private toHistoryEntry(game: GameEntity, userId: number) {
    const players: PlayerResultSnapshot[] = game.result?.players ?? [];
    const own = players.find((p) => p.userId === userId);
    const opponent = players.find((p) => p.userId !== userId);

    let outcome: 'win' | 'loss' | 'practice' = 'practice';
    if (own && opponent && opponent.userId !== userId) {
      outcome = own.winner ? 'win' : 'loss';
    }

    return {
      gameId: game.gameId,
      mode: game.mode,
      finishedAt: game.finishedAt,
      isRanked: String(game.mode ?? '').endsWith('/ranked'),
      outcome,
      opponent: opponent
        ? { userId: opponent.userId, username: opponent.username }
        : null,
      stats: own?.stats ?? {},
    };
  }

  private mean(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
}
