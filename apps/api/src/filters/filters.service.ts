import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditEventType } from '@plantao-radar/shared';
import type { UpsertFilterDto } from './dto/upsert-filter.dto';

@Injectable()
export class FiltersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getFilter(userId: string) {
    return this.prisma.userFilter.findUnique({ where: { userId } });
  }

  async upsertFilter(userId: string, dto: UpsertFilterDto) {
    const filter = await this.prisma.userFilter.upsert({
      where: { userId },
      update: {
        specialty: dto.specialty,
        cities: dto.cities,
        hospitals: dto.hospitals,
        minValue: dto.minValue ?? null,
        maxDistanceKm: dto.maxDistanceKm ?? null,
        acceptedShifts: dto.acceptedShifts,
        requiredKeywords: dto.requiredKeywords,
        blockedKeywords: dto.blockedKeywords,
        autoReplyMode: dto.autoReplyMode,
        autoReplyThreshold: dto.autoReplyThreshold,
        semiAutoThreshold: dto.semiAutoThreshold,
        replyTemplate: dto.replyTemplate ?? null,
      },
      create: {
        userId,
        specialty: dto.specialty,
        cities: dto.cities,
        hospitals: dto.hospitals,
        minValue: dto.minValue ?? null,
        maxDistanceKm: dto.maxDistanceKm ?? null,
        acceptedShifts: dto.acceptedShifts,
        requiredKeywords: dto.requiredKeywords,
        blockedKeywords: dto.blockedKeywords,
        autoReplyMode: dto.autoReplyMode,
        autoReplyThreshold: dto.autoReplyThreshold,
        semiAutoThreshold: dto.semiAutoThreshold,
        replyTemplate: dto.replyTemplate ?? null,
      },
    });

    await this.auditService.log(userId, AuditEventType.FILTER_UPDATED, 'UserFilter', filter.id, {
      specialty: dto.specialty,
    });

    return filter;
  }
}
