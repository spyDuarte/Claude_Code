import { Module, forwardRef } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { AuditModule } from '../audit/audit.module';
import { FiltersModule } from '../filters/filters.module';
import { ClassifierModule } from '../classifier/classifier.module';
import { RepliesModule } from '../replies/replies.module';

@Module({
  imports: [
    AuditModule,
    FiltersModule,
    ClassifierModule,
    forwardRef(() => RepliesModule),
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
