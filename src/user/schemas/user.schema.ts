
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Role } from '../user.types';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({required:true})
  name: string;

  @Prop({required:true,unique:true})
  email: string;

  @Prop()
  password: string;

  @Prop({default:Role.Student})
  role: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'StudentDetails' })
  studentDetails: mongoose.Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
