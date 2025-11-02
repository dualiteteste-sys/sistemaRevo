import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthProvider';
import { useToast } from '../../../contexts/ToastProvider';
import { Loader2, Trash2, Archive, RotateCcw, DatabaseBackup } from 'lucide-react';
import GlassCard from '../../ui/GlassCard';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { callRpc } from '@/lib/api';

const DataManagementContent: React.FC = () => {
  const { activeEmpresa } = useAuth();
  const { addToast } = useToast();

  const [legacyCount, setLegacyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPurging, setIsPurging] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);

  const fetchLegacyCount = useCallback(async () => {
    if (!activeEmpresa) return;

    setLoading(true);
    try {
      const data = await callRpc<{ to_archive_count: number }[]>('purge_legacy_products', {
        p_empresa_id: activeEmpresa.id,
        p_dry_run: true,
      });

      setLegacyCount(data?.[0]?.to_archive_count || 0);
    } catch (error: any) {
      addToast('Erro ao verificar dados legados.', 'error');
      setLegacyCount(0);
    } finally {
      setLoading(false);
    }
  }, [activeEmpresa, addToast]);

  useEffect(() => {
    fetchLegacyCount();
  }, [fetchLegacyCount]);

  const handlePurge = async () => {
    if (!activeEmpresa) return;

    setIsPurging(true);
    try {
      const data = await callRpc<{ purged_count: number }[]>('purge_legacy_products', {
        p_empresa_id: activeEmpresa.id,
        p_dry_run: false,
      });

      addToast(`${data?.[0]?.purged_count || 0} produtos legados foram arquivados e removidos.`, 'success');
      await fetchLegacyCount();
    } catch (error: any) {
      addToast(`Falha na limpeza: ${error.message}`, 'error');
    } finally {
      setIsPurging(false);
      setIsPurgeModalOpen(false);
    }
  };
  
  const handleRestore = async () => {
    if (!activeEmpresa) return;

    setIsRestoring(true);
    try {
      const data = await callRpc<{ restored_count: number }[]>('restore_legacy_products', {
        p_empresa_id: activeEmpresa.id,
      });

      addToast(`${data?.[0]?.restored_count || 0} produtos foram restaurados do arquivo.`, 'success');
      await fetchLegacyCount();
    } catch (error: any) {
      addToast(`Falha na restauração: ${error.message}`, 'error');
    } finally {
      setIsRestoring(false);
    }
  };


  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Limpeza de Dados</h1>
      
      <GlassCard className="p-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Archive size={20} />
              Produtos Legados
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Produtos cadastrados na versão antiga do sistema. É recomendado arquivá-los para manter a consistência dos dados.
            </p>
          </div>
          {loading ? (
            <Loader2 className="animate-spin text-blue-500" />
          ) : (
            <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">{legacyCount}</p>
                <p className="text-sm text-gray-500">registros</p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-white/30 flex justify-end">
          <button
            onClick={() => setIsPurgeModalOpen(true)}
            disabled={loading || legacyCount === 0 || isPurging}
            className="flex items-center gap-2 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
          >
            {isPurging ? <Loader2 className="animate-spin" /> : <Trash2 size={18} />}
            Limpar Dados Legados
          </button>
        </div>
      </GlassCard>
      
      <GlassCard className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <DatabaseBackup size={20} />
              Restaurar Dados
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Restaure produtos legados que foram arquivados anteriormente.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/30 flex justify-end">
          <button
            onClick={handleRestore}
            disabled={isRestoring}
            className="flex items-center gap-2 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400"
          >
            {isRestoring ? <Loader2 className="animate-spin" /> : <RotateCcw size={18} />}
            Restaurar Último Arquivo
          </button>
        </div>
      </GlassCard>

      <ConfirmationModal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        onConfirm={handlePurge}
        title="Confirmar Limpeza de Dados"
        description={`Você está prestes a arquivar e remover ${legacyCount} produtos legados. Esta ação pode ser revertida, mas é recomendável prosseguir com cautela. Deseja continuar?`}
        confirmText="Sim, Limpar Dados"
        isLoading={isPurging}
        variant="danger"
      />
    </div>
  );
};

export default DataManagementContent;
