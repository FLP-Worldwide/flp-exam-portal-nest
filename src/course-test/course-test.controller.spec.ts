import { Test, TestingModule } from '@nestjs/testing';
import { CourseTestController } from './course-test.controller';

describe('CourseTestController', () => {
  let controller: CourseTestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseTestController],
    }).compile();

    controller = module.get<CourseTestController>(CourseTestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
