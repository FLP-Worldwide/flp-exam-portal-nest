import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/registerUser.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService:AuthService){}

    @Post('register')
    async register(@Body() registerUserDto:RegisterUserDto) {
        const resultToken = await this.authService.registerUser(registerUserDto);


        return {Message:"User Created!", Data:resultToken}
    }
}
