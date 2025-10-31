import React, { useState } from 'react';
import { usePartners } from '../../hooks/usePartners';
import { useToast } from '../../contexts/ToastProvider';
import * as partnersService from '../../services/partners';
import { Loader2, PlusCircle, Search, Users2 } from 'lucide-react';
import Pagination from '../../components/ui/Pagination';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import Modal from '../../components/ui/Modal';
import PartnersTable from '../../components/partners/PartnersTable';
import PartnerFormPanel from '../../components/partners/PartnerFormPanel';

const PartnersPage: React.FC = () => {
  const {
    partners,
    loading,
    error,
    count,
    page,
    pageSize,
    searchTerm,
    filterType,
    sortBy,
    setPage,
    setSearchTerm,
    setFilterType,
    setSortBy,
    refresh,
  } = usePartners();
  const { addToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<partnersService.PartnerDetails | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<partnersService.PartnerListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const handleOpenForm = async (partner: partnersService.PartnerListItem | null = null) => {
    if (partner?.id) {
      setIsFetchingDetails(true);
      setIsFormOpen(true);
      setSelectedPartner(null);
      try {
        const details = await partnersService.getPartnerDetails(partner.id);
        setSelectedPartner(details);
      } catch (e: any) {
        addToast(e.message, 'error');
        setIsFormOpen(false);
      } finally {
        setIsFetchingDetails(false);
      }
    } else {
      setSelectedPartner(null);
      setIsFormOpen(true);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedPartner(null);
  };

  const handleSaveSuccess = () => {
    refresh();
    handleCloseForm();
  };

  const handleOpenDeleteModal = (partner: partnersService.PartnerListItem) => {
    setPartnerToDelete(partner);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setPartnerToDelete(null);
  };

  const handleDelete = async () => {
    if (!partnerToDelete?.id) return;
    setIsDeleting(true);
    try {
      await partnersService.deletePartner(partnerToDelete.id);
      addToast('Registro excluído com sucesso!', 'success');
      refresh();
      handleCloseDeleteModal();
    } catch (e: any) {
      addToast(e.message || 'Erro ao excluir.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSort = (column: keyof partnersService.PartnerListItem) => {
    setSortBy(prev => ({
      column,
      ascending: prev.column === column ? !prev.ascending : true,
    }));
  };

  return (
    <div className="p-1">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Clientes e Fornecedores</h1>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusCircle size={20} />
          Novo Cliente/Fornecedor
        </button>
      </div>

      <div className="mb-4 flex gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, doc ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-xs p-2 pl-10 border border-gray-300 rounded-lg"
          />
        </div>
        <select
          value={filterType || ''}
          onChange={(e) => setFilterType(e.target.value || null)}
          className="p-2 border border-gray-300 rounded-lg bg-white"
        >
          <option value="">Todos os tipos</option>
          <option value="cliente">Cliente</option>
          <option value="fornecedor">Fornecedor</option>
          <option value="ambos">Ambos</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && partners.length === 0 ? (
          <div className="h-96 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : error ? (
          <div className="h-96 flex items-center justify-center text-red-500">{error}</div>
        ) : partners.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-gray-500">
            <Users2 size={48} className="mb-4" />
            <p>Nenhum cliente ou fornecedor encontrado.</p>
            {searchTerm && <p className="text-sm">Tente ajustar sua busca.</p>}
          </div>
        ) : (
          <PartnersTable partners={partners} onEdit={handleOpenForm} onDelete={handleOpenDeleteModal} sortBy={sortBy} onSort={handleSort} />
        )}
      </div>

      {count > pageSize && (
        <Pagination currentPage={page} totalCount={count} pageSize={pageSize} onPageChange={setPage} />
      )}

      <Modal isOpen={isFormOpen} onClose={handleCloseForm} title={selectedPartner ? 'Editar Cliente/Fornecedor' : 'Novo Cliente/Fornecedor'}>
        {isFetchingDetails ? (
          <div className="flex items-center justify-center h-full min-h-[500px]">
            <Loader2 className="animate-spin text-blue-600" size={48} />
          </div>
        ) : (
          <PartnerFormPanel partner={selectedPartner} onSaveSuccess={handleSaveSuccess} onClose={handleCloseForm} />
        )}
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDelete}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir "${partnerToDelete?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
};

export default PartnersPage;
