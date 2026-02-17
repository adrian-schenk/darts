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
import { UserRecord, UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ access_token: string }> {
    const username = registerDto.username?.trim();
    const email = registerDto.email?.trim().toLowerCase();
    const password = registerDto.password;

    if (!username || !email || !password) {
      throw new BadRequestException('username, email and password are required');
    }

    if (this.usersService.findByUsername(username)) {
      throw new BadRequestException('username already exists');
    }

    if (this.usersService.findByEmail(email)) {
      throw new BadRequestException('email already exists');
    }

    const passwordHash = this.hashPassword(password);
    const createdUser = this.usersService.create(username, email, passwordHash);

    return this.issueToken(createdUser);
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string }> {
    const identifier = loginDto.identifier?.trim();
    const password = loginDto.password;

    if (!identifier || !password) {
      throw new BadRequestException('identifier and password are required');
    }

    const user = this.usersService.findByIdentifier(identifier);

    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('invalid credentials');
    }

    return this.issueToken(user);
  }

  getProfile(userId: string): { id: string; username: string; email: string } {
    const user = this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('user not found');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  }

  private issueToken(user: UserRecord): { access_token: string } {
    const payload: JwtPayload = {
      uid: user.id,
      username: user.username,
      email: user.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  public hashPassword(password: string): string {
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
