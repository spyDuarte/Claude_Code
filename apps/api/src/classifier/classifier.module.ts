import { Module } from '@nestjs/common';
import { OpenAiClassifierService } from './openai-classifier.service';
import { FallbackClassifierService } from './fallback-classifier.service';
import { CLASSIFIER_SERVICE } from './interfaces/classifier.interface';

@Module({
  providers: [
    FallbackClassifierService,
    OpenAiClassifierService,
    {
      provide: CLASSIFIER_SERVICE,
      useClass: OpenAiClassifierService,
    },
  ],
  exports: [CLASSIFIER_SERVICE, FallbackClassifierService],
})
export class ClassifierModule {}
