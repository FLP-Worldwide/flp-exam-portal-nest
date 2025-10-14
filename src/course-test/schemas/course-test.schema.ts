import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type CourseTestDocument = HydratedDocument<CourseTest>;

@Schema({ timestamps: true })
export class CourseTest {
    @Prop({ required: true })
  testName: string;

  @Prop({ required: true })
  language: string;

  @Prop({ required: true })
  duration: number; // timestamp

  @Prop({ default: 0.0 })
  price: number;
}

export const CourseTestSchema = SchemaFactory.createForClass(CourseTest);