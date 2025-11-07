import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {

    constructor(private readonly userService: UserService) {}

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

        console.log(result);
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
}

