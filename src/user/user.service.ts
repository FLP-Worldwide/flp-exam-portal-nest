import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RegisterUserDto } from 'src/auth/dto/registerUser.dto';
import { LoginUserDto } from 'src/auth/dto/loginUser.dto';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { StudentDetails } from './schemas/student.schema';
import { UserAssignment } from './schemas/userAssignment.schema';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel:Model<User>,
        @InjectModel(StudentDetails.name) private studentDetailsModel:Model<StudentDetails>,
        @InjectModel(UserAssignment.name) private userAssignmentModel:Model<UserAssignment>
    ){}

    async createUser(registerUserDto:RegisterUserDto){
        try{
            let status = 'active';
            if (registerUserDto.role === 'student') {
                status = 'pending';
            }
            const userData = { ...registerUserDto, status };
            const user =  await this.userModel.create(userData)

            if (user.role === 'student') {
                const studentDetails = {
                    userId: user._id,
                    enrollmentNo: 'STUD' + Math.floor(100000 + Math.random() * 900000),
                };
                const userDetails = await this.studentDetailsModel.create(studentDetails);
                user.studentDetails = userDetails._id;
                await user.save();
            }

            return user;
        }
        catch(err:unknown){
            const e = err as {code?:number}

            const DUPLICATE_KEY_CODE = 11000;

            if (e.code === DUPLICATE_KEY_CODE){
                throw new ConflictException("Email is already exist.");
            }
            throw err
        }
    }

    async findByEmail(email: string) {
        return this.userModel.findOne({ email }).lean(); // or .exec()
    }



    async getUserByRole(role: string) {
        const userDetailsType = role === "student" ? "studentDetails" : "teacherDetails";

        // 1️⃣ Fetch all users for the given role
        const users = await this.userModel
            .find({ role })
            .populate(userDetailsType)
            .lean();

        // 2️⃣ Fetch all assignments (active, completed, expired)
        const assignments = await this.userAssignmentModel
            .find({})
            .select("userId testId status expiryDate assignedAt")
            .populate("testId", "testName")
            .lean();

        // 3️⃣ Define the Map properly
        const assignmentMap = new Map<string, any[]>();

        // 4️⃣ Build assignment map — multiple tests per user
        assignments.forEach((a) => {
            const userId = (a.userId as any)?._id?.toString?.() || a.userId?.toString?.();
            if (!userId) return;

            if (!assignmentMap.has(userId)) {
            assignmentMap.set(userId, []);
            }

            assignmentMap.get(userId)!.push({
            testId: (a.testId as any)?._id || a.testId,
            testName: (a.testId as any)?.testName || null,
            status: a.status,
            expiryDate: a.expiryDate,
            assignedAt: a.assignedAt,
            });
        });

        // 5️⃣ Merge user data with assignments
        const result = users.map((user) => {
            const userId = user._id.toString();
            const assignments = assignmentMap.get(userId) || [];

            return {
            ...user,
            assignments: assignments.length
                ? assignments.map((a) => ({
                    hasAssignment: true,
                    testId: a.testId,
                    testName: a.testName,
                    status: a.status,
                    expiryDate: a.expiryDate,
                }))
                : [
                    {
                    hasAssignment: false,
                    testId: null,
                    testName: null,
                    status: null,
                    expiryDate: null,
                    },
                ],
            };
        });

        // 6️⃣ Return response
        return {
            message: "List of users.",
            data: result,
        };
    }
                

            


    async assignTestToUser(userId: string, testId: string) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            return { success: false, message: "User not found" };
        }

        const existingAssignment = await this.userAssignmentModel.findOne({
            userId,
            testId,
            status: { $in: ["active", "completed"] },
        });

        if (existingAssignment) {
            return { success: false, message: "Test already assigned or completed by this user" };
        }

        const newAssignment = await this.userAssignmentModel.create({
            userId,
            testId,
            attempts: 0,
            maxAttempts: 2,
        });

        return { success: true, message: "Test assigned successfully", data: newAssignment };
    }


    
}
