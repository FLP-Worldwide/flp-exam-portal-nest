import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CourseTestResultDocument = HydratedDocument<CourseTestResult>;

@Schema({ timestamps: true })
export class CourseTestResult {
  @Prop({ type: String, required: true })
  testId: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: Date, required: true })
  submittedAt: Date;

  @Prop({ type: Object, required: true })
  rawPayload: any;

  @Prop({ type: [Object], default: [] })
  perQuestion: Array<{
    questionId: string;
    answerSubmitted: any;
    correctAnswer: any | null;
    isCorrect: boolean | null; // null = manual
    points: number;
  }>;

  @Prop({ type: Number, default: 0 })
  totalPoints: number;

  @Prop({ type: Number, default: 0 })
  maxPoints: number;

  @Prop({ type: Object, default: {} })
  perModuleSummary: Record<string, { points: number; maxPoints: number }>;

  @Prop({ type: String, enum: ['graded', 'partial', 'pending'], default: 'pending' })
  status: 'graded' | 'partial' | 'pending';
}

export const CourseTestResultSchema = SchemaFactory.createForClass(CourseTestResult);
