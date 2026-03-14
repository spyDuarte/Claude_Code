import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ClassifierResponseSchema } from '@plantao-radar/shared';
import type { ClassifierResponse } from '@plantao-radar/shared';
import type { IClassifierService, ClassifyInput } from './interfaces/classifier.interface';
import { FallbackClassifierService } from './fallback-classifier.service';

@Injectable()
export class AnthropicClassifierService implements IClassifierService {
  private readonly logger = new Logger(AnthropicClassifierService.name);
  private client: Anthropic;
  private model: string;

  constructor(
    private config: ConfigService,
    private fallback: FallbackClassifierService,
  ) {
    const apiKey = this.config.get<string>('anthropic.apiKey');
    this.model = this.config.get<string>('anthropic.model') ?? 'claude-opus-4-6';
    this.client = new Anthropic({ apiKey: apiKey ?? 'not-configured' });
  }

  async classify(input: ClassifyInput): Promise<ClassifierResponse> {
    if (!this.config.get<string>('anthropic.apiKey')) {
      this.logger.warn('Anthropic API key not configured — using fallback classifier');
      return this.fallback.classify(input);
    }

    try {
      return await this.callAnthropic(input);
    } catch (err) {
      this.logger.error('Anthropic classifier failed, using fallback', err);
      return this.fallback.classify(input);
    }
  }

  private async callAnthropic(input: ClassifyInput): Promise<ClassifierResponse> {
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

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Empty response from Anthropic');
    }

    const parsed = JSON.parse(textBlock.text) as unknown;
    const validated = ClassifierResponseSchema.parse(parsed);
    return validated;
  }
}
