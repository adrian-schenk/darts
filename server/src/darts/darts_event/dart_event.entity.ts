import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema()
export class DartEventEntity extends Document {
  @Prop({ type: String, required: true })
  gameId: string;

  @Prop({ required: true, type: String })
  playerUuid: string;

  @Prop({ required: true })
  user: number;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true, type: Object })
  payload: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  updatedAt?: Date;
}

export const DartEventEntitySchema =
  SchemaFactory.createForClass(DartEventEntity);
