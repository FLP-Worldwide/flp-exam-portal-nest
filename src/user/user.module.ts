import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserController } from './user.controller';
import { StudentDetails, StudentDetailsSchema } from './schemas/student.schema';
import { UserAssignment, UserAssignmentSchema } from './schemas/userAssignment.schema';
import { CourseTest, CourseTestSchema } from 'src/course-test/schemas/course-test.schema';

@Module({
  imports:[MongooseModule.forFeature(
    [
      { name: User.name, schema: UserSchema },
      {name:StudentDetails.name ,schema:StudentDetailsSchema},
      {name:UserAssignment.name ,schema:UserAssignmentSchema},
      { name: CourseTest.name, schema: CourseTestSchema },
    ])],
  providers: [UserService],
  exports:[UserService],
  controllers: [UserController]
})
export class UserModule {}
