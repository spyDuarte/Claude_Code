import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { RepliesService } from '../replies/replies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('messages')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(
    private messagesService: MessagesService,
    private repliesService: RepliesService,
  ) {}

  @Get('messages')
  @ApiOperation({ summary: 'List all received messages (history)' })
  listMessages(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messagesService.listMessages(user.id, { page, limit });
  }

  @Get('opportunities')
  @ApiOperation({ summary: 'List compatible opportunities' })
  listOpportunities(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messagesService.listOpportunities(user.id, { page, limit });
  }

  @Post('opportunities/:id/approve')
  @ApiOperation({ summary: 'Approve and send reply for an opportunity' })
  approveOpportunity(@CurrentUser() user: User, @Param('id') id: string) {
    return this.repliesService.approveReply(user.id, id);
  }

  @Post('opportunities/:id/reject')
  @ApiOperation({ summary: 'Reject an opportunity (cancel pending reply)' })
  rejectOpportunity(@CurrentUser() user: User, @Param('id') id: string) {
    return this.repliesService.rejectReply(user.id, id);
  }
}
