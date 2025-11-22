import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

type EvaluateWritingParams = {
  title: string;
  body: string;
  instruction?: string;
  answer: string;
  language?: string;   // e.g. "German"
  maxPoints: number;   // e.g. 5
};

@Injectable()
export class AiWritingEvaluatorService {
  private readonly logger = new Logger(AiWritingEvaluatorService.name);

  // Swap this client for Gemini / other LLM if you like
  private readonly client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  async evaluateWriting({
    title,
    body,
    instruction,
    answer,
    language = 'German',
    maxPoints,
  }: EvaluateWritingParams): Promise<{ score: number; feedback: string, suggestion: string }> {
    const systemPrompt = `
You are a strict but fair examiner for a ${language} B1 writing exam.

Given the task description and a student's answer, you must:
- Evaluate ONLY how well the answer matches the task (relevance + coherence)
- Consider grammar and vocabulary, but don't be extremely harsh
- Score from 0 to ${maxPoints}, where:
  0 = totally irrelevant / empty,
  ${maxPoints} = excellent and fully relevant.

Respond ONLY as valid JSON with:
{
  "score": number,   // 0 to ${maxPoints}
  "feedback": string // short feedback (2–3 sentences, English, also metion that what other we can write in question.)
  "suggestion":string // suggested text (4-5 sentences, English.)
}
`.trim();

    const userPrompt = `
Task title: ${title}

Task description:
${body}

Extra instructions:
${instruction || 'None'}

Student answer:
${answer}
`.trim();

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini', // or any other model you prefer
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {};
      }

      let score = Number(parsed.score);
      if (Number.isNaN(score)) score = 0;
      if (score < 0) score = 0;
      if (score > maxPoints) score = maxPoints;

      const feedback = String(parsed.feedback || '');
      const suggestion = String(parsed.suggestion || '');

      return { score, feedback,suggestion };
    } catch (err) {
      this.logger.error('LLM evaluation failed, using fallback score', err);
      // fallback: half of max points, no negative marking
      const fallback = Math.round(maxPoints / 2);
      return {
        score: fallback,
        feedback: 'Automatic evaluation failed, fallback score assigned.',
        suggestion: 'Automatic evaluation failed, fallback score assigned.',
      };
    }
  }
}
