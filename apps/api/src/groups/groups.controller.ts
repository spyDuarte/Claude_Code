import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { MonitorGroupDto } from './dto/monitor-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('groups')
@Controller('groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List all groups from the active session' })
  listGroups(@CurrentUser() user: User) {
    return this.groupsService.listGroups(user.id);
  }

  @Post('monitor')
  @ApiOperation({ summary: 'Enable or disable monitoring for a group' })
  monitorGroup(@CurrentUser() user: User, @Body() dto: MonitorGroupDto) {
    return this.groupsService.setMonitoring(
      user.id,
      dto.groupId,
      dto.monitoringEnabled,
      dto.priority,
    );
  }
}
