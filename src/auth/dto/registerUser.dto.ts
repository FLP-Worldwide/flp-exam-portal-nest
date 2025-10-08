
import {IsNotEmpty, IsString} from "class-validator"
export class RegisterUserDto {
    @IsNotEmpty()
    name:String;

    @IsString()
    email:String;

    @IsString()
    password:String;

    @IsString()
    role:String;
}