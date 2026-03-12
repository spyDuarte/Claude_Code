import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ClassifierResponseSchema, RecommendedAction } from '@plantao-radar/shared';
import type { ClassifierResponse } from '@plantao-radar/shared';
import type { IClassifierService, ClassifyInput } from './interfaces/classifier.interface';
import { FallbackClassifierService } from './fallback-classifier.service';

@Injectable()
export class OpenAiClassifierService implements IClassifierService {
  private readonly logger = new Logger(OpenAiClassifierService.name);
  private openai: OpenAI;
  private model: string;

  constructor(
    private config: ConfigService,
    private fallback: FallbackClassifierService,
  ) {
    const apiKey = this.config.get<string>('openai.apiKey');
    this.model = this.config.get<string>('openai.model') ?? 'gpt-4o-mini';

    this.openai = new OpenAI({ apiKey: apiKey ?? 'not-configured' });
  }

  async classify(input: ClassifyInput): Promise<ClassifierResponse> {
    if (!this.config.get<string>('openai.apiKey')) {
      this.logger.warn('OpenAI API key not configured — using fallback classifier');
      return this.fallback.classify(input);
    }

    try {
      return await this.callOpenAi(input);
    } catch (err) {
      this.logger.error('OpenAI classifier failed, using fallback', err);
      return this.fallback.classify(input);
    }
  }

  private async callOpenAi(input: ClassifyInput): Promise<ClassifierResponse> {
    const { messageText, userFilter, parsedContext } = input;

    const systemPrompt = `You are a medical shift opportunity classifier for Brazilian doctors.
Your job is to determine if a WhatsApp message describes a shift opportunity compatible with the doctor's profile.

RESPOND ONLY WITH A VALID JSON OBJECT matching the exact schema. No markdown, no explanation, only JSON.

Schema:
{
  "score": <float 0.0-1.0>,
  "compatible": <boolean>,
  "shortReason": <string max 200 chars>,
  "extractedLocation": <string|null>,
  "extractedHospital": <string|null>,
  "extractedShiftType": <"DIURNO"|"NOTURNO"|"DIARISTA"|"SOBREAVISO"|"PLANTAO_12H"|"PLANTAO_24H"|null>,
  "extractedDate": <string|null>,
  "extractedValue": <number|null>,
  "urgency": <"low"|"medium"|"high">,
  "recommendedAction": <"AUTO_REPLY"|"QUEUE_REVIEW"|"IGNORE">,
  "suggestedReply": <string|null>
}`;

    const userPrompt = `DOCTOR PROFILE:
- Specialty: ${userFilter.specialty}
- Accepted cities: ${userFilter.cities.join(', ') || 'any'}
- Preferred hospitals: ${userFilter.hospitals.join(', ') || 'any'}
- Minimum value: ${userFilter.minValue ? `R$ ${userFilter.minValue}` : 'not specified'}
- Accepted shift types: ${userFilter.acceptedShifts.join(', ') || 'any'}
- Required keywords: ${userFilter.requiredKeywords.join(', ') || 'none'}
- Blocked keywords: ${userFilter.blockedKeywords.join(', ') || 'none'}
- Reply template: ${userFilter.replyTemplate ?? 'none'}

ALREADY PARSED CONTEXT:
- Possible shift offer: ${parsedContext.possibleShiftOffer}
- Extracted city: ${parsedContext.extractedCity ?? 'unknown'}
- Extracted hospital: ${parsedContext.extractedHospital ?? 'unknown'}
- Extracted value: ${parsedContext.extractedValue ? `R$ ${parsedContext.extractedValue}` : 'unknown'}
- Extracted shift type: ${parsedContext.extractedShift ?? 'unknown'}
- Extracted specialty: ${parsedContext.extractedSpecialty ?? 'unknown'}

MESSAGE:
"${messageText}"

Classify this message and return the JSON object.`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content) as unknown;
    const validated = ClassifierResponseSchema.parse(parsed);
    return validated;
  }
}
