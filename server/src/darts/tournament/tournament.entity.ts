import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type TournamentStatus = 'open' | 'running' | 'finished';
export type TournamentMatchStatus = 'pending' | 'running' | 'finished' | 'bye';

export interface TournamentMatch {
  id: string;
  round: number;
  slot: number;
  playerIds: Array<number | null>;
  gameId: string | null;
  winnerId: number | null;
  status: TournamentMatchStatus;
}

export interface TournamentRound {
  index: number;
  matches: TournamentMatch[];
}

@Schema()
export class TournamentEntity extends Document {
  @Prop({ default: uuidv4, unique: true })
  uuid!: string;

  @Prop({ default: '' })
  name!: string;

  @Prop({ default: true })
  isPrivate!: boolean;

  @Prop({ type: String, default: null })
  ownerId!: string | null;

  @Prop({ default: 8 })
  maxPlayers!: number;

  @Prop({ type: [Number], default: [] })
  playerIds!: number[];

  @Prop({ default: 'standard' })
  mode!: string;

  @Prop({ type: Object, default: {} })
  gameConfig!: Record<string, any>;

  @Prop({ default: 'open' })
  status!: TournamentStatus;

  @Prop({ type: [Object], default: [] })
  rounds!: TournamentRound[];

  @Prop({ type: String, default: null })
  winnerId!: string | null;

  @Prop({ type: Date, default: null })
  scheduledAt!: Date | null;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;
}

export const TournamentEntitySchema = SchemaFactory.createForClass(TournamentEntity);
