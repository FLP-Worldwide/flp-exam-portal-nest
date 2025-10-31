import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { CourseTest } from "./schemas/course-test.schema";
import { CourseModule } from "./schemas/course-module.schema";
import { CourseTestDetails } from "./schemas/course-test-details.schema";
import { CourseTestDto } from "./dto/courseTest.dto";
import { CourseTestDetailsDto } from "./dto/courseTestDetails.dto";

@Injectable()
export class CourseTestService {
  constructor(
    @InjectModel(CourseTest.name)
    private readonly CourseTestModel: Model<CourseTest>,

    @InjectModel(CourseModule.name)
    private readonly CourseModuleModel: Model<CourseModule>,

    @InjectModel(CourseTestDetails.name)
    private readonly CourseTestDetailsModel: Model<CourseTestDetails>
  ) {}

  // ✅ Create main Course Test
  async createTest(dto: CourseTestDto) {
    try {
      const test = await this.CourseTestModel.create(dto);
      return { success: true, data: test };
    } catch (err: unknown) {
      throw err;
    }
  }

  // ✅ Fetch all tests
  async fetchTest() {
    try {
      const result = await this.CourseTestModel.find().exec();
      return { success: true, data: result };
    } catch (err: unknown) {
      throw err;
    }
  }


  // ✅ Create / Update Course Test Details + Module
 async createTestDetails(dto: CourseTestDetailsDto) {
  const { testId, level, module, content } = dto;

  try {

    const testObjectId = new Types.ObjectId(testId); // ✅ Convert once here
    let testDetails = await this.CourseTestDetailsModel.findOne({ testId: testObjectId });

    if (!testDetails) {
      testDetails = await this.CourseTestDetailsModel.create({
        testId: new Types.ObjectId(testId),
        modules: [],
      });
    }

    // ✅ Step 2: Check if this module already exists (same module name)
    const existingModuleEntry = testDetails.modules.find(
      (m) => m.name.toLowerCase() === module.toLowerCase()
    );
    // console.log(existingModuleEntry);
    let moduleData;

    if (existingModuleEntry && existingModuleEntry.moduleRef) {
      // ✅ Step 3a: Update the module (don’t match on level)
      moduleData = await this.CourseModuleModel.findByIdAndUpdate(
        existingModuleEntry.moduleRef,
        { level, content },
        { new: true }
      );

    } else {

      // ✅ Step 3b: Module doesn't exist → create new
      moduleData = await this.CourseModuleModel.create({
        testDetailsId: testDetails._id,
        level,
        content,
      });

      // ✅ Step 4: Add or update module reference
      if (existingModuleEntry) {
        existingModuleEntry.moduleRef = moduleData._id;
      } else {
        testDetails.modules.push({
          name: module,
          moduleRef: moduleData._id,
        });
      }

      await testDetails.save();
    }

    return {
      success: true,
      message: existingModuleEntry
        ? "Module updated successfully"
        : "Module created successfully",
      data: { testDetails, module: moduleData },
    };
  } catch (err: unknown) {
    console.error("❌ Error in createTestDetails:", err);
    throw err;
  }
}

}