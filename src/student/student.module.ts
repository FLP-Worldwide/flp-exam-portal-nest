import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { StudentController } from './student.controller';


import { CourseTest, CourseTestSchema } from 'src/course-test/schemas/course-test.schema';
import { UserAssignment, UserAssignmentSchema } from 'src/user/schemas/userAssignment.schema';
import { User, UserSchema } from 'src/user/schemas/user.schema';


@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey', // 🔐 use your secret from .env
      signOptions: { expiresIn: '7d' },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserAssignment.name, schema: UserAssignmentSchema },
      { name: CourseTest.name, schema: CourseTestSchema },
    ]),
  ],
  controllers: [StudentController],
})
export class StudentModule {}
