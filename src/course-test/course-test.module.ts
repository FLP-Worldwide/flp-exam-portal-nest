import { Module } from '@nestjs/common';
import { CourseTestController } from './course-test.controller';
import { CourseTestService } from './course-test.service';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseTest, CourseTestSchema } from './schemas/course-test.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseTest.name, schema: CourseTestSchema },
    ]),
  ],
  controllers: [CourseTestController],
  providers: [CourseTestService]
})
export class CourseTestModule {}
