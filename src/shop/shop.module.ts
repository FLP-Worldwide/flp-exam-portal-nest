import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from '../user/schemas/user.schema';
import { CourseTest, CourseTestSchema } from 'src/course-test/schemas/course-test.schema';
import { UserAssignment, UserAssignmentSchema } from 'src/user/schemas/userAssignment.schema';
import { ShopController } from './shop.controller';
import { StudentDetails, StudentDetailsSchema } from 'src/user/schemas/student.schema';
import { Payment, PaymentSchema } from './payment.schema';

@Module({
  imports:[MongooseModule.forFeature(
    [
      { name: User.name, schema: UserSchema },
      { name: CourseTest.name, schema: CourseTestSchema },
      { name: UserAssignment.name, schema: UserAssignmentSchema },
      { name: StudentDetails.name, schema: StudentDetailsSchema },
      { name: Payment.name, schema: PaymentSchema },
    ])],
  providers: [],
  exports:[],
  controllers: [ShopController]
})
export class ShopModule {}
