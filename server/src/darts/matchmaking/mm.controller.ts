import { Body, Controller, Get, Headers, HttpException, HttpStatus, Post, Query, Req, UseGuards, UsePipes } from "@nestjs/common"
import MatchmakingService from "./mm.service"
import { Public } from "src/auth/public.decorator"
import { JwtAuthGuard } from "src/auth/jwt-auth.guard"
import ConnectionsService from "src/ws/connections.service";
import { joinQueueSchema, type JoinQueueDTO } from "./joinQueueDTO";
import { ZodValidationPipe } from "src/pipes/ZodValidationPipe";

@UseGuards(JwtAuthGuard)
@Controller('api')
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService, private readonly connectionsService: ConnectionsService) {}

  @Get('queued')
  isQueued(@Req() req) {
    const user = req.user
    return { success: true, queued: this.matchmakingService.isUserInQueue(user) };
  }

  @Post('join-queue')
  @UsePipes(new ZodValidationPipe(joinQueueSchema))
  joinQueue(@Body() body: JoinQueueDTO, @Req() req, @Headers() headers) {

    if (this.connectionsService.getClientById(headers['x-socket-id']) == null || this.connectionsService.getClientById(headers['x-socket-id'])?.data.userId != req.user.id) {
      throw new HttpException('Unauthorized: Socket ID is missing or does not match the authenticated user', HttpStatus.BAD_REQUEST);
    }

    const user = req.user
    
    let { res, msg } = this.matchmakingService.joinQueue(this.matchmakingService.getQueueNameFromConfig(body), user, headers['x-socket-id'])
    return { success: res, message: msg }
  }

  @Post('leave-queue')
  leaveQueue(@Req() req) {
    const user = req.user
    this.matchmakingService.leaveQueue(user)
    return { success: true, message: 'Left queue' }
  }

  @Get('queue')
  getQueue(@Query('mode') mode: string) {
    return this.matchmakingService.getQueue(mode)
  }
}