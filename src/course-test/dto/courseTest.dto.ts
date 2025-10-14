import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CourseTestDto {
  @IsNotEmpty()
  @IsString()
  testName: string;

  @IsNotEmpty()
  @IsString()
  language: string;

  // Duration as timestamp (number)
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  duration: number;

  // Default 0.00 if not provided
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price: number = 0.0;
}
