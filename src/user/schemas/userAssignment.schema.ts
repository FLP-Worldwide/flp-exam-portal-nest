import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type UserAssignmentDocument = HydratedDocument<UserAssignment>;

@Schema({ timestamps: true })
export class UserAssignment {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CourseTest', required: true })
  testId: mongoose.Types.ObjectId;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: 2 })
  maxAttempts: number;

  @Prop({ default: Date.now })
  assignedAt: Date;

  @Prop({
    default: function () {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      return expiry;
    },
  })
  expiryDate: Date;

  @Prop({
    type: String,
    enum: ['active', 'expired', 'completed'],
    default: 'active',
  })
  status: string;
}

export const UserAssignmentSchema = SchemaFactory.createForClass(UserAssignment);
