import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnthropicClassifierService } from './anthropic-classifier.service';
import { OpenAiClassifierService } from './openai-classifier.service';
import { FallbackClassifierService } from './fallback-classifier.service';
import { CLASSIFIER_SERVICE } from './interfaces/classifier.interface';
import type { IClassifierService } from './interfaces/classifier.interface';

@Module({
  providers: [
    FallbackClassifierService,
    AnthropicClassifierService,
    OpenAiClassifierService,
    {
      provide: CLASSIFIER_SERVICE,
      useFactory: (
        config: ConfigService,
        anthropic: AnthropicClassifierService,
        openai: OpenAiClassifierService,
      ): IClassifierService => {
        const provider = config.get<string>('ai.provider') ?? 'anthropic';
        return provider === 'openai' ? openai : anthropic;
      },
      inject: [ConfigService, AnthropicClassifierService, OpenAiClassifierService],
    },
  ],
  exports: [CLASSIFIER_SERVICE, FallbackClassifierService],
})
export class ClassifierModule {}
