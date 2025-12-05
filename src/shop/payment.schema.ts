import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../user/schemas/user.schema';

@Schema({ timestamps: true })
export class Payment extends Document {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  packId: string;

  @Prop({ required: true })
  amount: number; // paise me

  @Prop({ default: 'INR' })
  currency: string;

  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  paymentId: string;

  @Prop({ required: true })
  signature: string;

  @Prop({ type: Object })
  paymentResponse: any; // complete body dump

  @Prop({ default: 'success' })
  status: string;

  @Prop()
  email: string;

  @Prop()
  phone: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
