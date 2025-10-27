/**
 * useTableData Hook
 * Tablo verilerini yöneten hook
 */

import { useState, useEffect, useMemo } from 'react';

interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sorter?: (a: T, b: T) => number;
  filterable?: boolean;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

interface TableDataOptions<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  pageSize?: number;
  searchable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
}

interface TableState {
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  sortField: string | null;
  sortOrder: 'asc' | 'desc' | null;
  filters: Record<string, any>;
}

export const useTableData = <T = any>(options: TableDataOptions<T>) => {
  const {
    data,
    columns,
    pageSize = 10,
    searchable = true,
    sortable = true,
    filterable = true,
    pagination = true
  } = options;

  const [state, setState] = useState<TableState>({
    currentPage: 1,
    pageSize,
    searchTerm: '',
    sortField: null,
    sortOrder: null,
    filters: {}
  });

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchable || !state.searchTerm) return data;

    const searchLower = state.searchTerm.toLowerCase();
    return data.filter(item => {
      return columns.some(column => {
        const value = getNestedValue(item, column.dataIndex);
        return String(value).toLowerCase().includes(searchLower);
      });
    });
  }, [data, state.searchTerm, columns, searchable]);

  // Apply filters
  const filteredByFilters = useMemo(() => {
    if (!filterable || Object.keys(state.filters).length === 0) return filteredData;

    return filteredData.filter(item => {
      return Object.entries(state.filters).every(([key, filterValue]) => {
        if (filterValue === null || filterValue === undefined || filterValue === '') {
          return true;
        }
        
        const itemValue = getNestedValue(item, key);
        return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
      });
    });
  }, [filteredData, state.filters, filterable]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortable || !state.sortField || !state.sortOrder) return filteredByFilters;

    const column = columns.find(col => col.dataIndex === state.sortField);
    if (!column || !column.sorter) return filteredByFilters;

    return [...filteredByFilters].sort((a, b) => {
      const result = column.sorter!(a, b);
      return state.sortOrder === 'asc' ? result : -result;
    });
  }, [filteredByFilters, state.sortField, state.sortOrder, columns, sortable]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, state.currentPage, state.pageSize, pagination]);

  // Calculate pagination info
  const paginationInfo = useMemo(() => {
    if (!pagination) return null;

    const totalItems = sortedData.length;
    const totalPages = Math.ceil(totalItems / state.pageSize);
    const startIndex = (state.currentPage - 1) * state.pageSize + 1;
    const endIndex = Math.min(state.currentPage * state.pageSize, totalItems);

    return {
      totalItems,
      totalPages,
      currentPage: state.currentPage,
      pageSize: state.pageSize,
      startIndex,
      endIndex,
      hasNextPage: state.currentPage < totalPages,
      hasPrevPage: state.currentPage > 1
    };
  }, [sortedData.length, state.currentPage, state.pageSize, pagination]);

  // Helper function to get nested values
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Actions
  const setSearchTerm = (searchTerm: string) => {
    setState(prev => ({ ...prev, searchTerm, currentPage: 1 }));
  };

  const setSort = (field: string, order: 'asc' | 'desc') => {
    setState(prev => ({
      ...prev,
      sortField: field,
      sortOrder: order,
      currentPage: 1
    }));
  };

  const setFilter = (key: string, value: any) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
      currentPage: 1
    }));
  };

  const clearFilters = () => {
    setState(prev => ({ ...prev, filters: {}, currentPage: 1 }));
  };

  const setPage = (page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  };

  const setPageSize = (size: number) => {
    setState(prev => ({ ...prev, pageSize: size, currentPage: 1 }));
  };

  const resetTable = () => {
    setState({
      currentPage: 1,
      pageSize,
      searchTerm: '',
      sortField: null,
      sortOrder: null,
      filters: {}
    });
  };

  // Get unique values for filter dropdowns
  const getFilterOptions = (dataIndex: string) => {
    const values = data.map(item => getNestedValue(item, dataIndex));
    return Array.from(new Set(values)).filter(value => value !== null && value !== undefined);
  };

  return {
    // Data
    data: paginatedData,
    allData: sortedData,
    columns,
    
    // State
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    searchTerm: state.searchTerm,
    sortField: state.sortField,
    sortOrder: state.sortOrder,
    filters: state.filters,
    
    // Pagination info
    paginationInfo,
    
    // Actions
    setSearchTerm,
    setSort,
    setFilter,
    clearFilters,
    setPage,
    setPageSize,
    resetTable,
    
    // Helpers
    getFilterOptions,
    getNestedValue
  };
};
