import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { StubWhatsAppProvider } from './providers/stub.provider';
import { WHATSAPP_PROVIDER } from './whatsapp.constants';
import { AuditModule } from '../audit/audit.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [AuditModule, forwardRef(() => MessagesModule)],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService,
    {
      provide: WHATSAPP_PROVIDER,
      useFactory: (config: ConfigService) => {
        const providerType = config.get<string>('whatsapp.provider') ?? 'stub';
        // Future: swap in real providers based on providerType
        if (providerType === 'stub') {
          return new StubWhatsAppProvider();
        }
        return new StubWhatsAppProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
