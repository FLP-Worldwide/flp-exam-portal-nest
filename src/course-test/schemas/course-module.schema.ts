  import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
  import { HydratedDocument, Types } from "mongoose";

  export type CourseModuleDocument = HydratedDocument<CourseModule>;

  @Schema({ timestamps: true })
  export class CourseModule {
    @Prop({ type: Types.ObjectId, ref: "CourseTestDetails", required: true })
    testDetailsId: Types.ObjectId;

    @Prop({ required: true })
    level: string;

    @Prop({ type: Object, required: true })
    content: {
      paragraphs: {
        paragraph: string;
        answer: string;
      }[];
      options: string[];
    };
  }

  export const CourseModuleSchema = SchemaFactory.createForClass(CourseModule);
