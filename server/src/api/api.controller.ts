import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  UseGuards,
  Post,
  Req,
  Body,
  UsePipes,
  Inject,
  Headers
} from '@nestjs/common';
import { ApiService, Checkout } from './api.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Public } from 'src/auth/public.decorator';
import DartsGameService from 'src/darts/game/game.service';
import { GameEntity } from 'src/darts/game/entities/game.entity';
import MatchmakingService from 'src/darts/matchmaking/mm.service';
import { type CreateLocalGameDTO, createLocalGameSchema } from 'src/darts/game/dto/createLocalGameDTO';
import { ZodValidationPipe } from 'src/pipes/ZodValidationPipe';
import DartSocketService from 'src/ws/ws.service';
import ConnectionsService from 'src/ws/connections.service';
import { GameState } from 'src/darts/game/gameState';
import GameStateFactory from 'src/darts/game/gameFactory';
import PlayerStateFactory from 'src/darts/game/stateFactory';
import { HumanPlayerController } from 'src/darts/game/controllers/humanPlayer.controller';
import { BotDifficulty, BotPlayerController } from 'src/darts/game/controllers/botPlayer.controller';
import { BotUser } from 'src/users/users.service';
import TournamentService from 'src/darts/tournament/tournament.service';


@UseGuards(JwtAuthGuard)
@Controller('api')
export class ApiController {
  constructor(
    private readonly apiService: ApiService,
    private readonly dartsGameService: DartsGameService,
    private readonly matchmakingService: MatchmakingService,
    private readonly dartSocketService: DartSocketService,
    private readonly connectionsService: ConnectionsService,
    private readonly gameStateFactory: GameStateFactory,
    private readonly playerStateFactory: PlayerStateFactory,
    private readonly tournamentService: TournamentService,
  ) {}

  @Get('/checkouts/:score')
  getCheckouts(
    @Param('score', ParseIntPipe) score: number,
    @Query('throwsLeft') throwsLeft?: string,
    @Query('doubleOut') doubleOut?: string,
  ): {
    score: number;
    throwsLeft: number;
    doubleOut: boolean;
    checkouts: Checkout[];
  } {
    // Parse query parameters with defaults
    const parsedThrowsLeft = throwsLeft ? parseInt(throwsLeft, 10) : 3;
    const parsedDoubleOut = doubleOut === 'false' ? false : true; // Default to true

    // Validate parameters
    if (score <= 0 || score > 180) {
      throw new HttpException(
        'Score must be between 1 and 180',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (parsedThrowsLeft < 1 || parsedThrowsLeft > 3) {
      throw new HttpException(
        'throwsLeft must be between 1 and 3',
        HttpStatus.BAD_REQUEST,
      );
    }

    const checkouts = this.apiService.findCheckouts(
      score,
      parsedThrowsLeft,
      parsedDoubleOut,
    );

    return {
      score,
      throwsLeft: parsedThrowsLeft,
      doubleOut: parsedDoubleOut,
      checkouts,
    };
  }

  @Post('/create-training/:mode')
  async createTraining(@Param('mode') mode: string, @Req() req, @Body() body: any, @Headers() headers: any) {
    const validModes = ['target', 'around', 'checkouts', 'max'];
    if (!validModes.includes(mode)) {
      throw new HttpException(
        `Invalid game mode. Valid modes are: ${validModes.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (this.connectionsService.getClientById(headers['x-socket-id']) == null || this.connectionsService.getClientById(headers['x-socket-id'])?.data.userId != req.user.id) {
      throw new HttpException('Unauthorized: Socket ID is missing or does not match the authenticated user', HttpStatus.BAD_REQUEST);
    }

    const game: GameEntity = await this.dartsGameService.createTraining(
      req.user,
      mode,
    );

    game.set('isPrivate', true);

    await game.set('owner', req.user.id).save();

    if (!(await this.dartsGameService.getGameState(game.gameId))) {
      let gameState: GameState =
        await this.gameStateFactory.createGameStateFromMode(mode, game.gameId);
      gameState.joinable = false;

      let player1Controller = new HumanPlayerController();

      gameState.addPlayer(req.user, await this.playerStateFactory.createPlayerState(req.user, game.gameId), player1Controller);
      gameState.startBullingOff();

      await this.dartsGameService.setGameState(game.gameId, gameState);
    }
    
    return { gameId: game.gameId };
  }

  @Post('/create-local/')
  @UsePipes(new ZodValidationPipe(createLocalGameSchema))
  async createLocal(@Req() req, @Headers() headers: any, @Body() body: any) {
    
    if (this.connectionsService.getClientById(headers['x-socket-id']) == null || this.connectionsService.getClientById(headers['x-socket-id'])?.data.userId != req.user.id) {
      throw new HttpException('Unauthorized: Socket ID is missing or does not match the authenticated user', HttpStatus.BAD_REQUEST);
    }

    const player2User = body.settings.opponent.type === 'bot' ? BotUser : req.user;

    const game: GameEntity = await this.dartsGameService.createDartGame(
      [req.user.id, player2User.id],
      body.mode ?? 'standard',
    );
    
    await game.set('owner', req.user.id).save();

    if (!(await this.dartsGameService.getGameState(game.gameId))) {
      let gameState: GameState =
        await this.gameStateFactory.createGameStateFromMode(body.mode ?? 'standard', game.gameId);
      gameState.joinable = false;

      let player1Controller = new HumanPlayerController();
      let player2Controller = body.settings.opponent.type === 'bot' ? new BotPlayerController(body.settings.opponent.difficulty ?? BotDifficulty.auto) : new HumanPlayerController();

      gameState.addPlayer(req.user, await this.playerStateFactory.createMultiPlayerStateFromConfig(req.user, game.gameId, body.settings, 0), player1Controller);
      gameState.addPlayer(player2User, await this.playerStateFactory.createMultiPlayerStateFromConfig(player2User, game.gameId, body.settings, 1), player2Controller);
      gameState.startBullingOff();
      
      await this.dartsGameService.setGameState(game.gameId, gameState);
    }

    return { gameId: game.gameId };
  }

  @Get('/game/:gameId')
  async getGame(@Param('gameId') gameId: string) {
    const game: GameEntity | null =
      await this.dartsGameService.getDartGame(gameId);
    if (!game) {
      throw new HttpException('Game not found', HttpStatus.NOT_FOUND);
    }

    const { teamPlayers, mode, status, createdAt, updatedAt, tournamentUuid } = game;
    return { gameId, teamPlayers, mode, status, createdAt, updatedAt, tournamentUuid };
  }

  @Get('/tournaments')
  async listTournaments(@Req() req): Promise<any> {
    const tournaments = await this.tournamentService.listTournaments(req.user.id);
    return { success: true, tournaments };
  }

  @Get('/tournaments/:uuid')
  async getTournament(@Param('uuid') uuid: string, @Req() req) {
    const tournament = await this.tournamentService.getTournamentOverview(
      uuid,
      req.user.id,
    );
    if (!tournament) {
      throw new HttpException('Tournament not found', HttpStatus.NOT_FOUND);
    }
    return { success: true, tournament };
  }

  @Post('/tournaments/private')
  async createPrivateTournament(@Req() req, @Body() body: any) {
    const maxPlayers = Number(body?.maxPlayers ?? 8);
    if (maxPlayers < 2) {
      throw new HttpException('maxPlayers must be at least 2', HttpStatus.BAD_REQUEST);
    }

    const tournament = await this.tournamentService.createTournament({
      name: body?.name,
      isPrivate: true,
      ownerId: req.user.id,
      maxPlayers,
      mode: body?.mode ?? 'standard',
      settings: body?.settings ?? { gameConfig: {} },
    });

    return { success: true, uuid: tournament.uuid };
  }

  @Post('/tournaments/:uuid/join')
  async joinTournament(@Param('uuid') uuid: string, @Req() req) {
    const res = await this.tournamentService.joinTournament(uuid, req.user);
    if (!res.ok) {
      throw new HttpException(res.message, HttpStatus.BAD_REQUEST);
    }

    return {
      success: true,
      message: res.message,
      tournament: {
        uuid: res.tournament?.uuid,
        status: res.tournament?.status,
        maxPlayers: res.tournament?.maxPlayers,
        playerCount: res.tournament?.playerIds?.length,
      },
    };
  }

  @Post('/tournaments/:uuid/leave')
  async leaveTournament(@Param('uuid') uuid: string, @Req() req) {
    const res = await this.tournamentService.leaveTournament(uuid, req.user);
    if (!res.ok) {
      throw new HttpException(res.message, HttpStatus.BAD_REQUEST);
    }

    return { success: true, message: res.message };
  }
}
