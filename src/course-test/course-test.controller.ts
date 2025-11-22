import { Body, Controller, Delete, Get, Param, Patch, Post,Query, Req, UnauthorizedException,UploadedFile, UseInterceptors } from '@nestjs/common';
import { CourseTestDto } from './dto/courseTest.dto';
import { CourseTestService } from './course-test.service';
import { CourseTestDetailsDto } from './dto/courseTestDetails.dto';
import { JwtService } from '@nestjs/jwt';
import { FileInterceptor } from '@nestjs/platform-express';
import { audioMulterConfig } from '../config/multer-audio.config';
import { Multer } from 'multer'; 

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

    @Post('course-submit')
    async updateTest(@Body() payload: any, @Req() req: any) {
      const authHeader = req.headers?.authorization;
      console.log('Authorization header (raw):', authHeader);

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Token missing');
      }
      const token = authHeader.split(' ')[1];
      const decodedUnsafe = this.jwtService.decode(token);

      if (decodedUnsafe && decodedUnsafe['exp']) {
      }

      let decodedVerified: any;
      try {
        decodedVerified = this.jwtService.verify(token);
      } catch (err: any) {
        if (err?.name === 'TokenExpiredError') {
          throw new UnauthorizedException(`Token expired at ${err.expiredAt?.toISOString()}. Please refresh token.`);
        }
        throw new UnauthorizedException('Invalid token');
      }

      const userId = decodedVerified._id ?? decodedVerified.sub ?? decodedVerified.userId;
      if (!userId) throw new UnauthorizedException('Invalid token payload');

      const result = await this.courseTestService.handleSubmission(payload, userId);
      return { message: 'Test submitted!', data: result, status:'success' };
    }


    @Post('audio/upload')
      @UseInterceptors(FileInterceptor('file', audioMulterConfig))
      async uploadAudio(@UploadedFile() file: any, @Req() req:any) {
        if (!file) {
          return { success: false, message: 'No file uploaded' };
        }

        const baseUrl =
          process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

        const relativePath = `/uploads/audio/${file.filename}`;
        const url = `${baseUrl}${relativePath}`;

        return {
          success: true,
          filename: file.filename,
          path: relativePath, // you will save this in DB as mediaPath
          url,
          mimetype: file.mimetype,
          size: file.size,
          updatedAt: new Date().toISOString(),
        };
      }


    
    // @Delete('')
    // async deleteTest(@Body() dto: CourseTestDto){
    //     const result = await this.courseTestService.createTest(dto);
    //     return {message:"Test Created!", data:result}
    // }
}
