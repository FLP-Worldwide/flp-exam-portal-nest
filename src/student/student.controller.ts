import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';
import { UserAssignment } from 'src/user/schemas/userAssignment.schema';
import { CourseTest } from 'src/course-test/schemas/course-test.schema';

@Controller('student')
export class StudentController {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(UserAssignment.name)
    private userAssignmentModel: Model<UserAssignment>,
    @InjectModel(CourseTest.name)
    private courseTestModel: Model<CourseTest>,
  ) {}

  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    try {
      // Extract token from headers
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Token missing');
      }

      const token = authHeader.split(' ')[1];
      const decoded = this.jwtService.verify(token);
      const userId = decoded._id || decoded.sub || decoded.userId;

      if (!decoded || !userId) {
        throw new UnauthorizedException('Invalid token');
      }

      // Get user data
      const student = await this.userModel
        .findById(userId)
        .populate('studentDetails')
        .lean();

      if (!student || student.role !== 'student') {
        throw new UnauthorizedException('Not authorized as student');
      }

      // --- Typed helper for assignments that may have populated testId ---
      type AssignmentWithPopulatedTest = {
        _id: Types.ObjectId | string;
        userId: Types.ObjectId | string;
        testId: CourseTest | Types.ObjectId | string;
        attempts?: number;
        maxAttempts?: number;
        status?: string;
        assignedAt?: Date;
        expiryDate?: Date;
      };

      // Get all assigned tests for this student and populate test fields
      const assignments = (await this.userAssignmentModel
        .find({ userId: student._id })
        .populate('testId', 'testName language duration price')
        .lean()) as AssignmentWithPopulatedTest[];

      // Format the test data to include both assignment info and populated test details
      const tests = assignments.map((a) => {
        const testIdValue = a.testId as any; // runtime value

        const isPopulated =
          testIdValue &&
          typeof testIdValue === 'object' &&
          'testName' in testIdValue;

        const populatedTest = isPopulated
          ? {
              _id: testIdValue._id,
              testName: testIdValue.testName,
              language: testIdValue.language,
              duration: testIdValue.duration,
              price: testIdValue.price,
            }
          : { _id: testIdValue };

        return {
          // assignment id (assignment document)
          _id: a._id,
          // assignment-level fields
          attempts: a.attempts ?? 0,
          maxAttempts: a.maxAttempts ?? 2,
          status: a.status || 'active',
          assignedAt: a.assignedAt,
          expiryDate: a.expiryDate,
          // embedded test details (populated)
          test: populatedTest,
        };
      });

      // Response summary
      return {
        message: 'Student dashboard data',
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          role: student.role,
          studentDetails: student.studentDetails || {},
        },
        tests,
      };
    } catch (err) {
      console.error('Error in getDashboard:', err);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
