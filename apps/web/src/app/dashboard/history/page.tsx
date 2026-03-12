'use client';

import { useEffect, useState } from 'react';
import { messagesApi } from '@/lib/api';
import { MatchDecision } from '@plantao-radar/shared';
import type { IncomingMessageDto } from '@plantao-radar/shared';
import { formatDate } from '@/lib/utils';

export default function HistoryPage() {
  const [messages, setMessages] = useState<IncomingMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const result = await messagesApi.list(page, 20);
        setMessages(result.data);
        setTotal(result.total);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page]);

  if (loading) return <div className="text-gray-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Histórico</h1>
        <p className="text-gray-500 text-sm mt-1">{total} mensagens recebidas</p>
      </div>

      {messages.length === 0 ? (
        <div className="card px-5 py-12 text-center text-gray-400">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">Nenhuma mensagem recebida ainda.</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {messages.map((msg) => {
            const decision = msg.matchResult?.decision;
            return (
              <div key={msg.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        {(msg as any).group?.groupName ?? 'Grupo'}
                      </span>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">{msg.senderName}</span>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">{formatDate(msg.receivedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{msg.messageText}</p>
                  </div>
                  {decision && (
                    <span
                      className={
                        decision === MatchDecision.AUTO_SEND
                          ? 'badge-green shrink-0'
                          : decision === MatchDecision.REVIEW
                            ? 'badge-yellow shrink-0'
                            : 'badge-red shrink-0'
                      }
                    >
                      {decision === MatchDecision.AUTO_SEND
                        ? 'Enviado'
                        : decision === MatchDecision.REVIEW
                          ? 'Revisão'
                          : 'Rejeitado'}
                    </span>
                  )}
                </div>
                {msg.matchResult && (
                  <p className="text-xs text-gray-400 mt-1">
                    Score: {Math.round(msg.matchResult.score * 100)}% · {msg.matchResult.rationale}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-sm"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500 flex items-center">Página {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 20 >= total}
            className="btn-secondary text-sm"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
