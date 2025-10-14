import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RegisterUserDto } from 'src/auth/dto/registerUser.dto';
import { LoginUserDto } from 'src/auth/dto/loginUser.dto';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private userModel:Model<User> ){}

    async createUser(registerUserDto:RegisterUserDto){
        try{
            return await this.userModel.create(registerUserDto)
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
}
