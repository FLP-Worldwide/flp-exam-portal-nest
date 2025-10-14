import { Body, Controller, Post } from '@nestjs/common';
import { CourseTestDto } from './dto/courseTest.dto';
import { CourseTestService } from './course-test.service';

@Controller('course-test')
export class CourseTestController {
    constructor(private readonly courseTestService:CourseTestService){}

    @Post('create')
    async createTest(@Body() dto: CourseTestDto){
        const result = await this.courseTestService.createTest(dto);
        return {message:"Test Created!", data:result}
    }
}
