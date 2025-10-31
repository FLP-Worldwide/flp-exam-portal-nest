import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { CourseTestDto } from './dto/courseTest.dto';
import { CourseTestService } from './course-test.service';
import { CourseTestDetailsDto } from './dto/courseTestDetails.dto';

@Controller('course-test')
export class CourseTestController {
    constructor(private readonly courseTestService:CourseTestService){}

    @Post('create')
    async createTest(@Body() dto: CourseTestDto){
        const result = await this.courseTestService.createTest(dto);
        return {message:"Test Created!", data:result}
    }

    @Post('details')
    async createTestDetails(@Body() dto: CourseTestDetailsDto){
        const result = await this.courseTestService.createTestDetails(dto);
        return {message:"Test Details Created!", data:result}
    }

    @Get('')
    async fetchTest(){
        const result = await this.courseTestService.fetchTest();
        return {message:"Test Fetched!", data:result}
    }

    @Patch('')
    async updateTest(@Body() dto: CourseTestDto){
        const result = await this.courseTestService.createTest(dto);
        return {message:"Test Created!", data:result}
    }
    @Delete('')
    async deleteTest(@Body() dto: CourseTestDto){
        const result = await this.courseTestService.createTest(dto);
        return {message:"Test Created!", data:result}
    }
}
