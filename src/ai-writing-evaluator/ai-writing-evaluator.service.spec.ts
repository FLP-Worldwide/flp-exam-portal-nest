import { Test, TestingModule } from '@nestjs/testing';
import { AiWritingEvaluatorService } from './ai-writing-evaluator.service';

describe('AiWritingEvaluatorService', () => {
  let service: AiWritingEvaluatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiWritingEvaluatorService],
    }).compile();

    service = module.get<AiWritingEvaluatorService>(AiWritingEvaluatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
