import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RegisterUserDto } from 'src/auth/dto/registerUser.dto';
import { LoginUserDto } from 'src/auth/dto/loginUser.dto';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { StudentDetails } from './schemas/student.schema';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel:Model<User>,
        @InjectModel(StudentDetails.name) private studentDetailsModel:Model<StudentDetails>
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
        const userDetailsType = role === 'student' ? 'studentDetails' : 'teacherDetails';
        const users = await this.userModel.find({ role }).populate(userDetailsType).lean();
        return users.map(({password, ...rest}) => rest);
    }
}
