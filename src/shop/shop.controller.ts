import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import bcrypt from 'bcrypt';

import { User } from '../user/schemas/user.schema';
import { CourseTest } from '../course-test/schemas/course-test.schema';
import { UserAssignment } from '../user/schemas/userAssignment.schema';

@Controller('shop')
export class ShopController {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(CourseTest.name)
    private readonly courseTestModel: Model<CourseTest>,
    @InjectModel(UserAssignment.name)
    private readonly assignmentModel: Model<UserAssignment>,
  ) {}
@Post('buy-test')
async buyTestForUser(@Body() body: any) {
  const { name, email, phone, city, packId } = body;

  if (!name || !email || !phone || !packId) {
    throw new BadRequestException(
      'Name, email, phone and packId are required.'
    );
  }

  // Mapping pack IDs to number of tests
  const PACK_SIZES: Record<string, number> = {
    'pack-1': 1,
    'pack-3': 3,
    'pack-5': 5,
    'pack-10': 10,
  };

  const testsToAssign = PACK_SIZES[packId];
  if (!testsToAssign) {
    throw new BadRequestException('Invalid packId.');
  }

  // Find or create user
  let user = await this.userModel.findOne({ email });

  if (!user) {
    const hashedPassword = await bcrypt.hash('student123', 10);

    user = await this.userModel.create({
      name,
      email,
      phone,
      city,
      password: hashedPassword,
      role: 'student',
    });
  }

  // Find existing test assignments
  const existingAssignments = await this.assignmentModel
    .find({ userId: user._id })
    .select('testId')
    .lean();

  const alreadyAssignedIds = new Set(
    existingAssignments.map((t: any) => String(t.testId))
  );

  // Find tests not assigned before
  const availableTests = await this.courseTestModel
    .find({
      _id: { $nin: Array.from(alreadyAssignedIds) },
    })
    .lean();

  if (!availableTests.length) {
    throw new BadRequestException(
      'No more tests available to assign for this user.'
    );
  }

  // Random shuffle
  const shuffled = [...availableTests].sort(() => Math.random() - 0.5);

  // slice based on pack size
  const selectedTests = shuffled.slice(0, testsToAssign);

  // Assign tests
  const docs = selectedTests.map((test) => ({
    userId: user._id,
    testId: test._id,
  }));

  await this.assignmentModel.insertMany(docs);

  return {
    message: 'Test pack purchased successfully.',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    packId,
    testsRequested: testsToAssign,
    testsAssigned: selectedTests.length,
    assignedTests: selectedTests.map((t) => ({
      testId: t._id,
      title: t.testName,
    })),
  };
}


}
