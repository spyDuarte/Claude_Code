import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { GroupsModule } from './groups/groups.module';
import { FiltersModule } from './filters/filters.module';
import { MessagesModule } from './messages/messages.module';
import { ClassifierModule } from './classifier/classifier.module';
import { RepliesModule } from './replies/replies.module';
import { AuditModule } from './audit/audit.module';
import { QueueModule } from './queue/queue.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../../.env'],
    }),
    AppConfigModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    WhatsAppModule,
    GroupsModule,
    FiltersModule,
    MessagesModule,
    ClassifierModule,
    RepliesModule,
    AuditModule,
    QueueModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
