import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  private readonly users: UserRecord[] = [{
    username: 'test',
    email: 'test',
    id: randomUUID(),
    passwordHash: '229ac95aa0d712b66ba4b3258e91022d:ee03ae538929ae30bb2447041c15a48e2c52f7adeb892d1845da0340ccff0e71d33a4b30cae75ac7458e13dd6c1fd3c77b85d5ae02b0bf5d2b5fc9e463f37621', // 'dummy-password'
  }];

  create(username: string, email: string, passwordHash: string): UserRecord {
    const user: UserRecord = {
      id: randomUUID(),
      username,
      email,
      passwordHash,
    };

    this.users.push(user);
    return user;
  }

  findByUsername(username: string): UserRecord | undefined {
    return this.users.find((user) => user.username === username);
  }

  findByEmail(email: string): UserRecord | undefined {
    const normalizedEmail = email.toLowerCase();
    return this.users.find(
      (user) => user.email.toLowerCase() === normalizedEmail,
    );
  }

  findByIdentifier(identifier: string): UserRecord | undefined {
    return (
      this.findByUsername(identifier) ??
      this.findByEmail(identifier)
    );
  }

  findById(id: string): UserRecord | undefined {
    return this.users.find((user) => user.id === id);
  }
}
