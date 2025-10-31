import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type StudentDetailsDocument = HydratedDocument<StudentDetails>;

@Schema()
export class StudentDetails {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop()
  enrollmentNo?: string;
}

export const StudentDetailsSchema = SchemaFactory.createForClass(StudentDetails);
