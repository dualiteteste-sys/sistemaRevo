import React, { useState } from 'react';
import { useOs } from '@/hooks/useOs';
import { useToast } from '@/contexts/ToastProvider';
import * as osService from '@/services/os';
import { Loader2, PlusCircle, Search, ClipboardCheck } from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import Modal from '@/components/ui/Modal';
import OsTable from '@/components/os/OsTable';
import OsFormPanel from '@/components/os/OsFormPanel';
import Select from '@/components/ui/forms/Select';
import { Database } from '@/types/database.types';

const statusOptions: { value: Database['public']['Enums']['status_os']; label: string }[] = [
    { value: 'orcamento', label: 'Orçamento' },
    { value: 'aberta', label: 'Aberta' },
    { value: 'concluida', label: 'Concluída' },
    { value: 'cancelada', label: 'Cancelada' },
];

const OsPage: React.FC = () => {
  const {
    serviceOrders,
    loading,
    error,
    count,
    page,
    pageSize,
    searchTerm,
    filterStatus,
    sortBy,
    setPage,
    setSearchTerm,
    setFilterStatus,
    setSortBy,
    refresh,
  } = useOs();
  const { addToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOs, setSelectedOs] = useState<osService.OrdemServicoDetails | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [osToDelete, setOsToDelete] = useState<osService.OrdemServico | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const handleOpenForm = async (os: osService.OrdemServico | null = null) => {
    if (os?.id) {
      setIsFetchingDetails(true);
      setIsFormOpen(true);
      setSelectedOs(null);
      try {
        const details = await osService.getOsDetails(os.id);
        setSelectedOs(details);
      } catch (e: any) {
        addToast(e.message, 'error');
        setIsFormOpen(false);
      } finally {
        setIsFetchingDetails(false);
      }
    } else {
      setSelectedOs(null);
      setIsFormOpen(true);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedOs(null);
  };

  const handleSaveSuccess = () => {
    refresh();
    handleCloseForm();
  };

  const handleOpenDeleteModal = (os: osService.OrdemServico) => {
    setOsToDelete(os);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!osToDelete?.id) return;
    setIsDeleting(true);
    try {
      await osService.deleteOs(osToDelete.id);
      addToast('Ordem de Serviço excluída com sucesso!', 'success');
      refresh();
      setIsDeleteModalOpen(false);
    } catch (e: any) {
      addToast(e.message || 'Erro ao excluir.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSort = (column: keyof osService.OrdemServico) => {
    setSortBy(prev => ({
      column,
      ascending: prev.column === column ? !prev.ascending : true,
    }));
  };

  return (
    <div className="p-1">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Ordens de Serviço</h1>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusCircle size={20} />
          Nova O.S.
        </button>
      </div>

      <div className="mb-4 flex gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nº ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-xs p-3 pl-10 border border-gray-300 rounded-lg"
          />
        </div>
        <Select
          value={filterStatus || ''}
          onChange={(e) => setFilterStatus(e.target.value as any || null)}
          className="min-w-[200px]"
        >
          <option value="">Todos os status</option>
          {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </Select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && serviceOrders.length === 0 ? (
          <div className="h-96 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : error ? (
          <div className="h-96 flex items-center justify-center text-red-500">{error}</div>
        ) : serviceOrders.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-gray-500">
            <ClipboardCheck size={48} className="mb-4" />
            <p>Nenhuma Ordem de Serviço encontrada.</p>
            {searchTerm && <p className="text-sm">Tente ajustar sua busca.</p>}
          </div>
        ) : (
          <OsTable serviceOrders={serviceOrders} onEdit={handleOpenForm} onDelete={handleOpenDeleteModal} sortBy={sortBy} onSort={handleSort} />
        )}
      </div>

      {count > pageSize && (
        <Pagination currentPage={page} totalCount={count} pageSize={pageSize} onPageChange={setPage} />
      )}

      <Modal isOpen={isFormOpen} onClose={handleCloseForm} title={selectedOs ? `Editar O.S. #${selectedOs.numero}` : 'Nova Ordem de Serviço'}>
        {isFetchingDetails ? (
          <div className="flex items-center justify-center h-full min-h-[500px]">
            <Loader2 className="animate-spin text-blue-600" size={48} />
          </div>
        ) : (
          <OsFormPanel os={selectedOs} onSaveSuccess={handleSaveSuccess} onClose={handleCloseForm} />
        )}
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir a O.S. nº ${osToDelete?.numero}? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
};

export default OsPage;
