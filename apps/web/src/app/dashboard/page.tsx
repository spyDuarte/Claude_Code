'use client';

import { useEffect, useState } from 'react';
import { whatsappApi, messagesApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { WhatsAppSessionStatus } from '@plantao-radar/shared';
import type { WhatsAppSessionDto, OpportunityDto } from '@plantao-radar/shared';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    [WhatsAppSessionStatus.CONNECTED]: 'badge-green',
    [WhatsAppSessionStatus.QR_CODE]: 'badge-yellow',
    [WhatsAppSessionStatus.PENDING]: 'badge-gray',
    [WhatsAppSessionStatus.DISCONNECTED]: 'badge-red',
    [WhatsAppSessionStatus.FAILED]: 'badge-red',
  };
  const labels: Record<string, string> = {
    [WhatsAppSessionStatus.CONNECTED]: 'Conectado',
    [WhatsAppSessionStatus.QR_CODE]: 'Aguardando QR',
    [WhatsAppSessionStatus.PENDING]: 'Pendente',
    [WhatsAppSessionStatus.DISCONNECTED]: 'Desconectado',
    [WhatsAppSessionStatus.FAILED]: 'Falhou',
  };
  return <span className={map[status] ?? 'badge-gray'}>{labels[status] ?? status}</span>;
}

export default function DashboardPage() {
  const [session, setSession] = useState<WhatsAppSessionDto | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, o] = await Promise.allSettled([
          whatsappApi.getSession(),
          messagesApi.opportunities(1, 5),
        ]);
        if (s.status === 'fulfilled') setSession(s.value);
        if (o.status === 'fulfilled') setOpportunities(o.value.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
        <p className="text-gray-500 text-sm mt-1">Resumo do seu monitoramento</p>
      </div>

      {/* Session Status Card */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Sessão WhatsApp</h2>
            {session ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={session.status} />
                </div>
                {session.lastSeenAt && (
                  <p className="text-xs text-gray-400">
                    Último ativo: {formatDate(session.lastSeenAt)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-1">Nenhuma sessão ativa</p>
            )}
          </div>
          <a href="/dashboard/whatsapp" className="btn-primary text-sm">
            {session ? 'Gerenciar' : 'Conectar'}
          </a>
        </div>
      </div>

      {/* Recent Opportunities */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Últimas Oportunidades</h2>
          <a href="/dashboard/opportunities" className="text-sm text-blue-600 hover:underline">
            Ver todas
          </a>
        </div>

        {opportunities.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">Nenhuma oportunidade encontrada ainda.</p>
            <p className="text-xs mt-1">Configure grupos e filtros para começar.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {opportunities.map((opp) => (
              <div key={opp.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 line-clamp-2">{opp.messageText}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {opp.groupName} · {formatDate(opp.receivedAt)}
                  </p>
                </div>
                {opp.matchResult && (
                  <div className="text-right shrink-0">
                    <span
                      className={
                        opp.matchResult.score >= 0.85
                          ? 'badge-green'
                          : opp.matchResult.score >= 0.6
                            ? 'badge-yellow'
                            : 'badge-red'
                      }
                    >
                      {Math.round(opp.matchResult.score * 100)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
