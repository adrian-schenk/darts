import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ApiModule } from './api/api.module';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { WsModule } from './ws/ws.module';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? join(__dirname, '../..', '.env') : join(__dirname, '../..', '.env.development'),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('POSTGRES_HOST'),
        port: Number(config.get<string>('POSTGRES_PORT')),
        username: config.get<string>('POSTGRES_USER'),
        password: String(config.get<string>('POSTGRES_PASSWORD')),
        database: config.get<string>('POSTGRES_DB'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const mongoUri = config.get<string>('MONGO_URI');
        if (mongoUri) {
          return { uri: mongoUri };
        }

        const username = config.get<string>('MONGO_INITDB_ROOT_USERNAME');
        const password = config.get<string>('MONGO_INITDB_ROOT_PASSWORD');
        const port = config.get<string>('MONGO_PORT');
        const database = config.get<string>('MONGO_INITDB_DATABASE');

        return {
          uri: `mongodb://${username}:${password}@localhost:${port}/${database}?authSource=admin`,
        };
      },
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
      }),
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
