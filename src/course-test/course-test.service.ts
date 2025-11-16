import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { CourseTest } from "./schemas/course-test.schema";
import { CourseModule } from "./schemas/course-module.schema";
import { CourseTestDetails } from "./schemas/course-test-details.schema";
import { CourseTestDto } from "./dto/courseTest.dto";
import { CourseTestDetailsDto } from "./dto/courseTestDetails.dto";
import { UserAssignment, UserAssignmentDocument } from "src/user/schemas/userAssignment.schema";
import { CourseTestResult, CourseTestResultDocument } from "./schemas/course-test-result.schema";


@Injectable()
export class CourseTestService {
  constructor(
    @InjectModel(CourseTest.name)
    private readonly CourseTestModel: Model<CourseTest>,

    @InjectModel(CourseModule.name)
    private readonly CourseModuleModel: Model<CourseModule>,

    @InjectModel(CourseTestDetails.name)
    private readonly CourseTestDetailsModel: Model<CourseTestDetails>,

    @InjectModel(UserAssignment.name)
    private readonly UserAssignmentModel: Model<UserAssignmentDocument>,

    @InjectModel(CourseTestResult.name)
    private readonly CourseTestResultModel: Model<CourseTestResultDocument>
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


  async fetchTestWithModules() {
  try {
    const tests = await this.CourseTestModel.find().lean().exec();

    const results = await Promise.all(
      tests.map(async (test) => {
        const testDetails = await this.CourseTestDetailsModel.findOne({
          testId: test._id,
        })
          .populate({
            path: "modules.moduleRef", // ✅ populate CourseModule
            model: "CourseModule",
            select: "level content", // ✅ only fetch needed fields
          })
          .lean()
          .exec();

        // 🧩 Group modules by module name (reading, writing, etc.)
        const groupedModules: Record<string, any[]> = {};

        if (testDetails?.modules?.length) {
          testDetails.modules.forEach((mod) => {
            const moduleName = mod.name.toLowerCase();

            // moduleRef can be ObjectId or populated object
            const moduleRef: any =
              mod.moduleRef && typeof mod.moduleRef === "object"
                ? mod.moduleRef
                : null;

            const hasContent = !!(
              moduleRef?.content &&
              Object.keys(moduleRef.content || {}).length > 0
            );

            const moduleData = {
              name: mod.name,
              moduleId: moduleRef?._id || null,
              level: moduleRef?.level || null,
              hasContent,
            };

            if (!groupedModules[moduleName]) groupedModules[moduleName] = [];
            groupedModules[moduleName].push(moduleData);
          });
        }

        return {
          _id: test._id,
          testName: test.testName,
          language: test.language,
          duration: test.duration,
          price: test.price,
          modules: groupedModules,
        };
      })
    );

    return results;
  } catch (err) {
    console.error("fetchTestWithModules error:", err);
    throw err;
  }
}

   async fetchSingleTestInstruction(id: string, userId?: string) {
    try {
      // validate test id
      if (!id || !Types.ObjectId.isValid(id)) {
        throw new NotFoundException("Invalid test id");
      }
      const testObjectId = new Types.ObjectId(id);

      // 1) fetch basic test info
      const test = await this.CourseTestModel.findById(testObjectId)
        .select("testName language duration price")
        .lean();
      if (!test) throw new NotFoundException("Test not found!");

      // 2) get testDetails (modules array)
      const testDetails = await this.CourseTestDetailsModel.findOne({
        testId: testObjectId,
      })
        .select("modules")
        .lean();

      // 3) totalLevels (CourseModule documents referencing testDetails)
      let totalLevels = 0;
      if (testDetails && testDetails._id) {
        totalLevels = await this.CourseModuleModel.countDocuments({
          testDetailsId: testDetails._id,
        });
      }

      // 4) totalSections = distinct module names
      const modulesArray = Array.isArray(testDetails?.modules)
        ? testDetails.modules
        : [];
      const uniqueNames = new Set(
        modulesArray
          .map((m) => (m?.name || "").toString().trim().toLowerCase())
          .filter(Boolean)
      );

      const sectionMap = new Map<string, string>();
      modulesArray.forEach((m) => {
        const raw = (m?.name || '').toString().trim();
        if (!raw) return;
        const key = raw.toLowerCase();
        if (!sectionMap.has(key)) sectionMap.set(key, raw);
      });
      const sections = Array.from(sectionMap.values()); 

      const totalSections = sections.length;

      // 5) optional: attempts info for a specific user
      let attemptsGiven = 0;
      let maxAttempts = 2; // default from schema
      let attemptsLeft: number | null = null;
      let assignmentId: string | null = null;

      if (userId && Types.ObjectId.isValid(userId)) {
        const userObjId = new Types.ObjectId(userId);

        // NOTE: give TypeScript a clear shape for the assignment returned
        const assignment = await this.UserAssignmentModel.findOne({
          userId: userObjId,
          testId: testObjectId,
        })
          .select("attempts maxAttempts _id")
          .lean<{ attempts?: number; maxAttempts?: number; _id?: any }>();

        if (assignment) {
          attemptsGiven =
            typeof assignment.attempts === "number" ? assignment.attempts : 0;
          maxAttempts =
            typeof assignment.maxAttempts === "number"
              ? assignment.maxAttempts
              : maxAttempts;
          assignmentId = assignment._id?.toString?.() ?? null;
        } else {
          // if no assignment doc exists, keep defaults (attemptsGiven=0, maxAttempts=2)
        }

        attemptsLeft = Math.max(0, maxAttempts - attemptsGiven);
      }

      // 6) return combined data
      const result: any = {
        message: "Test instruction data",
        test: {
          _id: test._id,
          testName: test.testName,
          language: test.language,
          duration: test.duration,
          price: test.price || 0,
          totalSections,
          sections,
          totalLevels,
        },
      };

      if (attemptsLeft !== null) {
        result.test.attemptsInfo = {
          attemptsGiven,
          maxAttempts,
          attemptsLeft,
          assignmentId,
        };
      }

      return result;
    } catch (err) {
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
        module: moduleData
      },
    };
  } catch (err) {
    console.error("❌ Error in createTestDetails:", err);
    throw new Error("Failed to create or update test details");
  }
}


 async recordExamAttempt(testId: string, userId: string) {
    try {
      if (!Types.ObjectId.isValid(testId) || !Types.ObjectId.isValid(userId)) {
        throw new NotFoundException('Invalid test or user ID');
      }

      const testObjectId = new Types.ObjectId(testId);
      const userObjectId = new Types.ObjectId(userId);

      // Fetch test info
      const test = await this.CourseTestModel.findById(testObjectId)
        .select('testName duration price language')
        .lean();
      if (!test) throw new NotFoundException('Test not found!');

      // Find existing assignment (document)
      let assignment = await this.UserAssignmentModel.findOne({
        userId: userObjectId,
        testId: testObjectId,
      }).exec();

      if (!assignment) {
        // Create new assignment with first attempt consumed
        assignment = await this.UserAssignmentModel.create({
          userId: userObjectId,
          testId: testObjectId,
          attempts: 1,
          maxAttempts: 2,
          status: 'active',
        });
      } else {
        // Check attempt limit
        const currentAttempts = typeof assignment.attempts === 'number' ? assignment.attempts : 0;
        const maxAttempts = typeof assignment.maxAttempts === 'number' ? assignment.maxAttempts : 2;

        if (currentAttempts >= maxAttempts) {
          // No attempts left
          return {
            success: false,
            message: 'No attempts left for this test.',
            data: {
              attemptsInfo: {
                attemptsGiven: currentAttempts,
                maxAttempts,
                attemptsLeft: 0,
                assignmentId: assignment._id,
              },
              duration: test.duration,
            },
          };
        }

        // increment and save
        assignment.attempts = currentAttempts + 1;
       if (assignment.attempts >= 2) {
          assignment.status = 'completed';
        } else {
          assignment.status = 'active';
        }
        await assignment.save();
      }

      // Compute attempts info to return
      const attemptsGiven = assignment.attempts;
      const maxAttempts = assignment.maxAttempts;
      const attemptsLeft = Math.max(0, maxAttempts - attemptsGiven);

      return {
        success: true,
        message: 'Exam attempt recorded successfully!',
        data: {
          attemptsInfo: {
            attemptsGiven,
            maxAttempts,
            attemptsLeft,
            assignmentId: assignment._id,
          },
          test: {
            _id: test._id,
            testName: test.testName,
            language: test.language,
            duration: test.duration,
            price: test.price || 0,
          },
        },
      };
    } catch (err) {
      console.error('❌ Error in recordExamAttempt:', err);
      throw err;
    }
  }






  async fetchSingleTest(id: string, module?: string) {
  try {
    const testObjectId = new Types.ObjectId(id);

    // 1) main test
    const test = await this.CourseTestModel.findById(testObjectId).lean();
    if (!test) throw new NotFoundException("Test not found!");

    // 2) test details
    const testDetails = await this.CourseTestDetailsModel.findOne({
      testId: testObjectId,
    })
      .populate("modules.moduleRef")
      .lean();

    if (!testDetails)
      return { ...test, modules: {}, message: "No test details found yet" };

    // 3) filter modules by name if requested
    const filteredModules = module
      ? testDetails.modules.filter((m) => m.name.toLowerCase() === module.toLowerCase())
      : testDetails.modules;

    // global flat map (questionKey -> id)
    const globalQuestionIdMap: Record<string, string> = {};

    // helper to produce deterministic id when _qid missing:
    const makeDeterministicId = (moduleId: any, path: string) => {
      // keep it short and predictable: <moduleId>_<path>
      try {
        return `${String(moduleId)}_${path.replace(/\W+/g, '_')}`;
      } catch {
        return new Types.ObjectId().toString();
      }
    };

    // helper to traverse content, add questionId in-place into cloned object, and populate map
    const attachIdsAndMap = (content: any, moduleId: any, prefix = '') => {
      if (content === null || content === undefined) return content;
      // deep clone to avoid modifying DB object
      const cloned = JSON.parse(JSON.stringify(content));

      const traverse = (node: any, pathBase: string) => {
        if (node === null || node === undefined) return;

        if (Array.isArray(node)) {
          node.forEach((item, idx) => traverse(item, `${pathBase}[${idx}]`));
          return;
        }

        if (typeof node === 'object') {
          // if node has _qid use it; otherwise build deterministic id
          const existing = node._qid ?? node._id ?? node.id ?? null;
          const qid = existing ? String(existing) : makeDeterministicId(moduleId, pathBase || 'root');
          // attach questionId field for the response object (do NOT modify DB)
          node.questionId = qid;
          // store into flat map with a friendly key
          const friendlyKey = (pathBase || 'root').replace(/[\[\].]/g, '_').replace(/^_+|_+$/g, '');
          const mapKey = friendlyKey || 'root';
          globalQuestionIdMap[mapKey] = qid;

          // continue into nested properties
          for (const k of Object.keys(node)) {
            if (typeof node[k] === 'object') {
              traverse(node[k], pathBase ? `${pathBase}.${k}` : k);
            }
          }
        }
      };

      traverse(cloned, prefix || '');
      return cloned;
    };

    const modulesWithDetails = await Promise.all(
      filteredModules.map(async (m) => {
        if (!m.moduleRef) return null;
        const moduleData = await this.CourseModuleModel.findById(m.moduleRef).lean();
        if (!moduleData) return null;

        const contentWithIds = attachIdsAndMap(moduleData.content ?? {}, moduleData._id ?? m.moduleRef, m.name);

        const moduleQuestionIdMap: Record<string, string> = {};
        Object.entries(globalQuestionIdMap).forEach(([k, v]) => {
          if (k.startsWith(m.name.replace(/\W+/g, '_'))) {
            moduleQuestionIdMap[k] = v;
          } else {
            moduleQuestionIdMap[k] = v;
          }
        });

        return {
          name: m.name,
          level: moduleData.level,
          content: contentWithIds,
          // questionIdMap: moduleQuestionIdMap,
        };
      })
    );

    const structured = modulesWithDetails.reduce((acc, mod) => {
      if (!mod) return acc;
      acc[`level_${mod.level}`] = {
        module: mod.name,
        content: mod.content,

      };
      return acc;
    }, {} as Record<string, { module: string; content: any;  }>);

    // 6) Return response (includes global questionIdMap for quick lookup)
    return {
      ...test,
      testId: testObjectId,
      modules: structured,

    };
  } catch (err) {
    console.error("❌ Error in fetchSingleTest:", err);
    throw err;
  }
}



async handleSubmission(payload: any, userId: string) {
  // basic validation
  if (!payload) throw new BadRequestException('Missing payload');
  if (!payload.testId) throw new BadRequestException('Missing testId in payload');
  if (!userId) throw new BadRequestException('Missing userId');

  // prepare doc
  const doc = {
    testId: String(payload.testId),
    userId: String(userId),
    submittedAt: payload.submittedAt ? new Date(payload.submittedAt) : new Date(),
    rawPayload: payload,
    // keep these for compatibility with existing schema fields
    perQuestion: [],         // left empty for now
    totalPoints: 0,
    maxPoints: 0,
    perModuleSummary: {},
    status: 'pending' as 'pending', // default since no grading done
  };

  // persist
  const created = await this.CourseTestResultModel.create(doc);

  // return a concise summary
  return {
    resultId: created._id,
    testId: created.testId,
    userId: created.userId,
    submittedAt: created.submittedAt,
    status: created.status,
    rawPayloadSaved: true,
  };
}



}