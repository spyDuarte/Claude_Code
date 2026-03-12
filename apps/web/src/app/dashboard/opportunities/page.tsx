'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { messagesApi } from '@/lib/api';
import { MatchDecision, OutgoingMessageStatus } from '@plantao-radar/shared';
import type { OpportunityDto } from '@plantao-radar/shared';
import { formatDate, formatCurrency, scoreToPercent } from '@/lib/utils';

function DecisionBadge({ decision }: { decision: string }) {
  if (decision === MatchDecision.AUTO_SEND) return <span className="badge-green">Auto-enviado</span>;
  if (decision === MatchDecision.REVIEW) return <span className="badge-yellow">Aguardando revisão</span>;
  return <span className="badge-red">Rejeitado</span>;
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  if (score >= 0.85) return <span className="badge-green font-bold">{pct}%</span>;
  if (score >= 0.6) return <span className="badge-yellow font-bold">{pct}%</span>;
  return <span className="badge-red font-bold">{pct}%</span>;
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<OpportunityDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actioning, setActioning] = useState<string | null>(null);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const result = await messagesApi.opportunities(p, 20);
      setOpportunities(result.data);
      setTotal(result.total);
    } catch {
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
  }, [page]);

  const handleApprove = async (id: string) => {
    setActioning(id);
    try {
      await messagesApi.approve(id);
      toast.success('Resposta enviada com sucesso!');
      await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao aprovar');
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (id: string) => {
    setActioning(id);
    try {
      await messagesApi.reject(id);
      toast.success('Oportunidade rejeitada');
      await load(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao rejeitar');
    } finally {
      setActioning(null);
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Oportunidades</h1>
        <p className="text-gray-500 text-sm mt-1">
          {total} oportunidades encontradas
        </p>
      </div>

      {opportunities.length === 0 ? (
        <div className="card px-5 py-12 text-center text-gray-400">
          <p className="text-3xl mb-2">💼</p>
          <p className="text-sm">Nenhuma oportunidade compatível ainda.</p>
          <p className="text-xs mt-1">Ative o monitoramento de grupos e configure seus filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {opportunities.map((opp) => (
            <div key={opp.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400 font-medium">{opp.groupName ?? 'Grupo'}</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs text-gray-400">{formatDate(opp.receivedAt)}</span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{opp.messageText}</p>
                </div>
                {opp.matchResult && <ScoreBadge score={opp.matchResult.score} />}
              </div>

              {opp.matchResult && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <DecisionBadge decision={opp.matchResult.decision} />
                    {opp.parsedMessage?.extractedCity && (
                      <span className="badge-blue">📍 {opp.parsedMessage.extractedCity}</span>
                    )}
                    {opp.parsedMessage?.extractedValue && (
                      <span className="badge-blue">
                        💰 {formatCurrency(opp.parsedMessage.extractedValue)}
                      </span>
                    )}
                    {opp.parsedMessage?.extractedShift && (
                      <span className="badge-blue">🕐 {opp.parsedMessage.extractedShift}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{opp.matchResult.rationale}</p>
                </div>
              )}

              {opp.matchResult?.decision === MatchDecision.REVIEW &&
                opp.outgoingMessage?.status === OutgoingMessageStatus.PENDING && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(opp.id)}
                      disabled={actioning === opp.id}
                      className="btn-primary text-sm py-1.5"
                    >
                      ✓ Aprovar e Enviar
                    </button>
                    <button
                      onClick={() => handleReject(opp.id)}
                      disabled={actioning === opp.id}
                      className="btn-secondary text-sm py-1.5"
                    >
                      ✕ Rejeitar
                    </button>
                  </div>
                )}

              {opp.outgoingMessage?.status === OutgoingMessageStatus.SENT && (
                <p className="text-xs text-green-600 font-medium pt-1">✓ Resposta enviada</p>
              )}
            </div>
          ))}
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
