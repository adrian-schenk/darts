import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TotpService } from './totp.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from './token.entity';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
      signOptions: { expiresIn: '24h' },
    }),
    TypeOrmModule.forFeature([Token]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, TotpService],
  exports: [AuthService, JwtStrategy, JwtAuthGuard, TotpService],
})
export class AuthModule {}
