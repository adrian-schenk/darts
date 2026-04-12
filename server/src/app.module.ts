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
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import * as dotenv from 'dotenv';
import { WsModule } from './ws/ws.module';
import { RedisModule } from '@nestjs-modules/ioredis';
dotenv.config({ path: join(__dirname, '..', '.env') });

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'darts',
      password: process.env.POSTGRES_PASSWORD || 'darts',
      database: process.env.POSTGRES_DB || 'darts',
      autoLoadEntities: true,
      synchronize: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGO_URI ||
        `mongodb://${process.env.MONGO_USERNAME ?? 'darts'}:${process.env.MONGO_PASSWORD ?? 'darts'}@localhost:${process.env.MONGO_PORT ?? '27017'}/${process.env.MONGO_DATABASE ?? 'darts'}?authSource=admin`,
    ),
    RedisModule.forRoot({
      type: 'single',
      url: 'redis://localhost:6379',
    }),
    UsersModule,
    ApiModule,
    AuthModule,
    WsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
