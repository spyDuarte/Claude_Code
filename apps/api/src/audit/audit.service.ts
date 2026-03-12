import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditLog } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: string,
    eventType: string,
    entityType: string | null,
    entityId: string | null,
    payload: Record<string, unknown>,
  ): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        userId,
        eventType,
        entityType,
        entityId,
        payload,
      },
    });
  }

  async findByUser(
    userId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: { userId } }),
    ]);

    return { data, total, page, limit };
  }
}
