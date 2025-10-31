import { Body, Controller, Get, Param } from '@nestjs/common';
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
}
