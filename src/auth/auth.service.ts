import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { RegisterUserDto } from './dto/registerUser.dto';
import { LoginUserDto } from './dto/loginUser.dto';
import bcrypt from "bcrypt";
import {JwtService}  from "@nestjs/jwt"

@Injectable()
export class AuthService {

    constructor (private readonly userService:UserService,
        private readonly jwtService:JwtService
    ){}
    
    async registerUser(registerUserDto:RegisterUserDto){

        const saltRounds = Number(process.env.SALT_ROUNDS);
        const hash = await bcrypt.hash(String(registerUserDto.password), saltRounds);

        const user = await this.userService.createUser({
            ...registerUserDto,
            password: hash,
        });
        const payload = {
            sub:user._id
        }
        const token = await this.jwtService.signAsync(payload)
        return {"access_token":token};
    }

    async loginUser(loginUserDto: LoginUserDto) {

        const user = await this.userService.findByEmail(loginUserDto.email,);

        if (!user) throw new UnauthorizedException('Invalid credentials');

        const isMatch = await bcrypt.compare(
            String(loginUserDto.password),
            String(user.password),
        );
        if (!isMatch) throw new UnauthorizedException('Invalid credentials');

        const payload = { sub: user._id?.toString?.() ?? user._id, email: user.email,role: user.role };
        const token = await this.jwtService.signAsync(payload);
        return { access_token: token,role:user.role };
    }
}
