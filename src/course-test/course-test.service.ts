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
import { AiWritingEvaluatorService } from "../ai-writing-evaluator/ai-writing-evaluator.service";


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
    private readonly CourseTestResultModel: Model<CourseTestResultDocument>,

    private readonly aiWritingEvaluator: AiWritingEvaluatorService,
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

async getResult(userId: string, testId: string) {
  if (!userId) {
    throw new BadRequestException('Missing userId');
  }
  if (!testId) {
    throw new BadRequestException('Missing testId');
  }

  if (!Types.ObjectId.isValid(userId)) {
    throw new BadRequestException('Invalid userId');
  }
  if (!Types.ObjectId.isValid(testId)) {
    throw new BadRequestException('Invalid testId');
  }

  const userObjectId = new Types.ObjectId(userId);
  const testObjectId = new Types.ObjectId(testId);

  // 1) latest result
  const result = await this.CourseTestResultModel.findOne({
    userId: userObjectId,
    testId: testObjectId,
  })
    .sort({ submittedAt: -1 })
    .lean();

  if (!result) {
    throw new NotFoundException('No result found for this test and user');
  }

  // 2) test info
  const test = await this.CourseTestModel.findById(testObjectId).lean();

  // 3) build questionText map for this test
  const questionTextMap = await this.buildQuestionTextMap(testObjectId.toString());

  // 4) enrich perQuestion with questionText
const perQuestionWithText = (result.perQuestion || []).map((q: any) => {
  const qid = String(q.questionId);
  const baseText = questionTextMap.get(qid) || null;

  let questionText = baseText;
  let blankIndex: number | null = null;

  // Detect level 4 & 5 blanks: level_4_p0_blanks_0_, level_5_p0_blanks_3_, ...
  const m = qid.match(/^level_(4|5)_p0_blanks_(\d+)_$/);
  if (m) {
    blankIndex = Number(m[2]); // 0,1,2,3,...

    // 👉 Show full paragraph text ONLY for the first blank (index 0)
    // For other blanks, questionText = null so UI can group them under the same paragraph.
    if (blankIndex > 0) {
      questionText = null;
    }
  }

  return {
    ...q,
    questionText,                     // paragraph text or null for extra blanks
    ...(blankIndex !== null ? { blankIndex } : {}), // extra info for UI
  };
});


  const totalPoints: number = result.totalPoints ?? 0;
  const maxPoints: number = result.maxPoints ?? 0;
  const percentage =
    maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  return {
    test: test
      ? {
          id: String(test._id),
          testName: test.testName,
          language: test.language,
          duration: test.duration,
          price: test.price,
        }
      : null,

    resultId: String(result._id),
    testId: String(result.testId),
    userId: String(result.userId),
    submittedAt: result.submittedAt,
    status: result.status,

    totalPoints,
    maxPoints,
    percentage,

    perModuleSummary: result.perModuleSummary || {},

    // ⬇️ now each item has questionText
    perQuestion: perQuestionWithText,

  };
}
/**
 * Build a map questionId -> questionText (for review screen).
 * Reuses the same questionId patterns used in grading.
 */
private async buildQuestionTextMap(testId: string) {
  const details = await this.CourseTestDetailsModel
    .findOne({ testId: new Types.ObjectId(testId) })
    .populate('modules.moduleRef')
    .lean();

  const map = new Map<string, string>();

  if (!details || !Array.isArray(details.modules)) {
    return map;
  }

  for (const m of details.modules) {
    const modDoc: any = m.moduleRef;
    if (!modDoc || !modDoc.content) continue;

    const level = String(modDoc.level); // "1", "2", "3", "4", "5", or "Deutschprüfung B1"
    const c: any = modDoc.content;
    const moduleId = modDoc._id.toString();

    // ---------- AUDIO ----------
    if (c.media && Array.isArray(c.questions)) {
      c.questions.forEach((q: any, index: number) => {
        if (!q) return;
        const key = `${moduleId}_audio_questions_${index}_`;
        const text = q.text || ''; // from your audio schema screenshot
        map.set(key, String(text));
      });
    }

    // ---------- READING LEVEL 1 ----------
    // each paragraph is a text; questionId = `${moduleId}_reading_paragraphs_${pIndex}_`
    if (level === '1' && Array.isArray(c.paragraphs)) {
      c.paragraphs.forEach((p: any, pIndex: number) => {
        if (!p) return;
        const key = `${moduleId}_reading_paragraphs_${pIndex}_`;
        const text = p.paragraph || '';
        map.set(key, String(text));
      });
    }

    // ---------- READING LEVEL 2 ----------
    // paragraphs[0].questions[i].question; id = `${moduleId}_reading_paragraphs_0_questions_${i}_`
    if (
      level === '2' &&
      Array.isArray(c.paragraphs) &&
      c.paragraphs[0] &&
      Array.isArray(c.paragraphs[0].questions)
    ) {
      const questions = c.paragraphs[0].questions;
      questions.forEach((q: any, qIndex: number) => {
        if (!q) return;
        const key = `${moduleId}_reading_paragraphs_0_questions_${qIndex}_`;
        const text = q.question || '';
        map.set(key, String(text));
      });
    }

    // ---------- READING LEVEL 4 ----------
    // blanks in one paragraph – we show full paragraph text for each blank
    if (
      level === '4' &&
      Array.isArray(c.paragraphs) &&
      c.paragraphs[0] &&
      Array.isArray(c.paragraphs[0].blanks)
    ) {
      const paragraphText = c.paragraphs[0].paragraph || '';
      c.paragraphs[0].blanks.forEach((_b: any, bIndex: number) => {
        const key = `level_4_p0_blanks_${bIndex}_`;
        map.set(key, String(paragraphText));
      });
    }

    // ---------- READING LEVEL 5 ----------
    // similar: one paragraph with blanks[]
    if (
      level === '5' &&
      Array.isArray(c.paragraphs) &&
      c.paragraphs[0] &&
      Array.isArray(c.paragraphs[0].blanks)
    ) {
      const paragraphText = c.paragraphs[0].paragraph || '';
      (c.paragraphs[0].blanks as string[]).forEach((_ans: any, bIndex: number) => {
        const key = `level_5_p0_blanks_${bIndex}_`;
        map.set(key, String(paragraphText));
      });
    }

    // ---------- WRITING TASKS ----------
    // questionId stored directly in content.task_a / task_b
    if (c.task_a && c.task_a.questionId) {
      const qid = String(c.task_a.questionId);
      const text =
        `${c.task_a.title || ''}\n\n${c.task_a.body || ''}`.trim();
      map.set(qid, text);
    }
    if (c.task_b && c.task_b.questionId) {
      const qid = String(c.task_b.questionId);
      const text =
        `${c.task_b.title || ''}\n\n${c.task_b.body || ''}`.trim();
      map.set(qid, text);
    }
  }

  return map;
}






async handleSubmission(payload: any, userId: string) {
  if (!payload) throw new BadRequestException('Missing payload');
  if (!payload.testId) throw new BadRequestException('Missing testId in payload');
  if (!userId) throw new BadRequestException('Missing userId');

  const testId = String(payload.testId);
  const user = String(userId);

  // 1) Get correct answers for AUDIO & READING from DB
  const { audioMap }   = await this.buildAudioQuestionMap(testId);
  const { readingMap } = await this.buildReadingQuestionMap(testId);
  const { writingMap, defaultWritingPoints } = await this.buildWritingQuestionMap(testId);

  type PerQuestionItem = {
    questionId: string;
    answerSubmitted: any;
    correctAnswer: any | null;
    isCorrect: boolean | null;  // null = not auto-graded
    points: number;       
    feedback?: string | null;
    suggestion?: string | null;      // marks earned for that question
  };

  const perQuestion: PerQuestionItem[] = [];

  const perModuleSummary: Record<string, { points: number; maxPoints: number }> = {
    reading: { points: 0, maxPoints: 0 },
    audio:   { points: 0, maxPoints: 0 },
    writing: { points: 0, maxPoints: 0 },
  };

  let totalPoints = 0;
  let maxPoints = 0;

  // ---------- helpers ----------

  // normalize for string comparison (handles ["um"] etc.)
  const normalize = (val: any): string => {
    if (val == null) return '';

    let s = String(val).trim();

    // handle stringified JSON arrays like '["um"]'
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) {
          s = arr.join(','); // in your case it's single item, so "um"
        }
      } catch (_) {
        // ignore JSON parse error, fall back to raw string
      }
    }

    return s.toLowerCase().replace(/\s+/g, ' ');
  };

  // READING: auto-grade if we have a correct answer in readingMap
  const pushReadingAnswer = (questionId: string, submitted: any) => {
    if (!questionId) return;

    const qid = String(questionId);
    const correct = readingMap.get(qid) ?? null;

    let isCorrect: boolean | null = null;
    let pts = 0;

    if (correct != null) {
      const submittedNorm = normalize(submitted);
      const correctNorm   = normalize(correct);
      isCorrect = submittedNorm === correctNorm;
      pts = isCorrect ? 1 : 0;              // 1 mark per reading question
    }

    perQuestion.push({
      questionId: qid,
      answerSubmitted: submitted,
      correctAnswer: correct,
      isCorrect,
      points: pts,
    });

    perModuleSummary.reading.maxPoints += 1;
    maxPoints += 1;

    if (pts > 0) {
      perModuleSummary.reading.points += pts;
      totalPoints += pts;
    }
  };

  // AUDIO: same as before (already working)
  const pushAudioAnswer = (questionId: string, submitted: any) => {
    if (!questionId) return;

    const qid = String(questionId);

    const correct = audioMap.has(qid)
      ? audioMap.get(qid)!
      : null;

    let isCorrect: boolean | null = null;
    let pts = 0;

    if (typeof correct === 'boolean') {
      const submittedBool = Boolean(submitted);
      isCorrect = submittedBool === correct;
      pts = isCorrect ? 1 : 0;
    }

    perQuestion.push({
      questionId: qid,
      answerSubmitted: submitted,
      correctAnswer: correct,
      isCorrect,
      points: pts,
    });

    perModuleSummary.audio.maxPoints += 1;
    maxPoints += 1;

    if (pts > 0) {
      perModuleSummary.audio.points += pts;
      totalPoints += pts;
    }
  };

  // WRITING: 5 marks per submitted task
// WRITING: each submitted task gets points from DB (default 5) – no correctness check
// WRITING: use LLM to score (0..maxPoints), no negative marks
const pushWritingAnswer = async (
  questionId: string,
  submitted: any,
  taskMeta: any | null,  // title/body/instruction
) => {
  if (!questionId) return;

  const qid = String(questionId);
  const maxPts = writingMap.get(qid) ?? defaultWritingPoints; // usually 5

  // call LLM to evaluate
  const { score, feedback, suggestion } = await this.aiWritingEvaluator.evaluateWriting({
    title: taskMeta?.title || '',
    body: taskMeta?.body || '',
    instruction: taskMeta?.instruction || '',
    answer: String(submitted || ''),
    language: 'German',
    maxPoints: maxPts,
  });

  const pts = Math.max(0, Math.min(maxPts, score));

  perQuestion.push({
    questionId: qid,
    answerSubmitted: submitted,
    correctAnswer: null,          // no single "correct" answer
    isCorrect: null,              // we’re scoring, not true/false
    points: pts,
    feedback,
    suggestion,
  });

  perModuleSummary.writing.maxPoints += maxPts;
  perModuleSummary.writing.points += pts;

  maxPoints += maxPts;
  totalPoints += pts;

  // OPTIONAL: if you want to store feedback per question somewhere,
  // extend the perQuestion type with `feedback?: string` and save it.
};



  // ---------- 2) READING answers from payload ----------

  const readingAnswers = payload.reading?.answers || {};

  Object.entries(readingAnswers).forEach(([levelKeyRaw, data]) => {
    const levelKey = String(levelKeyRaw).toLowerCase();

    // only level1, level2, level4, level5
    if (!['level1', 'level2', 'level4', 'level5'].includes(levelKey)) return;

    if (!data) return;

    // levels 1 & 2: flat object { qid: "answer" }
    if (!Array.isArray(data) && typeof data === 'object') {
      Object.entries(data as Record<string, any>).forEach(
        ([qid, value]) => pushReadingAnswer(qid, value),
      );
      return;
    }

    // levels 4 & 5: array of { id, value }
    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        if (!item) return;
        const qid = item.id ?? item.questionId;
        const value = item.value ?? item.answer;
        pushReadingAnswer(qid, value);
      });
    }
  });

  // ---------- 3) AUDIO answers ----------

  const audioArray = Array.isArray(payload.audio) ? payload.audio : [];
  audioArray.forEach((a: any) => {
    if (!a) return;
    pushAudioAnswer(a.questionId, a.answer);
  });

  const audioLevels = payload.levels?.audio || {};
  if (audioArray.length === 0 && audioLevels && typeof audioLevels === 'object') {
    Object.entries(audioLevels as Record<string, string>).forEach(
      ([qid, val]) => {
        const bool =
          typeof val === 'string'
            ? val.toLowerCase() === 'richtig'
            : Boolean(val);
        pushAudioAnswer(qid, bool);
      },
    );
  }

  // ---------- 4) WRITING answers ----------

 const writingAnswers = Array.isArray(payload.writing?.answers)
  ? payload.writing.answers
  : [];

// tasks meta comes from the payload snippet you showed
const writingTasksMeta =
  payload.reading?.answers?.writing?.tasks || {}; // A/B with body/title/subtitle

const findTaskMetaByQid = (qid: string) => {
  for (const key of Object.keys(writingTasksMeta)) {
    const t = writingTasksMeta[key];
    if (t?.qid === qid) return t;
  }
  return null;
};

// we need await here because LLM call is async
for (const w of writingAnswers) {
  if (!w) continue;
  if (!w.questionId) continue;
  if (w.answer == null || w.answer === '') continue;

  const taskMeta = findTaskMetaByQid(String(w.questionId));
  await pushWritingAnswer(w.questionId, w.answer, taskMeta);
}


  // ---------- 5) Decide status ----------

  const hasReading = perModuleSummary.reading.maxPoints > 0;
  const hasAudio   = perModuleSummary.audio.maxPoints > 0;
  const hasWriting = perModuleSummary.writing.maxPoints > 0;

  let status: 'graded' | 'partial' | 'pending' = 'pending';
  if (hasAudio || hasWriting || hasReading) {
    status = 'graded';
  }

  // ---------- 6) Build & save result document ----------

  const doc = {
    testId,
    userId: user,
    submittedAt: payload.submittedAt
      ? new Date(payload.submittedAt)
      : new Date(),
    rawPayload: payload,
    perQuestion,
    totalPoints,
    maxPoints,
    perModuleSummary,
    status,
  };

  const created = await this.CourseTestResultModel.create(doc);

  // ---------- 7) Response summary ----------

  const totalQuestions = perQuestion.length;

  const audioSummary   = perModuleSummary.audio   || { points: 0, maxPoints: 0 };
  const readingSummary = perModuleSummary.reading || { points: 0, maxPoints: 0 };
  const writingSummary = perModuleSummary.writing || { points: 0, maxPoints: 0 };

  return {
    resultId: created._id,
    testId: created.testId,
    userId: created.userId,
    submittedAt: created.submittedAt,
    status: created.status,

    totalQuestions,
    totalMarks: maxPoints,
    earnedMarks: totalPoints,

    audio: {
      totalQuestions: audioSummary.maxPoints,
      maxPoints: audioSummary.maxPoints,
      earnedPoints: audioSummary.points,
    },

    reading: {
      totalQuestions: readingSummary.maxPoints,
      maxPoints: readingSummary.maxPoints,
      earnedPoints: readingSummary.points,
    },

    writing: {
      totalQuestions: writingSummary.maxPoints,
      maxPoints: writingSummary.maxPoints,
      earnedPoints: writingSummary.points,
    },

    perModuleSummary: created.perModuleSummary,
    rawPayloadSaved: true,
  };
}


/**
 * Build a map of audio questionId -> correctAnswer (boolean)
 * questionId format: `${moduleId}_audio_questions_${index}_`
 */
private async buildAudioQuestionMap(testId: string) {
  const details = await this.CourseTestDetailsModel
    .findOne({ testId: new Types.ObjectId(testId) })
    .populate('modules.moduleRef')
    .lean();

  const audioMap = new Map<string, boolean>();

  if (!details || !Array.isArray(details.modules)) {
    return { audioMap, totalAudioQuestions: 0 };
  }

  for (const m of details.modules) {
    const modDoc: any = m.moduleRef;
    if (!modDoc || !modDoc.content) continue;

    const c: any = modDoc.content;

    // detect audio module by media + questions[]
    if (c.media && Array.isArray(c.questions)) {
      const moduleId = modDoc._id.toString();

      c.questions.forEach((q: any, index: number) => {
        if (!q) return;

        // MUST match the pattern used in the frontend:
        // `${moduleId}_audio_questions_${index}_`
        const questionKey = `${moduleId}_audio_questions_${index}_`;

        audioMap.set(questionKey, Boolean(q.correctAnswer));
      });
    }
  }

  return { audioMap, totalAudioQuestions: audioMap.size };
}

/**
 * Build a map of reading questionId -> correctAnswer (string)
 * questionId format (levels 1–3):
 *   `${moduleId}_reading_paragraphs_${pIndex}_`
 *
 * Requires each paragraph to have either:
 *   - correctOptionIndex: number  (index into content.options[])
 *   - or correctQuestion: string  (the correct option text)
 */
private async buildReadingQuestionMap(testId: string) {
  const details = await this.CourseTestDetailsModel
    .findOne({ testId: new Types.ObjectId(testId) })
    .populate('modules.moduleRef')
    .lean();

  const readingMap = new Map<string, string>();

  if (!details || !Array.isArray(details.modules)) {
    return { readingMap };
  }

  for (const m of details.modules) {
    const modDoc: any = m.moduleRef;
    if (!modDoc || !modDoc.content) continue;

    const level = String(modDoc.level);  // "1", "2", "3", "4", "5"
    const c: any = modDoc.content;
    const moduleId = modDoc._id.toString();

    // -------- Level 1 --------
    // content.paragraphs[i].answer is the correct question text
    if (level === '1' && Array.isArray(c.paragraphs)) {
      c.paragraphs.forEach((p: any, pIndex: number) => {
        if (!p || p.answer == null) return;
        const key = `${moduleId}_reading_paragraphs_${pIndex}_`;
        readingMap.set(key, String(p.answer));
      });
    }

    // -------- Level 2 --------
    // content.paragraphs[0].questions[i].answer
    if (level === '2'
        && Array.isArray(c.paragraphs)
        && c.paragraphs[0]
        && Array.isArray(c.paragraphs[0].questions)) {

      const questions = c.paragraphs[0].questions;
      questions.forEach((q: any, qIndex: number) => {
        if (!q || q.answer == null) return;
        const key = `${moduleId}_reading_paragraphs_0_questions_${qIndex}_`;
        readingMap.set(key, String(q.answer));
      });
    }

    // -------- Level 3 --------
    // you said: "skip level3 because there is question mapping issue"
    // => we DO NOT add anything for level 3 on purpose

    // -------- Level 4 --------
    // content.paragraphs[0].blanks[i].answer
    if (level === '4'
        && Array.isArray(c.paragraphs)
        && c.paragraphs[0]
        && Array.isArray(c.paragraphs[0].blanks)) {

      const blanks = c.paragraphs[0].blanks;
      blanks.forEach((b: any, bIndex: number) => {
        if (!b) return;
        const ans = typeof b === 'string' ? b : b.answer;
        if (ans == null) return;

        // NOTE: question id here is like "level_4_p0_blanks_0_"
        const key = `level_4_p0_blanks_${bIndex}_`;
        readingMap.set(key, String(ans));
      });
    }

    // -------- Level 5 --------
    // content.paragraphs[0].blanks is ["um","und","Nach","bevor"]
    if (level === '5'
        && Array.isArray(c.paragraphs)
        && c.paragraphs[0]
        && Array.isArray(c.paragraphs[0].blanks)) {

      const blanks = c.paragraphs[0].blanks as string[];
      blanks.forEach((ans: any, bIndex: number) => {
        if (ans == null) return;
        const key = `level_5_p0_blanks_${bIndex}_`;
        readingMap.set(key, String(ans));
      });
    }
  }

  return { readingMap };
}




/**
 * Build a map of writing questionId -> points.
 *
 * Uses the writing CourseModule where:
 *   content.totalPoints = total marks for all tasks (e.g. 10)
 *   content.task_a.questionId / content.task_b.questionId ...
 *
 * Example document (from your screenshot):
 *   level: "Deutschprüfung B1"
 *   content: {
 *     totalPoints: 10,
 *     task_a: { questionId: "..._writing_task_a", ... },
 *     task_b: { questionId: "..._writing_task_b", ... }
 *   }
 */
private async buildWritingQuestionMap(testId: string) {
  const details = await this.CourseTestDetailsModel
    .findOne({ testId: new Types.ObjectId(testId) })
    .populate('modules.moduleRef')
    .lean();

  const writingMap = new Map<string, number>();

  // default if we can't read anything from DB
  let defaultWritingPoints = 5;

  if (!details || !Array.isArray(details.modules)) {
    return { writingMap, defaultWritingPoints };
  }

  for (const m of details.modules) {
    const modDoc: any = m.moduleRef;
    if (!modDoc || !modDoc.content) continue;

    const c: any = modDoc.content;

    // detect the writing module by presence of totalPoints + task_a/task_b
    const tasks: string[] = [];

    if (c.task_a && c.task_a.questionId) {
      tasks.push(String(c.task_a.questionId));
    }
    if (c.task_b && c.task_b.questionId) {
      tasks.push(String(c.task_b.questionId));
    }

    if (tasks.length === 0) continue;

    // if totalPoints is present, split evenly across tasks
    if (typeof c.totalPoints === 'number' && c.totalPoints > 0) {
      defaultWritingPoints = c.totalPoints / tasks.length;
    }

    tasks.forEach((qid) => {
      writingMap.set(qid, defaultWritingPoints);
    });

    // assuming there is only one writing module, we could break here
    // break;
  }

  return { writingMap, defaultWritingPoints };
}







}