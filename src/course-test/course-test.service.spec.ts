import { Test, TestingModule } from '@nestjs/testing';
import { CourseTestService } from './course-test.service';

describe('CourseTestService', () => {
  let service: CourseTestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseTestService],
    }).compile();

    service = module.get<CourseTestService>(CourseTestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
