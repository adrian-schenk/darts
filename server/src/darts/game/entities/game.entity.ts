import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema()
export class GameEntity extends Document {
  @Prop({ default: uuidv4, unique: true })
  gameId!: string;

  @Prop({ default: [] })
  playerIds!: string[];

  @Prop({ type: Object, default: {} })
  teamPlayers!: { [team: string]: string[] };

  @Prop({ default: '' })
  mode!: string;

  @Prop({ default: false })
  isPrivate!: boolean;

  @Prop({ default: '' })
  status!: string;

  @Prop({ type: String, default: null })
  tournamentUuid!: string | null;

  @Prop({ default: Date.now })
  createdAt!: Date;

  @Prop({ default: Date.now })
  updatedAt?: Date;

  @Prop({ type: String, default: null })
  owner!: string | null;

  @Prop({ type: String, default: null })
  winnerUserId!: string | null;

  @Prop({ type: Date, default: null })
  finishedAt!: Date | null;

  @Prop({ type: Object, default: null })
  result!: Record<string, any> | null;
}

export const GameEntitySchema = SchemaFactory.createForClass(GameEntity);
