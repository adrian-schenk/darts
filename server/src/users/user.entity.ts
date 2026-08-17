import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';

export type FriendRequestPolicy = 'everyone' | 'friends' | 'nobody';
export type TeamRequestPolicy = 'everyone' | 'friends' | 'nobody';

export interface UserBoard {
  id: string;
  name: string;
  imageUrl?: string | null;
  color?: string | null;
}

export interface UserSettings {
  privacy?: {
    friendRequests?: FriendRequestPolicy;
    teamRequests?: TeamRequestPolicy;
  };
  boards?: UserBoard[];
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  uuid: string;

  @Column({ unique: true })
  username: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ type: 'text', nullable: true, default: null })
  profilePicture: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  twoFactorSecret: string | null;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'int', default: 1000 })
  elo: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  settings: UserSettings;

  @ManyToMany(() => User, (user) => user.friends)
  @JoinTable()
  friends: User[];
}
