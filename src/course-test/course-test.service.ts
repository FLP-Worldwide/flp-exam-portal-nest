
import { CourseTestDto } from './dto/courseTest.dto';
import { Model } from 'mongoose';
import { CourseTest } from './schemas/course-test.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CourseTestService {

    constructor (@InjectModel(CourseTest.name) private CourseTestModel:Model<CourseTest>){}

    async createTest(dto:CourseTestDto){
        try{
            await this.CourseTestModel.create(dto);
        }catch(err:unknown){
            throw err
        }
    }
}
