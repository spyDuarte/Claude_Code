import type { ClassifierResponse, ParsedMessage, UserFilter } from '@plantao-radar/shared';

export interface ClassifyInput {
  messageText: string;
  normalizedText: string;
  userFilter: UserFilter;
  parsedContext: ParsedMessage;
}

export interface IClassifierService {
  classify(input: ClassifyInput): Promise<ClassifierResponse>;
}

export const CLASSIFIER_SERVICE = 'CLASSIFIER_SERVICE';
