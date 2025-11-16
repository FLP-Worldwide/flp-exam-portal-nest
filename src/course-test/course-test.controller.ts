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
  // 1) log raw header value (exact)
  const authHeader = req.headers?.authorization;
  console.log('Authorization header (raw):', authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedException('Token missing');
  }

  const token = authHeader.split(' ')[1];
  // 2) log the exact token string you will verify
  console.log('Token string to verify:', token);

  // 3) decode WITHOUT verifying to inspect payload (safe)
  const decodedUnsafe = this.jwtService.decode(token);
  console.log('Decoded payload (unsafe, no verify):', decodedUnsafe);

  // if you see a fresh token above, but verify still fails, compare 'exp' / 'iat' fields here
  if (decodedUnsafe && decodedUnsafe['exp']) {
    console.log('token exp (unix seconds):', decodedUnsafe['exp']);
    console.log('token exp (iso):', new Date((decodedUnsafe['exp'] as number) * 1000).toISOString());
  }

  // 4) try verify inside try/catch so TokenExpiredError is handled
  let decodedVerified: any;
  try {
    decodedVerified = this.jwtService.verify(token);
    console.log('Verified token payload:', decodedVerified);
  } catch (err: any) {
    console.error('JWT verify error:', err?.name, err?.message, 'expiredAt:', err?.expiredAt);
    if (err?.name === 'TokenExpiredError') {
      // tell client token expired and optionally send token exp time
      throw new UnauthorizedException(`Token expired at ${err.expiredAt?.toISOString()}. Please refresh token.`);
    }
    // other JWT errors
    throw new UnauthorizedException('Invalid token');
  }

  const userId = decodedVerified._id ?? decodedVerified.sub ?? decodedVerified.userId;
  if (!userId) throw new UnauthorizedException('Invalid token payload');

  const result = await this.courseTestService.handleSubmission(payload, userId);
  return { message: 'Test submitted!', data: result };
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
