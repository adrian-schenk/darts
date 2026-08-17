import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import FriendService from './friend.service';
import { DartGroupService } from './dartgroup.service';
import { UsersService } from '../users/users.service';

@UseGuards(JwtAuthGuard)
@Controller('api/social')
export class SocialController {
  constructor(
    private readonly friendService: FriendService,
    private readonly dartGroupService: DartGroupService,
    private readonly usersService: UsersService,
  ) {}

  // ── Friends ───────────────────────────────────────────────────────────────

  @Get('friends')
  getFriends(@Request() req) {
    return this.friendService.getFriends(req.user);
  }

  @Get('friend-requests/incoming')
  getIncomingRequests(@Request() req) {
    return this.friendService.getPendingIncoming(req.user);
  }

  @Get('friend-requests/sent')
  getSentRequests(@Request() req) {
    return this.friendService.getSentPending(req.user);
  }

  @Post('friend-request')
  async sendFriendRequest(
    @Request() req,
    @Body() body: { username: string },
  ) {
    const target = await this.usersService.findByUsername(body.username);
    if (!target) throw new NotFoundException('User not found');

    await this.assertFriendRequestAllowed(req.user, target);
    await this.friendService.sendFriendRequest(req.user, target);
    return { success: true };
  }

  @Post('friend-request/:id/accept')
  async acceptFriendRequest(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.friendService.acceptFriendRequest(id, req.user);
    return { success: true };
  }

  @Post('friend-request/:id/reject')
  async rejectFriendRequest(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.friendService.rejectFriendRequest(id, req.user);
    return { success: true };
  }

  @Delete('friend/:uuid')
  async removeFriend(@Request() req, @Param('uuid') uuid: string) {
    const target = await this.usersService.findByUuid(uuid);
    if (!target) throw new NotFoundException('User not found');
    await this.friendService.removeFriend(req.user, target);
    return { success: true };
  }

  // ── Groups ────────────────────────────────────────────────────────────────

  @Get('groups')
  getGroups(@Request() req) {
    return this.dartGroupService.getUserGroups(req.user);
  }

  @Post('groups')
  createGroup(
    @Request() req,
    @Body() body: { name: string; description?: string },
  ) {
    return this.dartGroupService.createGroup(req.user, body.name, body.description);
  }

  @Post('groups/:id/members')
  async addMember(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { username: string },
  ) {
    const member = await this.usersService.findByUsername(body.username);
    if (!member) throw new NotFoundException('User not found');

    const policy = member.settings?.privacy?.teamRequests ?? 'everyone';
    if (policy === 'nobody') {
      throw new ForbiddenException('This user is not accepting team invites');
    }
    if (policy === 'friends') {
      const friends = await this.friendService.getFriends(member);
      if (!friends.some((friend) => friend.id === req.user.id)) {
        throw new ForbiddenException('Only friends can add this user to a team');
      }
    }

    return this.dartGroupService.addMember(id, member, req.user);
  }

  @Delete('groups/:id/members/:uuid')
  async removeMember(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('uuid') uuid: string,
  ) {
    const member = await this.usersService.findByUuid(uuid);
    if (!member) throw new NotFoundException('User not found');
    await this.dartGroupService.removeMember(id, member, req.user);
    return { success: true };
  }

  @Post('groups/:id/leave')
  async leaveGroup(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.dartGroupService.leaveGroup(id, req.user);
    return { success: true };
  }

  @Delete('groups/:id')
  async deleteGroup(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.dartGroupService.deleteGroup(id, req.user);
    return { success: true };
  }

  private async assertFriendRequestAllowed(requester, target) {
    const policy = target.settings?.privacy?.friendRequests ?? 'everyone';
    if (policy === 'nobody') {
      throw new ForbiddenException('This user is not accepting friend requests');
    }
    if (policy === 'friends') {
      const friends = await this.friendService.getFriends(target);
      if (!friends.some((friend) => friend.id === requester.id)) {
        throw new ForbiddenException('Only friends can send this user a friend request');
      }
    }
  }
}
