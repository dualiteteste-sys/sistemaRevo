import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import * as osService from '../services/os';
import { useAuth } from '../contexts/AuthProvider';
import { Database } from '@/types/database.types';

export const useOs = () => {
  const { activeEmpresa } = useAuth();
  const [serviceOrders, setServiceOrders] = useState<osService.OrdemServico[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [filterStatus, setFilterStatus] = useState<Database['public']['Enums']['status_os'] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  const [sortBy, setSortBy] = useState<{ column: keyof osService.OrdemServico; ascending: boolean }>({
    column: 'numero',
    ascending: false,
  });

  const fetchOs = useCallback(async () => {
    if (!activeEmpresa) {
        setServiceOrders([]);
        setCount(0);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      // The list RPC doesn't return count. We'll have to estimate or add a count RPC.
      // For now, I'll assume the list RPC is all we have.
      const data = await osService.listOs({
        offset: (page - 1) * pageSize,
        limit: pageSize,
        search: debouncedSearchTerm,
        status: filterStatus,
        orderBy: sortBy.column as string,
        orderDir: sortBy.ascending ? 'asc' : 'desc',
      });
      setServiceOrders(data);
      // This count is an estimation
      const newCount = data.length < pageSize ? (page - 1) * pageSize + data.length : (page * pageSize) + 1;
      setCount(newCount);
    } catch (e: any) {
      setError(e.message);
      setServiceOrders([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearchTerm, filterStatus, sortBy, activeEmpresa]);

  useEffect(() => {
    fetchOs();
  }, [fetchOs]);

  const refresh = () => {
    fetchOs();
  };

  return {
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
  };
};
