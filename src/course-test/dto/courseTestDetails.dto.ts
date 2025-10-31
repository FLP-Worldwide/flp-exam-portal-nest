
import { IsNotEmpty, IsString, IsObject, IsOptional } from "class-validator";

export class CourseTestDetailsDto {

  @IsNotEmpty()
  @IsString()
  module: string;

  @IsNotEmpty()
  @IsString()
  level: string;

  @IsNotEmpty()
  @IsObject()
  content: Record<string, any>;

  @IsOptional()
  @IsString()
  testId?: string;
}
