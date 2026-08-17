import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { User, UserBoard, UserSettings } from 'src/users/user.entity';
import type {
  FriendRequestPolicy,
  TeamRequestPolicy,
} from 'src/users/user.entity';
import { TotpService } from 'src/auth/totp.service';

interface PrivacySettings {
  friendRequests: FriendRequestPolicy;
  teamRequests: TeamRequestPolicy;
}

interface ResolvedSettings {
  privacy: PrivacySettings;
  boards: UserBoard[];
}

export type { PrivacySettings, ResolvedSettings };

const DEFAULT_BOARDS: UserBoard[] = [
  { id: 'classic', name: 'Classic', color: '#1a1a1a' },
  { id: 'carbon', name: 'Carbon', color: '#0b0f19' },
  { id: 'oak', name: 'Oak', color: '#3b2f2f' },
];

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly totpService: TotpService,
  ) {}

  async getSettings(user: User) {
    const stored = await this.findById(user.id);
    const settings = this.withDefaults(stored.settings);

    return {
      profile: {
        id: stored.id,
        uuid: stored.uuid,
        username: stored.username,
        email: stored.email,
        profilePicture: stored.profilePicture,
        elo: stored.elo,
        twoFactorEnabled: stored.twoFactorEnabled,
      },
      privacy: settings.privacy,
      boards: settings.boards,
    };
  }

  async updatePrivacy(
    user: User,
    payload: Partial<PrivacySettings>,
  ) {
    const stored = await this.findById(user.id);
    const settings = this.withDefaults(stored.settings);

    if (payload.friendRequests !== undefined) {
      settings.privacy.friendRequests = payload.friendRequests;
    }
    if (payload.teamRequests !== undefined) {
      settings.privacy.teamRequests = payload.teamRequests;
    }

    stored.settings = settings;
    await this.userRepository.save(stored);
    return this.getSettings(stored);
  }

  async updateUserData(
    user: User,
    payload: { username?: string; email?: string },
  ) {
    const stored = await this.findById(user.id);
    const username = payload.username?.trim();
    const email = payload.email?.trim().toLowerCase();

    if (username && username !== stored.username) {
      const existing = await this.userRepository.findOneBy({ username });
      if (existing && existing.id !== stored.id) {
        throw new BadRequestException('username already exists');
      }
      stored.username = username;
    }

    if (email && email !== stored.email) {
      const existing = await this.userRepository.findOneBy({ email });
      if (existing && existing.id !== stored.id) {
        throw new BadRequestException('email already exists');
      }
      stored.email = email;
    }

    await this.userRepository.save(stored);
    return this.getSettings(stored);
  }

  async setProfilePicture(user: User, profilePicture: string | null) {
    const stored = await this.findById(user.id);

    if (profilePicture && !profilePicture.startsWith('data:image/')) {
      throw new BadRequestException('profile picture must be a data URL');
    }

    stored.profilePicture = profilePicture;
    await this.userRepository.save(stored);
    return this.getSettings(stored);
  }

  async changePassword(
    user: User,
    payload: { currentPassword: string; newPassword: string },
  ) {
    const stored = await this.findById(user.id);

    if (!this.verifyPassword(payload.currentPassword, stored.password)) {
      throw new UnauthorizedException('current password is incorrect');
    }

    if (payload.newPassword.length < 8) {
      throw new BadRequestException(
        'new password must be at least 8 characters',
      );
    }

    stored.password = this.hashPassword(payload.newPassword);
    await this.userRepository.save(stored);
    return { success: true };
  }

  async generateTwoFactor(user: User) {
    const stored = await this.findById(user.id);
    if (stored.twoFactorEnabled) {
      throw new BadRequestException('two-factor authentication is already enabled');
    }

    const secret = this.totpService.generateSecret();
    stored.twoFactorSecret = secret;
    await this.userRepository.save(stored);

    return {
      secret,
      otpauthUrl: this.totpService.generateOtpAuthUrl(secret, stored.username),
    };
  }

  async enableTwoFactor(user: User, token: string) {
    const stored = await this.findById(user.id);
    if (!stored.twoFactorSecret) {
      throw new BadRequestException('generate a two-factor secret first');
    }
    if (!this.totpService.verify(stored.twoFactorSecret, token)) {
      throw new BadRequestException('invalid two-factor code');
    }

    stored.twoFactorEnabled = true;
    await this.userRepository.save(stored);
    return { success: true };
  }

  async disableTwoFactor(
    user: User,
    payload: { password: string; token: string },
  ) {
    const stored = await this.findById(user.id);
    if (!stored.twoFactorEnabled) {
      throw new BadRequestException('two-factor authentication is not enabled');
    }
    if (!this.verifyPassword(payload.password, stored.password)) {
      throw new UnauthorizedException('password is incorrect');
    }
    if (!stored.twoFactorSecret || !this.totpService.verify(stored.twoFactorSecret, payload.token)) {
      throw new BadRequestException('invalid two-factor code');
    }

    stored.twoFactorEnabled = false;
    stored.twoFactorSecret = null;
    await this.userRepository.save(stored);
    return { success: true };
  }

  async addBoard(user: User, payload: { name: string; imageUrl?: string; color?: string }) {
    const stored = await this.findById(user.id);
    const settings = this.withDefaults(stored.settings);

    const name = payload.name?.trim();
    if (!name) throw new BadRequestException('board name is required');

    const board: UserBoard = {
      id: uuidv4(),
      name,
      imageUrl: payload.imageUrl ?? null,
      color: payload.color ?? null,
    };

    settings.boards.push(board);
    stored.settings = settings;
    await this.userRepository.save(stored);
    return board;
  }

  async updateBoard(
    user: User,
    boardId: string,
    payload: { name?: string; imageUrl?: string | null; color?: string | null },
  ) {
    const stored = await this.findById(user.id);
    const settings = this.withDefaults(stored.settings);

    const board = settings.boards.find((b) => b.id === boardId);
    if (!board) throw new NotFoundException('board not found');

    if (payload.name !== undefined) {
      const name = payload.name.trim();
      if (!name) throw new BadRequestException('board name is required');
      board.name = name;
    }
    if (payload.imageUrl !== undefined) board.imageUrl = payload.imageUrl;
    if (payload.color !== undefined) board.color = payload.color;

    stored.settings = settings;
    await this.userRepository.save(stored);
    return board;
  }

  async deleteBoard(user: User, boardId: string) {
    const stored = await this.findById(user.id);
    const settings = this.withDefaults(stored.settings);

    settings.boards = settings.boards.filter((b) => b.id !== boardId);
    stored.settings = settings;
    await this.userRepository.save(stored);
    return { success: true };
  }

  private withDefaults(settings: UserSettings | null): ResolvedSettings {
    return {
      privacy: {
        friendRequests: settings?.privacy?.friendRequests ?? 'everyone',
        teamRequests: settings?.privacy?.teamRequests ?? 'everyone',
      },
      boards: settings?.boards?.length ? settings.boards : [...DEFAULT_BOARDS],
    };
  }

  private async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('user not found');
    return user;
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, savedHash: string): boolean {
    const [salt, hash] = savedHash.split(':');
    if (!salt || !hash) return false;

    const hashedBuffer = scryptSync(password, salt, 64);
    const hashBuffer = Buffer.from(hash, 'hex');
    if (hashedBuffer.length !== hashBuffer.length) return false;
    return timingSafeEqual(hashedBuffer, hashBuffer);
  }
}
