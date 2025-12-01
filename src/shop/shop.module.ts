import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from '../user/schemas/user.schema';
import { CourseTest, CourseTestSchema } from 'src/course-test/schemas/course-test.schema';
import { UserAssignment, UserAssignmentSchema } from 'src/user/schemas/userAssignment.schema';
import { ShopController } from './shop.controller';

@Module({
  imports:[MongooseModule.forFeature(
    [
      { name: User.name, schema: UserSchema },
      { name: CourseTest.name, schema: CourseTestSchema },
      { name: UserAssignment.name, schema: UserAssignmentSchema },
    ])],
  providers: [],
  exports:[],
  controllers: [ShopController]
})
export class ShopModule {}
