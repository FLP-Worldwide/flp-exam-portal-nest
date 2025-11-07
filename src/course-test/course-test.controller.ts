import { Body, Controller, Delete, Get, Param, Patch, Post,Query, Req, UnauthorizedException } from '@nestjs/common';
import { CourseTestDto } from './dto/courseTest.dto';
import { CourseTestService } from './course-test.service';
import { CourseTestDetailsDto } from './dto/courseTestDetails.dto';
import { JwtService } from '@nestjs/jwt';
@Controller('course-test')
export class CourseTestController {
    constructor(private readonly courseTestService:CourseTestService,
        private readonly jwtService: JwtService,
    ){}

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
        const result = await this.courseTestService.fetchTestWithModules();
        return {message:"Test Fetched!", data:result}
    }

    @Get('details/:testId')
    async fetchTestDetails(@Param('testId') testId: string, @Query('module') module?: string) {
        const result = await this.courseTestService.fetchSingleTest(testId, module);

        return { message: "Test details fetched!", data: result };
    }

    @Get('detail-instruction/:testId')
    async fetchTestDetailInstruction(@Req() req: any, @Param('testId') testId: string) {
         
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new UnauthorizedException('Token missing');
        }

        const token = authHeader.split(' ')[1];
        const decoded = this.jwtService.verify(token);
        const userId = decoded._id || decoded.sub || decoded.userId;

        if (!decoded || !userId) {
            throw new UnauthorizedException('Invalid token');
        }

        const result = await this.courseTestService.fetchSingleTestInstruction(testId,userId);
        return { message: "Test details fetched!", data: result };
    }

    @Post('attempt/:testId')
    async examAttempts(@Req() req: any, @Param('testId') testId: string){
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new UnauthorizedException('Token missing');
        }

        const token = authHeader.split(' ')[1];
        const decoded = this.jwtService.verify(token);
        const userId = decoded._id || decoded.sub || decoded.userId;

        if (!decoded || !userId) {
            throw new UnauthorizedException('Invalid token');
        }

         const result = await this.courseTestService.recordExamAttempt(testId, userId);

        return {
        message: result.message,
        data: result.data,
        };
    }

    // @Patch('')
    // async updateTest(@Body() dto: CourseTestDto){
    //     const result = await this.courseTestService.createTest(dto);
    //     return {message:"Test Created!", data:result}
    // }
    
    // @Delete('')
    // async deleteTest(@Body() dto: CourseTestDto){
    //     const result = await this.courseTestService.createTest(dto);
    //     return {message:"Test Created!", data:result}
    // }
}
