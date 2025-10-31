import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseTestController } from './course-test.controller';
import { CourseTestService } from './course-test.service';
import { CourseTest, CourseTestSchema } from './schemas/course-test.schema';
import { CourseTestDetails, CourseTestDetailsSchema } from './schemas/course-test-details.schema';
import { CourseModule, CourseModuleSchema } from './schemas/course-module.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseTest.name, schema: CourseTestSchema },
      { name: CourseTestDetails.name, schema: CourseTestDetailsSchema },
      { name: CourseModule.name, schema: CourseModuleSchema },
    ]),
  ],
  controllers: [CourseTestController],
  providers: [CourseTestService],
})
export class CourseTestModule {}
