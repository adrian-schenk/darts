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

    await game.set('owner', req.user.id).save();

    if (!(await this.dartsGameService.getGameState(game.gameId))) {
      let gameState: GameState =
        await this.gameStateFactory.createGameStateFromMode(mode, game.gameId);
      gameState.joinable = false;

      let player1Controller = new HumanPlayerController();

      gameState.addPlayer(req.user.id, await this.playerStateFactory.createPlayerState(req.user, game.gameId), player1Controller);

      await this.dartsGameService.setGameState(game.gameId, gameState);
    }
    
    return { gameId: game.gameId };
  }

  @Post('/create-local/')
  @UsePipes(new ZodValidationPipe(createLocalGameSchema))
  async createLocal(@Req() req, @Headers() headers: any, @Body() body: any, mode?: string) {
    
    if (this.connectionsService.getClientById(headers['x-socket-id']) == null || this.connectionsService.getClientById(headers['x-socket-id'])?.data.userId != req.user.id) {
      throw new HttpException('Unauthorized: Socket ID is missing or does not match the authenticated user', HttpStatus.BAD_REQUEST);
    }

    const game: GameEntity = await this.dartsGameService.createDartGame(
      req.user,
      body.mode ?? 'standard',
    );

    await game.set('owner', req.user.id).save();

    if (!(await this.dartsGameService.getGameState(game.gameId))) {
      let gameState: GameState =
        await this.gameStateFactory.createGameStateFromMode(body.mode ?? 'standard', game.gameId);
      gameState.joinable = false;

      let player1Controller = new HumanPlayerController();
      let player2Controller = body.settings.opponent.type === 'bot' ? new BotPlayerController(body.settings.opponent.difficulty ?? BotDifficulty.auto) : new HumanPlayerController();

      let player2User = body.settings.opponent.type === 'bot' ? BotUser : req.user;

      gameState.addPlayer(req.user.id, await this.playerStateFactory.createPlayerStateFromConfig(req.user, game.gameId, body.settings, 0), player1Controller);
      gameState.addPlayer(player2User.id, await this.playerStateFactory.createPlayerStateFromConfig(player2User, game.gameId, body.settings, 1), player2Controller);
      gameState.setRandomTurn();

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

    const { teamPlayers, mode, status, createdAt, updatedAt } = game;
    return { gameId, teamPlayers, mode, status, createdAt, updatedAt };
  }
}
