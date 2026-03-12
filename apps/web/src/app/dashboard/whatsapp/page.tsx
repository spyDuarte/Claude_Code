'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { whatsappApi } from '@/lib/api';
import { WhatsAppSessionStatus } from '@plantao-radar/shared';
import type { WhatsAppSessionDto } from '@plantao-radar/shared';
import { formatDate } from '@/lib/utils';

export default function WhatsAppPage() {
  const [session, setSession] = useState<(WhatsAppSessionDto & { qrCode?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadSession = async () => {
    try {
      const s = await whatsappApi.getSession();
      setSession(s);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const s = await whatsappApi.createSession();
      setSession(s);
      toast.success('Sessão iniciada! Escaneie o QR code.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao conectar');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await whatsappApi.disconnect();
      await loadSession();
      toast.success('Sessão desconectada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao desconectar');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSyncGroups = async () => {
    try {
      const result = await whatsappApi.syncGroups();
      toast.success(`${result.synced} grupos sincronizados`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao sincronizar grupos');
    }
  };

  const isConnected = session?.status === WhatsAppSessionStatus.CONNECTED;
  const isQr = session?.status === WhatsAppSessionStatus.QR_CODE;

  if (loading) return <div className="text-gray-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie sua sessão WhatsApp</p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Status da Sessão</h2>

        {!session || session.status === WhatsAppSessionStatus.DISCONNECTED ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">📱</p>
            <p className="text-gray-600 mb-4">Nenhuma sessão ativa</p>
            <button onClick={handleConnect} className="btn-primary" disabled={connecting}>
              {connecting ? 'Iniciando...' : 'Conectar WhatsApp'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}
              />
              <span className="font-medium text-gray-800">
                {isConnected ? 'Conectado' : isQr ? 'Aguardando QR Code' : session.status}
              </span>
            </div>

            {session.lastSeenAt && (
              <p className="text-sm text-gray-500">Último ativo: {formatDate(session.lastSeenAt)}</p>
            )}

            {isQr && session.qrCode && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-3">
                  Escaneie o QR code com seu WhatsApp:
                </p>
                <img
                  src={session.qrCode}
                  alt="QR Code WhatsApp"
                  className="mx-auto max-w-48 border"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Abra WhatsApp → Dispositivos conectados → Conectar dispositivo
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {isConnected && (
                <button onClick={handleSyncGroups} className="btn-secondary text-sm">
                  Sincronizar Grupos
                </button>
              )}
              <button
                onClick={handleDisconnect}
                className="btn-danger text-sm"
                disabled={disconnecting}
              >
                {disconnecting ? 'Desconectando...' : 'Desconectar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
