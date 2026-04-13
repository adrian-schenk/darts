import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

export let BotUser: User;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    this.userRepository.findOneBy({ uuid: 'bot' }).then((bot) => {
      if (!bot) {
        bot = this.userRepository.create({
          username: 'Bot',
          email: '',
          password: '',
          uuid: 'bot',
        });
        this.userRepository.save(bot);
      }

      BotUser = bot;
    });
  }

  async create(
    username: string,
    email: string,
    passwordHash: string,
  ): Promise<User> {
    const user = this.userRepository.create({
      username,
      email,
      password: passwordHash,
      uuid: this.generateUuid(),
    });
    return this.userRepository.save(user);
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    let user = await this.findByUsername(identifier);
    if (!user) {
      user = await this.findByEmail(identifier);
    }
    return user;
  }

  async findByUuid(uuid: string): Promise<User | null> {
    return this.userRepository.findOneBy({ uuid });
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOneBy({ username });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  private generateUuid(): string {
    return require('uuid').v4();
  }
}

export type { User };
