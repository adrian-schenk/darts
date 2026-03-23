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
} from '@nestjs/common';
import { ApiService, Checkout } from './api.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Public } from 'src/auth/public.decorator';
import DartsGameService from 'src/darts/game/game.service';
import { GameEntity } from 'src/darts/game/entities/game.entity';
import MatchmakingService from 'src/darts/matchmaking/mm.service';

@UseGuards(JwtAuthGuard)
@Controller('api')
export class ApiController {
  constructor(
    private readonly apiService: ApiService,
    private readonly dartsGameService: DartsGameService,
    private readonly matchmakingService: MatchmakingService,
  ) {}

  @Public()
  @Get('/test')
  findAll(): string {
    return 'This action returns all cats';
  }

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
  async createTraining(@Param('mode') mode: string, @Req() req) {
    const validModes = ['target', 'around', 'checkouts', 'max'];
    if (!validModes.includes(mode)) {
      throw new HttpException(
        `Invalid game mode. Valid modes are: ${validModes.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const game: GameEntity = await this.dartsGameService.createTraining(
      req.user,
      mode,
    );

    return { gameId: game.gameId, mode };
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

  @Post('/join-queue/:mode')
  async joinQueue(@Param('mode') mode: string, @Req() req) {
    const user = req.user;
    this.matchmakingService.joinQueue(mode, req.user);
    return { message: `User ${user.username} joined ${mode} queue` };
  }

  @Public()
  @Get('/queue/:mode')
  async getQueue(@Param('mode') mode: string) {
    const queue = await this.matchmakingService.getQueue(mode);
    return { mode, queue };
  }
}
