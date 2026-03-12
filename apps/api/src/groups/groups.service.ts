import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditEventType } from '@plantao-radar/shared';

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async listGroups(userId: string) {
    const session = await this.prisma.whatsAppSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      return [];
    }

    const groups = await this.prisma.group.findMany({
      where: { sessionId: session.id, isActive: true },
      include: {
        monitoredGroups: {
          where: { userId },
        },
      },
      orderBy: { groupName: 'asc' },
    });

    return groups.map((g) => ({
      id: g.id,
      externalGroupId: g.externalGroupId,
      groupName: g.groupName,
      isActive: g.isActive,
      lastSyncAt: g.lastSyncAt?.toISOString() ?? null,
      monitored: g.monitoredGroups.length > 0 && g.monitoredGroups[0]!.monitoringEnabled,
      priority: g.monitoredGroups[0]?.priority ?? 0,
    }));
  }

  async setMonitoring(
    userId: string,
    groupId: string,
    monitoringEnabled: boolean,
    priority = 0,
  ) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId },
      include: { session: true },
    });

    if (!group || group.session.userId !== userId) {
      throw new NotFoundException('Group not found');
    }

    const monitored = await this.prisma.monitoredGroup.upsert({
      where: { userId_groupId: { userId, groupId } },
      update: { monitoringEnabled, priority },
      create: { userId, groupId, monitoringEnabled, priority },
    });

    await this.auditService.log(userId, AuditEventType.GROUP_MONITOR_TOGGLED, 'Group', groupId, {
      monitoringEnabled,
      priority,
    });

    return monitored;
  }

  async isGroupMonitored(userId: string, groupId: string): Promise<boolean> {
    const monitored = await this.prisma.monitoredGroup.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    return monitored?.monitoringEnabled === true;
  }
}
