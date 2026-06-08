import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HumanPlayerController } from '../game/controllers/humanPlayer.controller';
import DartsGameService from '../game/game.service';
import { GameEntity } from '../game/entities/game.entity';
import { GameState } from '../game/gameState';
import GameStateFactory from '../game/gameFactory';
import PlayerStateFactory from '../game/stateFactory';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/user.entity';
import {
  TournamentEntity,
  TournamentMatch,
  TournamentRound,
  TournamentStatus,
} from './tournament.entity';
import ConnectionsService from 'src/ws/connections.service';

interface CreateTournamentPayload {
  name?: string;
  maxPlayers: number;
  mode: string;
  settings: Record<string, any>;
  isPrivate: boolean;
  ownerId: number | null;
  scheduledAt?: Date | null;
}

interface TournamentSummary {
  uuid: string;
  name: string;
  isPrivate: boolean;
  status: TournamentStatus;
  maxPlayers: number;
  playerCount: number;
  mode: string;
  scheduledAt: Date | null;
  createdAt: Date;
}

@Injectable()
export default class TournamentService implements OnModuleInit {
  constructor(
    @InjectModel(TournamentEntity.name)
    private readonly tournamentModel: Model<TournamentEntity>,
    @InjectModel(GameEntity.name)
    private readonly gameModel: Model<GameEntity>,
    @Inject(forwardRef(() => DartsGameService))
    private readonly dartsGameService: DartsGameService,
    @Inject(forwardRef(() => GameStateFactory))
    private readonly gameStateFactory: GameStateFactory,
    @Inject(forwardRef(() => ConnectionsService)) private readonly connectionsService: ConnectionsService,
    private readonly playerStateFactory: PlayerStateFactory,
    private readonly usersService: UsersService,
  ) { }

  async onModuleInit() {
    const existingPublic = await this.tournamentModel
      .findOne({ isPrivate: false })
      .exec();

    if (existingPublic) {
      return;
    }

    await this.createTournament({
      name: 'Mock Open Cup',
      isPrivate: false,
      ownerId: null,
      maxPlayers: 2,
      mode: 'standard',
      settings: {
        gameConfig: {
          startingScore: 501,
          checkoutMode: 'double-out',
          legs: 3,
          sets: 2,
        },
      },
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
    });
  }

  async createTournament(payload: CreateTournamentPayload) {
    const sanitizedMaxPlayers = Math.max(2, Number(payload.maxPlayers || 2));

    const tournament = new this.tournamentModel({
      name: payload.name?.trim() || (payload.isPrivate ? 'Private Tournament' : 'Public Tournament'),
      isPrivate: payload.isPrivate,
      ownerId: payload.ownerId,
      maxPlayers: sanitizedMaxPlayers,
      mode: payload.mode || 'standard',
      gameConfig: payload.settings?.gameConfig ?? {},
      status: 'open',
      playerIds: [],
      rounds: [],
      scheduledAt: payload.scheduledAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (payload.ownerId !== null) {
      tournament.playerIds = [payload.ownerId];
    }

    await tournament.save();

    if (tournament.playerIds.length >= tournament.maxPlayers) {
      await this.startTournament(tournament.uuid);
    }

    return tournament;
  }

  async listTournaments(userId: number) {
    const tournaments = await this.tournamentModel
      .find()
      .sort({ createdAt: -1 })
      .exec();

    return tournaments.map((t) => this.toSummary(t));
  }

  async getTournamentByUuid(uuid: string) {
    return this.tournamentModel.findOne({ uuid }).exec();
  }

  async getTournamentOverview(uuid: string, userId: number) {
    const tournament = await this.getTournamentByUuid(uuid);
    if (!tournament) {
      return null;
    }

    const canView = !tournament.isPrivate || tournament.ownerId === userId.toString() || tournament.playerIds.includes(userId);
    if (!canView) {
      return null;
    }

    const userMap = await this.resolveUserMap(tournament.playerIds);

    const rounds = tournament.rounds.map((round) => ({
      index: round.index,
      matches: round.matches.map((match) => ({
        ...match,
        players: match.playerIds.map((pid) => (pid ? (userMap.get(pid) ?? `Player ${pid}`) : null)),
        winnerName: match.winnerId ? (userMap.get(match.winnerId) ?? `Player ${match.winnerId}`) : null,
      })),
    }));

    return {
      uuid: tournament.uuid,
      name: tournament.name,
      isPrivate: tournament.isPrivate,
      status: tournament.status,
      maxPlayers: tournament.maxPlayers,
      playerCount: tournament.playerIds.length,
      players: tournament.playerIds.map((id) => ({ id, name: userMap.get(id) ?? `Player ${id}` })),
      mode: tournament.mode,
      gameConfig: tournament.gameConfig,
      winnerId: tournament.winnerId,
      winnerName: tournament.winnerId ? (userMap.get(Number(tournament.winnerId)) ?? `Player ${tournament.winnerId}`) : null,
      rounds,
      scheduledAt: tournament.scheduledAt,
      createdAt: tournament.createdAt,
    };
  }

  async joinTournament(uuid: string, user: User) {
    const tournament = await this.getTournamentByUuid(uuid);
    if (!tournament) {
      return { ok: false, message: 'Tournament not found' };
    }

    if (tournament.status !== 'open') {
      return { ok: false, message: 'Tournament already started' };
    }

    if (tournament.playerIds.includes(user.id) && user.uuid !== 'bot') {
      return { ok: true, message: 'Already joined', tournament };
    }

    if (tournament.playerIds.length >= tournament.maxPlayers) {
      return { ok: false, message: 'Tournament is full' };
    }

    tournament.playerIds.push(user.id);
    tournament.updatedAt = new Date();
    await tournament.save();

    if (tournament.playerIds.length >= tournament.maxPlayers) {
      await this.startTournament(uuid);
    }

    return { ok: true, message: 'Joined tournament', tournament };
  }

  async startTournament(uuid: string) {
    const tournament = await this.getTournamentByUuid(uuid);
    if (!tournament || tournament.status !== 'open') {
      return;
    }

    const rounds = this.buildInitialRounds(tournament.playerIds);
    tournament.rounds = rounds;
    tournament.status = 'running';
    tournament.updatedAt = new Date();

    await this.fillPlayableMatches(tournament);
    await tournament.save();
  }

  async onTournamentGameFinishedByGameId(
    tournamentUuid: string,
    gameId: string,
    winnerUserId: number | null,
  ) {
    const tournament = await this.getTournamentByUuid(tournamentUuid);
    if (!tournament || tournament.status !== 'running') {
      return;
    }

    let targetRoundIndex = -1;
    let targetMatchIndex = -1;

    for (let r = 0; r < tournament.rounds.length; r += 1) {
      const m = tournament.rounds[r].matches.findIndex(
        (match) => match.gameId === gameId,
      );
      if (m >= 0) {
        targetRoundIndex = r;
        targetMatchIndex = m;
        break;
      }
    }

    if (targetRoundIndex < 0 || targetMatchIndex < 0) {
      return;
    }

    const match = tournament.rounds[targetRoundIndex].matches[targetMatchIndex];
    match.winnerId = winnerUserId;
    match.status = 'finished';

    await this.advanceFromMatch(tournament, targetRoundIndex, targetMatchIndex);

    await this.fillPlayableMatches(tournament);
    tournament.updatedAt = new Date();
    await tournament.save();
  }

  private async fillPlayableMatches(tournament: TournamentEntity) {
    for (let r = 0; r < tournament.rounds.length; r += 1) {
      const round = tournament.rounds[r];

      for (let m = 0; m < round.matches.length; m += 1) {
        const match = round.matches[m];

        if (match.winnerId !== null || match.status === 'running') {
          continue;
        }

        const [leftPlayer, rightPlayer] = match.playerIds;

        if (leftPlayer && rightPlayer) {
          if (!match.gameId) {
            const gameId = await this.createTournamentMatchGame(
              tournament,
              leftPlayer,
              rightPlayer,
            );
            match.gameId = gameId;
          }
          match.status = 'running';
          continue;
        }

        if (leftPlayer || rightPlayer) {
          if (!this.canAutoAdvanceMatch(tournament, r, m)) {
            match.status = 'pending';
            continue;
          }

          const winner = leftPlayer ?? rightPlayer ?? null;
          match.winnerId = winner;
          match.status = 'bye';
          await this.advanceFromMatch(tournament, r, m);
          continue;
        }

        match.status = 'bye';
      }
    }

    const finalRound = tournament.rounds[tournament.rounds.length - 1];
    const finalMatch = finalRound?.matches?.[0];
    if (finalMatch?.winnerId) {
      tournament.status = 'finished';
      tournament.winnerId = finalMatch.winnerId.toString();
    }
  }

  private async advanceFromMatch(tournament: TournamentEntity, roundIndex: number, matchIndex: number) {
    if (roundIndex >= tournament.rounds.length - 1) {
      return;
    }

    const sourceMatch = tournament.rounds[roundIndex].matches[matchIndex];
    const nextRound = tournament.rounds[roundIndex + 1];
    const nextMatchIndex = Math.floor(matchIndex / 2);
    const side = matchIndex % 2;

    const nextMatch = nextRound.matches[nextMatchIndex];
    nextMatch.playerIds[side] = sourceMatch.winnerId;

    if (nextMatch.gameId && nextMatch.winnerId === null) {
      const game = await this.gameModel.findOne({ gameId: nextMatch.gameId }).exec();
      if (game && game.status !== 'finished') {
        return;
      }
    }

    const [leftPlayer, rightPlayer] = nextMatch.playerIds;
    if ((leftPlayer && !rightPlayer) || (!leftPlayer && rightPlayer)) {
      const leftSource = tournament.rounds[roundIndex].matches[nextMatchIndex * 2];
      const rightSource = tournament.rounds[roundIndex].matches[nextMatchIndex * 2 + 1];

      const bothSourcesResolved = ['finished', 'bye'].includes(leftSource.status) && ['finished', 'bye'].includes(rightSource.status);
      if (bothSourcesResolved) {
        nextMatch.winnerId = leftPlayer ?? rightPlayer ?? null;
        nextMatch.status = 'bye';
        await this.advanceFromMatch(tournament, roundIndex + 1, nextMatchIndex);
      }
    }
  }

  private canAutoAdvanceMatch(
    tournament: TournamentEntity,
    roundIndex: number,
    matchIndex: number,
  ) {
    if (roundIndex === 0) {
      return true;
    }

    const previousRound = tournament.rounds[roundIndex - 1];
    const sourceLeft = previousRound.matches[matchIndex * 2];
    const sourceRight = previousRound.matches[matchIndex * 2 + 1];

    if (!sourceLeft || !sourceRight) {
      return false;
    }

    return (
      ['finished', 'bye'].includes(sourceLeft.status) &&
      ['finished', 'bye'].includes(sourceRight.status)
    );
  }

  private buildInitialRounds(playerIds: number[]): TournamentRound[] {
    const bracketSize = this.nextPowerOfTwo(Math.max(2, playerIds.length));
    const totalRounds = Math.log2(bracketSize);

    const seededPlayers: Array<number | null> = [...playerIds];
    while (seededPlayers.length < bracketSize) {
      seededPlayers.push(null);
    }

    const rounds: TournamentRound[] = [];

    const firstRoundMatches: TournamentMatch[] = [];
    for (let i = 0; i < bracketSize; i += 2) {
      firstRoundMatches.push({
        id: `r1-m${i / 2 + 1}`,
        round: 1,
        slot: i / 2,
        playerIds: [seededPlayers[i], seededPlayers[i + 1]],
        gameId: null,
        winnerId: null,
        status: 'pending',
      });
    }
    rounds.push({ index: 1, matches: firstRoundMatches });

    for (let r = 2; r <= totalRounds; r += 1) {
      const matchCount = bracketSize / Math.pow(2, r);
      const matches: TournamentMatch[] = [];
      for (let m = 0; m < matchCount; m += 1) {
        matches.push({
          id: `r${r}-m${m + 1}`,
          round: r,
          slot: m,
          playerIds: [null, null],
          gameId: null,
          winnerId: null,
          status: 'pending',
        });
      }
      rounds.push({ index: r, matches });
    }

    return rounds;
  }

  private async createTournamentMatchGame(
    tournament: TournamentEntity,
    leftPlayerId: number,
    rightPlayerId: number,
  ) {
    const leftPlayer = await this.usersService.findById(leftPlayerId);
    const rightPlayer = await this.usersService.findById(rightPlayerId);

    if (!leftPlayer || !rightPlayer) {
      throw new Error('Unable to create tournament match game due to missing players');
    }

    const createdGame = new this.gameModel({
      playerIds: [leftPlayerId, rightPlayerId],
      mode: tournament.mode,
      status: 'open',
      tournamentUuid: tournament.uuid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const game = await createdGame.save();

    const gameState: GameState = await this.gameStateFactory.createGameStateFromMode(
      tournament.mode,
      game.gameId,
    );

    gameState.isLocal = false;
    gameState.config = {
      ...(gameState.config ?? {}),
      mode: tournament.mode,
      gameConfig: tournament.gameConfig,
      tournamentUuid: tournament.uuid,
      isRanked: false,
    };

    const multiPlayerConfig = {
      gameConfig: {
        players: [
          {
            name: leftPlayer.username,
            startingScore: tournament.gameConfig?.startingScore ?? 501,
            checkoutMode: tournament.gameConfig?.checkoutMode ?? 'double-out',
            startMode: tournament.gameConfig?.startMode ?? 'straight-in',
          },
          {
            name: rightPlayer.username,
            startingScore: tournament.gameConfig?.startingScore ?? 501,
            checkoutMode: tournament.gameConfig?.checkoutMode ?? 'double-out',
            startMode: tournament.gameConfig?.startMode ?? 'straight-in',
          },
        ],
      },
    };

    const p1 = await this.playerStateFactory.createMultiPlayerStateFromConfig(
      leftPlayer,
      game.gameId,
      multiPlayerConfig,
      0,
    );

    const p2 = await this.playerStateFactory.createMultiPlayerStateFromConfig(
      rightPlayer,
      game.gameId,
      multiPlayerConfig,
      1,
    );

    gameState.addPlayer(leftPlayer, p1, new HumanPlayerController());
    gameState.addPlayer(rightPlayer, p2, new HumanPlayerController());

    gameState.providers.gameEndHandler = {
      onGameFinished: async ({ gameState: finishedGameState, winnerPlayerUuid }: { gameState: GameState; winnerPlayerUuid: string }) => {
        const winnerUserId = finishedGameState.playerStates.get(winnerPlayerUuid)?.userId ?? null;
        await this.onTournamentGameFinishedByGameId(
          tournament.uuid,
          game.gameId,
          winnerUserId,
        );
        await this.gameModel.updateOne(
          { gameId: game.gameId },
          { $set: { status: 'finished', updatedAt: new Date() } },
        );
      },
    };

    gameState.setRandomTurn();
    await this.dartsGameService.setGameState(game.gameId, gameState);

    this.connectionsService.broadcastToUsers(
      [leftPlayerId.toString(), rightPlayerId.toString()],
      'tournament_match_found',
      { gameId: game.gameId }
    );

    return game.gameId;
  }

  private nextPowerOfTwo(value: number): number {
    let power = 1;
    while (power < value) {
      power *= 2;
    }
    return power;
  }

  private async resolveUserMap(userIds: number[]) {
    const unique = Array.from(new Set(userIds));
    const users = await Promise.all(unique.map((id) => this.usersService.findById(id)));
    const map = new Map<number, string>();
    for (const user of users) {
      if (user) {
        map.set(user.id, user.username);
      }
    }
    return map;
  }

  private toSummary(tournament: TournamentEntity): TournamentSummary {
    return {
      uuid: tournament.uuid,
      name: tournament.name,
      isPrivate: tournament.isPrivate,
      status: tournament.status,
      maxPlayers: tournament.maxPlayers,
      playerCount: tournament.playerIds.length,
      mode: tournament.mode,
      scheduledAt: tournament.scheduledAt,
      createdAt: tournament.createdAt,
    };
  }
}
