import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { MessagesService } from '../messages/messages.service';
import type { User } from '@prisma/client';

@ApiTags('whatsapp')
@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
  constructor(
    private whatsappService: WhatsAppService,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
  ) {}

  @Post('session')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or reconnect WhatsApp session' })
  createSession(@CurrentUser() user: User) {
    return this.whatsappService.createSession(user.id);
  }

  @Get('session')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current WhatsApp session status' })
  getSession(@CurrentUser() user: User) {
    return this.whatsappService.getSession(user.id);
  }

  @Post('session/disconnect')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect WhatsApp session' })
  disconnectSession(@CurrentUser() user: User) {
    return this.whatsappService.disconnectSession(user.id);
  }

  @Get('groups/sync')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync groups from WhatsApp session' })
  syncGroups(@CurrentUser() user: User) {
    return this.whatsappService.syncGroups(user.id);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive incoming WhatsApp webhook' })
  async handleWebhook(@Body() payload: unknown) {
    // Webhook is public — provider sends events here
    // The payload contains userId context (sessionRef maps to session → user)
    await this.messagesService.processWebhook(payload);
    return { received: true };
  }
}
