import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserController } from './user.controller';
import { StudentDetails, StudentDetailsSchema } from './schemas/student.schema';

@Module({
  imports:[MongooseModule.forFeature(
    [
      { name: User.name, schema: UserSchema },
      {name:StudentDetails.name ,schema:StudentDetailsSchema}
    ])],
  providers: [UserService],
  exports:[UserService],
  controllers: [UserController]
})
export class UserModule {}
