import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseTestController } from './course-test.controller';
import { CourseTestService } from './course-test.service';
import { CourseTest, CourseTestSchema } from './schemas/course-test.schema';
import { CourseTestDetails, CourseTestDetailsSchema } from './schemas/course-test-details.schema';
import { CourseModule, CourseModuleSchema } from './schemas/course-module.schema';
import { UserAssignment, UserAssignmentSchema } from 'src/user/schemas/userAssignment.schema';
import { CourseTestResult, CourseTestResultSchema } from './schemas/course-test-result.schema';
import { AiWritingEvaluatorService } from 'src/ai-writing-evaluator/ai-writing-evaluator.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseTest.name, schema: CourseTestSchema },
      { name: CourseTestDetails.name, schema: CourseTestDetailsSchema },
      { name: CourseModule.name, schema: CourseModuleSchema },
      {name :UserAssignment.name, schema:UserAssignmentSchema},
      {name :CourseTestResult.name, schema:CourseTestResultSchema},
    ]),
  ],
  controllers: [CourseTestController],
  providers: [CourseTestService, AiWritingEvaluatorService],
})
export class CourseTestModule {}
