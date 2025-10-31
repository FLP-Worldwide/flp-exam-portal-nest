import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { CourseTest } from "./course-test.schema";

export type CourseTestDetailsDocument = HydratedDocument<CourseTestDetails>;

@Schema({ timestamps: true })
export class CourseTestDetails {
  @Prop({ type: Types.ObjectId, ref: CourseTest.name, required: true })
  testId: Types.ObjectId;

  @Prop({
    type: [
      {
        name: { type: String, required: true }, // e.g. "Reading", "Writing", "Listening"
        moduleRef: { type: Types.ObjectId, ref: "CourseModule", default: null },
      },
    ],
    default: [],
  })
  modules: {
    name: string;
    moduleRef: Types.ObjectId | null;
  }[];
}


export const CourseTestDetailsSchema =
  SchemaFactory.createForClass(CourseTestDetails);
