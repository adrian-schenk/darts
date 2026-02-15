import { Controller, Get, Param, Query, ParseIntPipe, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiService, Checkout } from './api.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Public } from 'src/auth/public.decorator';

@UseGuards(JwtAuthGuard)
@Controller('api')
export class ApiController {
  constructor(private readonly apiService: ApiService) {}

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
  ): { score: number; throwsLeft: number; doubleOut: boolean; checkouts: Checkout[] } {
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
}
