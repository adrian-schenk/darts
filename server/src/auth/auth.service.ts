import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.type';
import { User, UsersService } from '../users/users.service';
import { Token } from './token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TotpService } from './totp.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly totpService: TotpService,
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
  ) {}

  async register(registerDto: RegisterDto): Promise<boolean> {
    const username = registerDto.username?.trim();
    const email = registerDto.email?.trim().toLowerCase();
    const password = registerDto.password;

    if (!username || !email || !password) {
      throw new BadRequestException(
        'username, email and password are required',
      );
    }

    if (await this.usersService.findByUsername(username)) {
      throw new BadRequestException('username already exists');
    }
    if (await this.usersService.findByEmail(email)) {
      throw new BadRequestException('email already exists');
    }
    const passwordHash = AuthService.hashPassword(password);
    const createdUser = await this.usersService.create(
      username,
      email,
      passwordHash,
    );
    return createdUser ? true : false;
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string }> {
    const username = loginDto.username?.trim();
    const password = loginDto.password;

    if (!username || !password) {
      throw new BadRequestException('username and password are required');
    }

    const user = await this.usersService.findByUsername(username);
    if (!user || !this.verifyPassword(password, user.password)) {
      throw new UnauthorizedException('invalid credentials');
    }

    if (user.twoFactorEnabled) {
      if (!loginDto.twoFactorCode) {
        throw new UnauthorizedException({
          message: 'two-factor code required',
          twoFactorRequired: true,
        });
      }
      if (!user.twoFactorSecret || !this.totpService.verify(user.twoFactorSecret, loginDto.twoFactorCode)) {
        throw new UnauthorizedException('invalid two-factor code');
      }
    }

    const tokenString = randomBytes(32).toString('hex');
    const token = this.tokenRepository.create({
      userId: user.id,
      token: tokenString,
    });
    const savedToken = await this.tokenRepository.save(token);
    return this.issueToken(user, savedToken.id);
  }

  async getProfile(
    userId: string,
  ): Promise<{
    id: string;
    username: string;
    email: string;
    elo: number;
    profilePicture: string | null;
    twoFactorEnabled: boolean;
  }> {
    const user = await this.usersService.findById(Number(userId));
    if (!user) {
      throw new UnauthorizedException('user not found');
    }
    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      elo: user.elo,
      profilePicture: user.profilePicture,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }

  private issueToken(user: User, tokenId: number): { access_token: string } {
    const payload: JwtPayload = {
      tokenId: tokenId,
      uid: user.id.toString(),
      uuid: user.uuid,
      username: user.username,
      email: user.email,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  public static hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, savedHash: string): boolean {
    const [salt, hash] = savedHash.split(':');

    if (!salt || !hash) {
      return false;
    }

    const hashedBuffer = scryptSync(password, salt, 64);
    const hashBuffer = Buffer.from(hash, 'hex');

    if (hashedBuffer.length !== hashBuffer.length) {
      return false;
    }

    return timingSafeEqual(hashedBuffer, hashBuffer);
  }
}
