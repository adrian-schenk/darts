import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema()
export class GameEntity extends Document {

  @Prop({ default: uuidv4, unique: true })
  gameId: string;

  @Prop({ required: true })
  playerIds: string[];

  @Prop({ required: false, type: Object})
  teamPlayers: { [team: string]: string[] };

  @Prop({ required: true })
  mode: string;

  @Prop({ required: true })
  status: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  updatedAt?: Date;

  @Prop()
  owner: string;
}

export const GameEntitySchema = SchemaFactory.createForClass(GameEntity);
