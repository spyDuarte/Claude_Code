import { Injectable } from '@nestjs/common';
import { RecommendedAction } from '@plantao-radar/shared';
import type { ClassifierResponse } from '@plantao-radar/shared';
import type { IClassifierService, ClassifyInput } from './interfaces/classifier.interface';

/**
 * Rule-based fallback classifier.
 * Used when OpenAI is unavailable or not configured.
 * Never throws — always returns a valid ClassifierResponse.
 */
@Injectable()
export class FallbackClassifierService implements IClassifierService {
  async classify(input: ClassifyInput): Promise<ClassifierResponse> {
    const { parsedContext, userFilter } = input;

    if (!parsedContext.possibleShiftOffer) {
      return {
        score: 0,
        compatible: false,
        shortReason: 'Not a shift opportunity (fallback rule)',
        urgency: 'low',
        recommendedAction: RecommendedAction.IGNORE,
        suggestedReply: null,
      };
    }

    let score = 0.4; // base score for any shift opportunity
    const matchedFactors: string[] = [];

    // Specialty match
    if (
      parsedContext.extractedSpecialty &&
      userFilter.specialty &&
      parsedContext.extractedSpecialty
        .toLowerCase()
        .includes(userFilter.specialty.toLowerCase().split(' ')[0] ?? '')
    ) {
      score += 0.2;
      matchedFactors.push('specialty');
    }

    // City match
    if (
      parsedContext.extractedCity &&
      userFilter.cities.some((c) =>
        parsedContext.extractedCity!.toLowerCase().includes(c.toLowerCase()),
      )
    ) {
      score += 0.15;
      matchedFactors.push('city');
    }

    // Hospital match
    if (
      parsedContext.extractedHospital &&
      userFilter.hospitals.some((h) =>
        parsedContext.extractedHospital!.toLowerCase().includes(h.toLowerCase()),
      )
    ) {
      score += 0.1;
      matchedFactors.push('hospital');
    }

    // Value match
    if (
      parsedContext.extractedValue &&
      userFilter.minValue &&
      parsedContext.extractedValue >= userFilter.minValue
    ) {
      score += 0.1;
      matchedFactors.push('value');
    }

    // Shift type match
    if (
      parsedContext.extractedShift &&
      userFilter.acceptedShifts.includes(parsedContext.extractedShift)
    ) {
      score += 0.05;
      matchedFactors.push('shiftType');
    }

    score = Math.min(score, 0.79); // fallback never exceeds 0.79 (below auto threshold)

    const compatible = score >= 0.4;
    const shortReason =
      matchedFactors.length > 0
        ? `Fallback: matched ${matchedFactors.join(', ')}`
        : 'Fallback: possible shift but no profile match confirmed';

    let recommendedAction = RecommendedAction.IGNORE;
    if (score >= userFilter.semiAutoThreshold) {
      recommendedAction = RecommendedAction.QUEUE_REVIEW;
    }

    return {
      score,
      compatible,
      shortReason,
      extractedLocation: parsedContext.extractedCity ?? null,
      extractedHospital: parsedContext.extractedHospital ?? null,
      extractedShiftType: (parsedContext.extractedShift as ClassifierResponse['extractedShiftType']) ?? null,
      extractedDate: parsedContext.extractedDate ?? null,
      extractedValue: parsedContext.extractedValue ?? null,
      urgency: score > 0.6 ? 'high' : score > 0.4 ? 'medium' : 'low',
      recommendedAction,
      suggestedReply: userFilter.replyTemplate ?? null,
    };
  }
}
