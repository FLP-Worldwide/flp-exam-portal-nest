import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/registerUser.dto';
import { LoginUserDto } from './dto/loginUser.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService:AuthService){}

    @Post('register')
    async register(@Body() registerUserDto:RegisterUserDto) {
        const resultToken = await this.authService.registerUser(registerUserDto);
        return {message:"User Created!", data:resultToken}
    }

    @Post('login')
    async login(@Body() loginUserDto:LoginUserDto)
    {
        const resultToken = await this.authService.loginUser(loginUserDto);
        return { message: 'User Logged in', data: resultToken };
    }
}
