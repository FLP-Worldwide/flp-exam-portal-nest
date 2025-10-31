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

async createTestDetails(dto: CourseTestDetailsDto) {
  const { testId, level, module, content } = dto;

  try {
    const testObjectId = new Types.ObjectId(testId);

    // ✅ Step 1: Find or Create Course Test Details
    let testDetails = await this.CourseTestDetailsModel.findOne({ testId: testObjectId });

    if (!testDetails) {
      testDetails = await this.CourseTestDetailsModel.create({
        testId: testObjectId,
        modules: [],
      });
    }

    // ✅ Step 2: Find existing module entries for same module name
    const moduleEntries = testDetails.modules.filter(
      (m) => m.name.toLowerCase() === module.toLowerCase()
    );

    let existingModuleEntry: any = null;

    if (moduleEntries.length > 0) {
      // ✅ Get moduleRefs
      const moduleRefs = moduleEntries.map((m) => m.moduleRef);

      // ✅ Find CourseModule documents for these refs
      const existingModules = await this.CourseModuleModel.find({
        _id: { $in: moduleRefs },
      });

      // ✅ Match specific level inside CourseModule
      existingModuleEntry = existingModules.find((m) => m.level === level);
    }

    let moduleData;

    if (existingModuleEntry) {
      // ✅ Step 3a: Update the existing CourseModule for this level
      moduleData = await this.CourseModuleModel.findByIdAndUpdate(
        existingModuleEntry._id,
        { content },
        { new: true }
      );
    } else {
      // ✅ Step 3b: Create a new CourseModule for this level
      moduleData = await this.CourseModuleModel.create({
        testDetailsId: testDetails._id,
        level,
        content,
      });

      // ✅ Step 4: Push the new module reference to modules array
      testDetails.modules.push({
        name: module,
        moduleRef: moduleData._id,
      });

      await testDetails.save();
    }

    // ✅ Step 5: Return success response
    return {
      success: true,
      message: existingModuleEntry
        ? `Module (Level ${level}) updated successfully`
        : `Module (Level ${level}) created successfully`,
      data: {
        testDetails,
        module: moduleData,
      },
    };
  } catch (err) {
    console.error("❌ Error in createTestDetails:", err);
    throw new Error("Failed to create or update test details");
  }
}


}