import { Module } from '@nestjs/common';
import FriendService from './friend.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendRequest } from './friendrequest.entity';
import { DartGroup } from './dartgroup.entity';
import { DartGroupService } from './dartgroup.service';
import { SocialController } from './social.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FriendRequest, DartGroup]),
    UsersModule,
  ],
  controllers: [SocialController],
  exports: [FriendService, DartGroupService],
  providers: [FriendService, DartGroupService],
})
export class SocialModule {}
