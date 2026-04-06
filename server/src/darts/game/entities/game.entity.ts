import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema()
export class GameEntity extends Document {
  @Prop({ default: uuidv4, unique: true })
  gameId: string;

  @Prop({ default: [] })
  playerIds: string[];

  @Prop({ type: Object, default: {} })
  teamPlayers: { [team: string]: string[] };

  @Prop({ default: '' })
  mode: string;

  @Prop({ default: '' })
  status: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt?: Date;

  @Prop({ default: null })
  owner: number;
}

export const GameEntitySchema = SchemaFactory.createForClass(GameEntity);
