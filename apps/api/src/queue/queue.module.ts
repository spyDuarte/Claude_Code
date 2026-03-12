import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';

@Module({
  providers: [
    QueueService,
    {
      provide: 'REDIS_CONFIG',
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('redis.url') ?? 'redis://localhost:6379',
        },
      }),
      inject: [ConfigService],
    },
  ],
  exports: [QueueService],
})
export class QueueModule {}
