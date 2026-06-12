import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { Token } from './token.entity';
import { User, UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    findByUsername: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;

  const jwtService = {
    sign: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  const tokenRepository = {
    create: jest.fn(),
    save: jest.fn(),
  } as any;

  const baseUser = {
    id: 42,
    uuid: 'user-uuid',
    username: 'alice',
    email: 'alice@example.com',
    password: AuthService.hashPassword('secret'),
  } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(usersService, jwtService, tokenRepository);
  });

  describe('register', () => {
    it('throws when required fields are missing', async () => {
      await expect(
        service.register({ username: ' ', email: ' ', password: '' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when username already exists', async () => {
      usersService.findByUsername = jest.fn().mockResolvedValue(baseUser as never);

      await expect(
        service.register({
          username: 'alice',
          email: 'new@example.com',
          password: 'pw',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('normalizes input and creates a new user', async () => {
      usersService.findByUsername = jest.fn().mockResolvedValue(null as never);
      usersService.findByEmail = jest.fn().mockResolvedValue(null as never);
      usersService.create = jest.fn().mockResolvedValue(baseUser as never);

      await expect(
        service.register({
          username: '  alice  ',
          email: ' ALICE@EXAMPLE.COM ',
          password: 'secret',
        }),
      ).resolves.toBe(true);

      expect(usersService.create).toHaveBeenCalledTimes(1);
      const [username, email, hash] = (usersService.create as jest.Mock).mock.calls[0];
      expect(username).toBe('alice');
      expect(email).toBe('alice@example.com');
      expect(hash).toContain(':');
      expect(hash).not.toBe('secret');
    });
  });

  describe('login', () => {
    it('throws when credentials are missing', async () => {
      await expect(
        service.login({ username: '', password: '' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when user cannot be found', async () => {
      usersService.findByUsername = jest.fn().mockResolvedValue(null as never);

      await expect(
        service.login({ username: 'alice', password: 'secret' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when password is invalid', async () => {
      usersService.findByUsername = jest.fn().mockResolvedValue({
        ...baseUser,
        password: AuthService.hashPassword('different-password'),
      } as never);

      await expect(
        service.login({ username: 'alice', password: 'secret' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('issues jwt token after successful login', async () => {
      usersService.findByUsername = jest.fn().mockResolvedValue(baseUser as never);
      tokenRepository.create = jest.fn().mockReturnValue({
        userId: baseUser.id,
        token: 'opaque-token',
      } as Token);
      tokenRepository.save = jest.fn().mockResolvedValue({ id: 9 } as Token);
      jwtService.sign = jest.fn().mockReturnValue('signed-jwt');

      await expect(
        service.login({ username: 'alice', password: 'secret' }),
      ).resolves.toEqual({ access_token: 'signed-jwt' });

      expect(tokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: baseUser.id, token: expect.any(String) }),
      );
      expect(tokenRepository.save).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenId: 9,
          uid: baseUser.id.toString(),
          username: baseUser.username,
          email: baseUser.email,
        }),
      );
    });
  });

  describe('getProfile', () => {
    it('returns a public profile shape', async () => {
      usersService.findById = jest.fn().mockResolvedValue(baseUser as never);

      await expect(service.getProfile('42')).resolves.toEqual({
        id: '42',
        username: 'alice',
        email: 'alice@example.com',
      });
    });

    it('throws when user is not found', async () => {
      usersService.findById = jest.fn().mockResolvedValue(null as never);

      await expect(service.getProfile('42')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
