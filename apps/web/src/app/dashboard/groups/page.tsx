'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { groupsApi, whatsappApi } from '@/lib/api';
import type { GroupDto } from '@plantao-radar/shared';

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadGroups = async () => {
    try {
      const data = await groupsApi.list();
      setGroups(data);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await whatsappApi.syncGroups();
      toast.success(`${result.synced} grupos sincronizados`);
      await loadGroups();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggle = async (group: GroupDto) => {
    setToggling(group.id);
    try {
      await groupsApi.setMonitoring(group.id, !group.monitored);
      setGroups((prev) =>
        prev.map((g) => (g.id === group.id ? { ...g, monitored: !g.monitored } : g)),
      );
      toast.success(
        !group.monitored ? `Monitorando "${group.groupName}"` : `Parou de monitorar "${group.groupName}"`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar monitoramento');
    } finally {
      setToggling(null);
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grupos</h1>
          <p className="text-gray-500 text-sm mt-1">Selecione os grupos para monitorar</p>
        </div>
        <button onClick={handleSync} className="btn-secondary text-sm" disabled={syncing}>
          {syncing ? 'Sincronizando...' : '🔄 Sincronizar'}
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="card px-5 py-12 text-center text-gray-400">
          <p className="text-3xl mb-2">👥</p>
          <p className="text-sm">Nenhum grupo encontrado.</p>
          <p className="text-xs mt-1">Conecte o WhatsApp e sincronize os grupos.</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {groups.map((group) => (
            <div key={group.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{group.groupName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{group.externalGroupId}</p>
              </div>
              <button
                onClick={() => handleToggle(group)}
                disabled={toggling === group.id}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  group.monitored ? 'bg-blue-600' : 'bg-gray-200'
                } disabled:opacity-50`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    group.monitored ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
