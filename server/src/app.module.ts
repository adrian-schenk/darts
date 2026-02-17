import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DartSocket } from './ws/ws.gateway';
import { UsersModule } from './users/users.module';
import { ApiModule } from './api/api.module';
import DartSocketService from './ws/ws.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    UsersModule,
    ApiModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, DartSocket, DartSocketService],
})
export class AppModule {}
