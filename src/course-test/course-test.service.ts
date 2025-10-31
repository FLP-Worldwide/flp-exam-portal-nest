import { Injectable, NotFoundException } from "@nestjs/common";
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
      return await this.CourseTestModel.find().exec();
    } catch (err: unknown) {
      throw err;
    }
  }

    // ✅ Fetch single test by ID
    async fetchSingleTest(id: string, module?: string) {
    try {
      const testObjectId = new Types.ObjectId(id);

      // 1️⃣ Fetch main test
      const test = await this.CourseTestModel.findById(testObjectId).lean();
      if (!test) throw new NotFoundException("Test not found!");

      // 2️⃣ Fetch CourseTestDetails
      const testDetails = await this.CourseTestDetailsModel.findOne({
        testId: testObjectId,
      })
        .populate("modules.moduleRef")
        .lean();

      if (!testDetails)
        return { ...test, modules: {}, message: "No test details found yet" };

      // 3️⃣ Filter by module if requested (e.g. ?module=reading)
      const filteredModules = module
        ? testDetails.modules.filter(
            (m) => m.name.toLowerCase() === module.toLowerCase()
          )
        : testDetails.modules;

      // 4️⃣ Fetch full module content from CourseModule collection
      const modulesWithDetails = await Promise.all(
        filteredModules.map(async (m) => {
          if (!m.moduleRef) return null;

          const moduleData = await this.CourseModuleModel.findById(
            m.moduleRef
          ).lean();

          if (!moduleData) return null;

          return {
            name: m.name,
            level: moduleData.level,
            content: moduleData.content,
          };
        })
      );

      // 5️⃣ Structure data by level
      const structured = modulesWithDetails.reduce((acc, m) => {
  if (!m) return acc;
  acc[`level_${m.level}`] = {
    module: m.name,
    content: m.content,
  };
  return acc;
}, {} as Record<string, { module: string; content: any }>);

      // 6️⃣ Return final merged response
      return {
        ...test,
        testId: testObjectId,
        modules: structured,
      };
    } catch (err) {
      console.error("❌ Error in fetchFullTestDetails:", err);
      throw err;
    }
  }

async createTestDetails(dto: CourseTestDetailsDto) {
  const { testId, level, module, content } = dto;
    console.log(dto);
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