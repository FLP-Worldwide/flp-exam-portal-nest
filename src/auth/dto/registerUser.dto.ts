
import {IsNotEmpty, IsString} from "class-validator"
export class RegisterUserDto {
    @IsNotEmpty()
    name:string;

    @IsString()
    email:string;

    @IsString()
    password:string;

    @IsString()
    role:string;
}