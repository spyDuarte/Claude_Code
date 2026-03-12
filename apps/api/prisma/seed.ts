import { PrismaClient, MatchDecision, AutoReplyMode, WhatsAppSessionStatus, OutgoingMessageStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Plantão Radar...');

  // ─── 1. Demo User ──────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('demo1234', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@plantaoradar.com' },
    update: {},
    create: {
      name: 'Dr. Ana Silva',
      email: 'demo@plantaoradar.com',
      passwordHash,
    },
  });

  console.log(`  ✔ User: ${user.email}`);

  // ─── 2. WhatsApp Session ──────────────────────────────────────────────────
  const session = await prisma.whatsAppSession.upsert({
    where: { id: 'seed-session-001' },
    update: {},
    create: {
      id: 'seed-session-001',
      userId: user.id,
      provider: 'stub',
      status: WhatsAppSessionStatus.CONNECTED,
      sessionRef: 'stub-ref-001',
      lastSeenAt: new Date(),
    },
  });

  console.log(`  ✔ Session: ${session.id}`);

  // ─── 3. Groups ────────────────────────────────────────────────────────────
  const groupsData = [
    {
      id: 'seed-group-001',
      externalGroupId: 'ext-group-001@g.us',
      groupName: 'Plantões SP Capital',
      isActive: true,
    },
    {
      id: 'seed-group-002',
      externalGroupId: 'ext-group-002@g.us',
      groupName: 'Vagas Médicas - Grande SP',
      isActive: true,
    },
    {
      id: 'seed-group-003',
      externalGroupId: 'ext-group-003@g.us',
      groupName: 'UPA e Hospital Regional',
      isActive: true,
    },
  ];

  const groups = [];
  for (const g of groupsData) {
    const group = await prisma.group.upsert({
      where: { id: g.id },
      update: {},
      create: {
        ...g,
        sessionId: session.id,
        lastSyncAt: new Date(),
      },
    });
    groups.push(group);
    console.log(`  ✔ Group: ${group.groupName}`);
  }

  // ─── 4. Monitored Groups ──────────────────────────────────────────────────
  for (const group of groups.slice(0, 2)) {
    await prisma.monitoredGroup.upsert({
      where: { userId_groupId: { userId: user.id, groupId: group.id } },
      update: {},
      create: {
        userId: user.id,
        groupId: group.id,
        monitoringEnabled: true,
        priority: 1,
      },
    });
  }

  console.log(`  ✔ Monitoring enabled for 2 groups`);

  // ─── 5. User Filter ───────────────────────────────────────────────────────
  const filter = await prisma.userFilter.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      specialty: 'Clínica Médica',
      cities: ['São Paulo', 'Guarulhos', 'Campinas'],
      hospitals: ['Hospital das Clínicas', 'Einstein', 'Sírio-Libanês'],
      minValue: 1500,
      maxDistanceKm: 50,
      acceptedShifts: ['PLANTAO_12H', 'PLANTAO_24H', 'NOTURNO'],
      requiredKeywords: ['clínico', 'clinico'],
      blockedKeywords: ['pediatria', 'ortopedia'],
      autoReplyMode: AutoReplyMode.SEMI_AUTO,
      autoReplyThreshold: 0.85,
      semiAutoThreshold: 0.6,
      replyTemplate:
        'Olá! Sou Dra. Ana Silva, clínica médica. Tenho interesse no plantão. Pode me passar mais detalhes?',
    },
  });

  console.log(`  ✔ Filter: ${filter.specialty}`);

  // ─── 6. Incoming Messages ─────────────────────────────────────────────────
  const messagesData = [
    {
      id: 'seed-msg-001',
      externalMessageId: 'ext-msg-001',
      groupId: groups[0]!.id,
      senderName: 'Dr. Carlos',
      senderNumber: '5511999990001',
      messageText:
        'Plantão disponível! Hospital São Lucas, clínico geral, dia 15/06, noturno 12h. Valor: R$ 1.800. Interessados chamar no pvt.',
      score: 0.92,
      decision: MatchDecision.AUTO_SEND,
      rationale: 'Alta compatibilidade: especialidade, cidade, valor e turno compatíveis.',
      matchedFields: ['specialty', 'city', 'value', 'shiftType'],
      sendStatus: OutgoingMessageStatus.SENT,
    },
    {
      id: 'seed-msg-002',
      externalMessageId: 'ext-msg-002',
      groupId: groups[0]!.id,
      senderName: 'Coordenação UPA',
      senderNumber: '5511999990002',
      messageText:
        'Vaga urgente UPA Centro SP. Clínico médico para cobertura amanhã diurno. Pagar bem. Quem puder avisar!',
      score: 0.73,
      decision: MatchDecision.REVIEW,
      rationale: 'Compatibilidade média: cidade e especialidade ok, mas turno não preferido.',
      matchedFields: ['specialty', 'city'],
      sendStatus: null,
    },
    {
      id: 'seed-msg-003',
      externalMessageId: 'ext-msg-003',
      groupId: groups[1]!.id,
      senderName: 'Hospital Regional',
      senderNumber: '5511999990003',
      messageText:
        'Precisamos de ortopedista para plantão 24h no domingo. R$ 2.500. Hospital Regional Guarulhos.',
      score: 0.15,
      decision: MatchDecision.REJECTED,
      rationale: 'Especialidade incompatível: ortopedista (bloqueado pelo filtro).',
      matchedFields: [],
      sendStatus: null,
    },
    {
      id: 'seed-msg-004',
      externalMessageId: 'ext-msg-004',
      groupId: groups[0]!.id,
      senderName: 'Escala Médica SP',
      senderNumber: '5511999990004',
      messageText:
        'Boa noite grupo! Plantão clínica médica 12h noturno semana que vem. Hospital Einstein Morumbi. R$ 2.200. Somente CRM ativo SP.',
      score: 0.88,
      decision: MatchDecision.AUTO_SEND,
      rationale: 'Excelente match: hospital preferido, especialidade, cidade e valor acima do mínimo.',
      matchedFields: ['specialty', 'city', 'hospital', 'value', 'shiftType'],
      sendStatus: OutgoingMessageStatus.SENT,
    },
    {
      id: 'seed-msg-005',
      externalMessageId: 'ext-msg-005',
      groupId: groups[1]!.id,
      senderName: 'Plantões Interior',
      senderNumber: '5511999990005',
      messageText:
        'Plantão disponível cidade de Piracicaba, interior SP. Clínico geral. 24h. R$ 1.600. Quem tiver interesse.',
      score: 0.55,
      decision: MatchDecision.REJECTED,
      rationale: 'Cidade fora do raio de cobertura configurado.',
      matchedFields: ['specialty', 'value'],
      sendStatus: null,
    },
  ];

  for (const msgData of messagesData) {
    const incoming = await prisma.incomingMessage.upsert({
      where: { id: msgData.id },
      update: {},
      create: {
        id: msgData.id,
        userId: user.id,
        sessionId: session.id,
        groupId: msgData.groupId,
        externalMessageId: msgData.externalMessageId,
        senderName: msgData.senderName,
        senderNumber: msgData.senderNumber,
        messageText: msgData.messageText,
        rawPayload: { source: 'seed' },
        receivedAt: new Date(Date.now() - Math.random() * 86400000),
      },
    });

    await prisma.parsedMessage.upsert({
      where: { incomingMessageId: incoming.id },
      update: {},
      create: {
        incomingMessageId: incoming.id,
        possibleShiftOffer: msgData.score > 0.1,
        extractedCity: msgData.matchedFields.includes('city') ? 'São Paulo' : null,
        extractedHospital: msgData.matchedFields.includes('hospital') ? 'Einstein' : null,
        extractedShift: msgData.matchedFields.includes('shiftType') ? 'NOTURNO' : null,
        extractedValue: msgData.matchedFields.includes('value') ? 1800 : null,
        extractedSpecialty: msgData.matchedFields.includes('specialty') ? 'Clínica Médica' : null,
        extractedKeywords: ['plantão', 'clínico'],
      },
    });

    await prisma.matchResult.upsert({
      where: { incomingMessageId: incoming.id },
      update: {},
      create: {
        incomingMessageId: incoming.id,
        userId: user.id,
        score: msgData.score,
        decision: msgData.decision,
        rationale: msgData.rationale,
        matchedFields: msgData.matchedFields,
      },
    });

    if (msgData.sendStatus) {
      await prisma.outgoingMessage.upsert({
        where: { incomingMessageId: incoming.id },
        update: {},
        create: {
          userId: user.id,
          incomingMessageId: incoming.id,
          destinationRef: msgData.senderNumber,
          messageText: filter.replyTemplate ?? 'Tenho interesse!',
          sendMode: AutoReplyMode.FULL_AUTO,
          status: msgData.sendStatus,
          sentAt: msgData.sendStatus === OutgoingMessageStatus.SENT ? new Date() : null,
        },
      });
    }

    console.log(
      `  ✔ Message ${msgData.id}: score=${msgData.score} decision=${msgData.decision}`,
    );
  }

  // ─── 7. Audit Logs ────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      {
        userId: user.id,
        eventType: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user.id,
        payload: { email: user.email },
        createdAt: new Date(Date.now() - 86400000 * 2),
      },
      {
        userId: user.id,
        eventType: 'SESSION_CONNECTED',
        entityType: 'WhatsAppSession',
        entityId: session.id,
        payload: { provider: 'stub' },
        createdAt: new Date(Date.now() - 86400000),
      },
      {
        userId: user.id,
        eventType: 'GROUPS_SYNCED',
        entityType: 'WhatsAppSession',
        entityId: session.id,
        payload: { groupCount: 3 },
        createdAt: new Date(Date.now() - 43200000),
      },
    ],
    skipDuplicates: true,
  });

  console.log(`  ✔ Audit logs created`);
  console.log('\n✅ Seed completed successfully!');
  console.log(`\n   Demo login: demo@plantaoradar.com / demo1234`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
