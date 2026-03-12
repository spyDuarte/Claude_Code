'use client';

import { useEffect, useState } from 'react';
import { logsApi } from '@/lib/api';
import type { AuditLogDto } from '@plantao-radar/shared';
import { formatDate } from '@/lib/utils';

const EVENT_COLORS: Record<string, string> = {
  USER_REGISTERED: 'badge-blue',
  USER_LOGIN: 'badge-blue',
  SESSION_CONNECTED: 'badge-green',
  SESSION_DISCONNECTED: 'badge-red',
  GROUPS_SYNCED: 'badge-blue',
  MESSAGE_RECEIVED: 'badge-gray',
  MESSAGE_PROCESSED: 'badge-gray',
  MESSAGE_REJECTED_HEURISTIC: 'badge-red',
  MESSAGE_REJECTED_DUPLICATE: 'badge-yellow',
  CLASSIFIER_CALLED: 'badge-gray',
  REPLY_AUTO_SENT: 'badge-green',
  REPLY_QUEUED_REVIEW: 'badge-yellow',
  REPLY_APPROVED: 'badge-green',
  REPLY_REJECTED: 'badge-red',
  FILTER_UPDATED: 'badge-blue',
};

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const result = await logsApi.list(page, 50);
        setLogs(result.data);
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
        <h1 className="text-2xl font-bold text-gray-900">Logs de Auditoria</h1>
        <p className="text-gray-500 text-sm mt-1">{total} eventos registrados</p>
      </div>

      {logs.length === 0 ? (
        <div className="card px-5 py-12 text-center text-gray-400">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm">Nenhum log encontrado ainda.</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {logs.map((log) => (
            <div key={log.id} className="px-5 py-3 flex items-start gap-3">
              <span className={`${EVENT_COLORS[log.eventType] ?? 'badge-gray'} shrink-0 mt-0.5 text-xs`}>
                {log.eventType}
              </span>
              <div className="flex-1 min-w-0">
                {log.payload && Object.keys(log.payload).length > 0 && (
                  <p className="text-xs text-gray-500 truncate">
                    {JSON.stringify(log.payload)}
                  </p>
                )}
                {log.entityType && log.entityId && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {log.entityType} · {log.entityId.slice(0, 12)}...
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0">{formatDate(log.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      {total > 50 && (
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
            disabled={page * 50 >= total}
            className="btn-secondary text-sm"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
