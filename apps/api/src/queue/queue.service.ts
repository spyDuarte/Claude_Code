import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants';

interface MessageProcessingJob {
  userId: string;
  sessionId: string;
  normalizedMessage: Record<string, unknown>;
}

interface ReplySendJob {
  userId: string;
  outgoingMessageId: string;
  destinationRef: string;
  messageText: string;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private messageQueue: Queue<MessageProcessingJob> | null = null;
  private replyQueue: Queue<ReplySendJob> | null = null;
  private workers: Worker[] = [];

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const connection = this.getConnection();

    try {
      this.messageQueue = new Queue<MessageProcessingJob>(QUEUE_NAMES.MESSAGE_PROCESSING, {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      });

      this.replyQueue = new Queue<ReplySendJob>(QUEUE_NAMES.REPLY_SEND, {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      });

      this.logger.log('BullMQ queues initialized');
    } catch (err) {
      this.logger.warn('Failed to initialize BullMQ queues (Redis may be unavailable)', err);
    }
  }

  async onModuleDestroy() {
    await Promise.all([
      ...this.workers.map((w) => w.close()),
      this.messageQueue?.close(),
      this.replyQueue?.close(),
    ]);
  }

  async enqueueMessage(job: MessageProcessingJob): Promise<void> {
    if (!this.messageQueue) {
      this.logger.warn('Message queue not available');
      return;
    }
    await this.messageQueue.add('process', job);
  }

  async enqueueReply(job: ReplySendJob): Promise<void> {
    if (!this.replyQueue) {
      this.logger.warn('Reply queue not available');
      return;
    }
    await this.replyQueue.add('send', job);
  }

  async getQueueStats() {
    const [msgCounts, replyCounts] = await Promise.all([
      this.messageQueue?.getJobCounts() ?? {},
      this.replyQueue?.getJobCounts() ?? {},
    ]);

    return {
      messageProcessing: msgCounts,
      replySend: replyCounts,
    };
  }

  private getConnection() {
    const redisUrl = this.config.get<string>('redis.url') ?? 'redis://localhost:6379';
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
    };
  }
}
