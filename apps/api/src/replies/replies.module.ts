import { Module, forwardRef } from '@nestjs/common';
import { RepliesService } from './replies.service';
import { DeduplicationService } from './deduplication.service';
import { AuditModule } from '../audit/audit.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [AuditModule, forwardRef(() => WhatsAppModule)],
  providers: [RepliesService, DeduplicationService],
  exports: [RepliesService, DeduplicationService],
})
export class RepliesModule {}
