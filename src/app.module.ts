import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { CourseTestModule } from './course-test/course-test.module';
import { StudentModule } from './student/student.module';
import { ShopModule } from './shop/shop.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule, 
    UserModule,
    MongooseModule.forRoot(process.env.MONGO_URL as string),
    CourseTestModule,
    StudentModule,
    ShopModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
