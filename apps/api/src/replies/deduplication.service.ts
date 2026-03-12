import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DEDUPLICATION_TTL_SECONDS } from '@plantao-radar/shared';

/**
 * Redis-backed deduplication service.
 * Prevents sending duplicate replies to essentially the same shift opportunity.
 *
 * Key format: dedup:{userId}:{groupId}:{messageHash}
 * TTL: configurable (default 1 hour)
 */
@Injectable()
export class DeduplicationService implements OnModuleDestroy {
  private readonly logger = new Logger(DeduplicationService.name);
  private redis: Redis;
  private ttl: number;

  constructor(private config: ConfigService) {
    const redisUrl = this.config.get<string>('redis.url') ?? 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, { lazyConnect: true, enableOfflineQueue: false });
    this.ttl = DEDUPLICATION_TTL_SECONDS;

    this.redis.on('error', (err) => {
      this.logger.warn('Redis connection error (deduplication disabled):', err.message);
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Returns true if this message was already seen (duplicate).
   * Records the key on first encounter.
   */
  async isDuplicate(userId: string, groupId: string, messageHash: string): Promise<boolean> {
    const key = `dedup:${userId}:${groupId}:${messageHash}`;

    try {
      // SET NX (only set if not exists) with TTL
      const result = await this.redis.set(key, '1', 'EX', this.ttl, 'NX');
      // result is 'OK' if set (first time), null if already existed
      return result === null;
    } catch (err) {
      // Redis unavailable — treat as non-duplicate to avoid blocking the pipeline
      this.logger.warn('Dedup check failed (Redis unavailable), treating as non-duplicate');
      return false;
    }
  }

  /**
   * Manually mark a key as seen (e.g., for testing or manual override).
   */
  async markSeen(userId: string, groupId: string, messageHash: string): Promise<void> {
    const key = `dedup:${userId}:${groupId}:${messageHash}`;
    try {
      await this.redis.set(key, '1', 'EX', this.ttl);
    } catch {
      // Ignore
    }
  }

  /**
   * Clear a dedup key (e.g., for admin override or retry).
   */
  async clear(userId: string, groupId: string, messageHash: string): Promise<void> {
    const key = `dedup:${userId}:${groupId}:${messageHash}`;
    try {
      await this.redis.del(key);
    } catch {
      // Ignore
    }
  }
}
