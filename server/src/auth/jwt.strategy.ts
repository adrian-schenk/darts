import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './types/jwt-payload.type';
import { User } from '../users/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private secret: string;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {
    const secret = process.env.JWT_SECRET ?? 'dev-only-secret-change-me';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    this.secret = secret;
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

  async validateToken(token: string): Promise<User> {
    try {
      const payload = (await this.jwtService.verifyAsync(token, {
        secret: this.secret,
      })) as JwtPayload;
      return await this.validate(payload);
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
