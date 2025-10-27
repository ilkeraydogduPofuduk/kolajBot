import React, { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, record: T, index: number) => ReactNode;
  width?: string;
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: {
    current: number;
    total: number;
    pageSize: number;
    onChange: (page: number) => void;
  };
  emptyText?: string;
  className?: string;
}

export function Table<T extends { id: number | string }>({
  data,
  columns,
  loading = false,
  pagination,
  emptyText = 'Veri bulunamadı',
  className = ''
}: TableProps<T>) {
  const renderCell = (column: Column<T>, record: T, index: number) => {
    if (column.render) {
      return column.render(
        column.key === 'index' ? index + 1 : (record as any)[column.key],
        record,
        index
      );
    }
    
    if (column.key === 'index') {
      return index + 1;
    }
    
    return (record as any)[column.key];
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="p-8 text-center">
          <div className="spinner mx-auto"></div>
          <p className="mt-2 text-gray-500">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="p-8 text-center text-gray-500">
          {emptyText}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={`${column.key as string}-${index}`}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                  style={{ width: column.width }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((record, index) => (
              <tr key={record.id} className="hover:bg-gray-50">
                {columns.map((column, colIndex) => (
                  <td
                    key={`${record.id}-${column.key as string}-${colIndex}`}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {renderCell(column, record, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pagination && pagination.total > pagination.pageSize && (
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {pagination.total} kayıttan {Math.min(pagination.current * pagination.pageSize, pagination.total)} tanesi gösteriliyor
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => pagination.onChange(pagination.current - 1)}
              disabled={pagination.current <= 1}
              className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 text-sm">
              {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <button
              onClick={() => pagination.onChange(pagination.current + 1)}
              disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
              className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
