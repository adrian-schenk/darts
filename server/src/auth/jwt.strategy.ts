import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './types/jwt-payload.type';
import { User } from '../users/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    if (!payload || !payload.uuid) {
      throw new UnauthorizedException('Invalid token payload');
    }
    const user = await this.usersService.findByUuid(payload.uuid);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}