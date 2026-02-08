import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DartSocket } from './chat/chat.gateway';
import { UsersModule } from './users/users.module';
import { ApiModule } from './api/api.module';
import ChatService from './chat/chat.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    UsersModule,
    ApiModule
  ],
  controllers: [AppController],
  providers: [AppService, DartSocket, ChatService],
})
export class AppModule {}
