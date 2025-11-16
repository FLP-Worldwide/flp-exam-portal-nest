import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { UserService } from './user.service';
import bcrypt from "bcrypt";
import {JwtService}  from "@nestjs/jwt"


@Controller('user')
export class UserController {

    constructor(private readonly userService: UserService, private readonly jwtService:JwtService) {}

    @Get('list/:type')
    async getUserByRole(@Param() params:any){
        const { type } = params;
        const result = await this.userService.getUserByRole(type);
        return { message: "List of users.", data: result };
    }

    // user/assign-test
    @Post('assign-test')
    async assignTestToUser(@Body() body: any) {
        const { userId, testId } = body;
        const result = await this.userService.assignTestToUser(userId, testId);
       if (!result.success) {
            return {
            statusCode: 400,
            success: false,
            message: result.message,
            };
        }

        return {
            statusCode: 200,
            success: true,
            message: result.message,
            data: result.data,
        };
    }

    @Post('create')
    async createStudent(@Body()  body:any){

        const student = {
            name:body.name,
            email:body.email,
            role:body.role
        }

        const saltRounds = Number(process.env.SALT_ROUNDS);
        const hash = await bcrypt.hash(String('student1234'), saltRounds);

        const user = await this.userService.createUser({
            ...student,
            password: hash,
        });
        const payload = {
            sub:user._id
        }
        const token = await this.jwtService.signAsync(payload)
        return {message:"User Created!", data:{"access_token":token}}
    }
}

