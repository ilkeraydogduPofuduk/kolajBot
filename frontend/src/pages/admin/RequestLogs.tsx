import React, { useState, useEffect } from 'react';
import { auditLogsAPI, EmployeeRequestLog, AuditLogFilters, getActionDescription } from '../../api/auditLogs';
import { usersAPI } from '../../api/users';
import { useAuth } from '../../hooks/useAuth';
import { FileText, Filter, User, Building2, Clock, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const RequestLogs: React.FC = () => {
  const [logs, setLogs] = useState<EmployeeRequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  
  const { user: currentUser } = useAuth(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const perPage = 20;

  // Filtreler
  const [filters, setFilters] = useState<AuditLogFilters & { request_id?: number }>({
    user_id: undefined,
    action: '',
    request_id: undefined,
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadLogs();
    loadUsers();
  }, [page, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await auditLogsAPI.getEmployeeRequestLogs(filters);
      setLogs(response);
      setTotal(response.length);
    } catch (error) {
      toast.error('Loglar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getUsers(1, 1000);
      setUsers(response.users);
    } catch (error) {
      // Ignore error for users
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      user_id: undefined,
      action: '',
      request_id: undefined,
      start_date: '',
      end_date: '',
    });
    setPage(1);
  };

  const toggleLogExpansion = (logId: number) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'bg-blue-100 text-blue-800';
    if (action.includes('approved')) return 'bg-green-100 text-green-800';
    if (action.includes('rejected')) return 'bg-red-100 text-red-800';
    if (action.includes('updated')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const renderFieldChanges = (oldValues: any, newValues: any) => {
    if (!oldValues || !newValues) return null;

    const changes: Array<{field: string, oldValue: any, newValue: any}> = [];
    const allKeys = [...Object.keys(oldValues || {}), ...Object.keys(newValues || {})];
    const uniqueKeys = allKeys.filter((key, index, array) => array.indexOf(key) === index);

    uniqueKeys.forEach(key => {
      const oldValue = oldValues[key];
      const newValue = newValues[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue: oldValue,
          newValue: newValue
        });
      }
    });

    if (changes.length === 0) return null;

    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <h5 className="text-sm font-medium text-gray-900 mb-2">Değişiklikler:</h5>
        <div className="space-y-2">
          {changes.map((change, index) => (
            <div key={index} className="text-xs">
              <span className="font-medium text-gray-700">{change.field}:</span>
              <div className="ml-2">
                <span className="text-red-600 line-through">
                  {Array.isArray(change.oldValue) ? change.oldValue.join(', ') : String(change.oldValue || 'Boş')}
                </span>
                <span className="mx-2">→</span>
                <span className="text-green-600">
                  {Array.isArray(change.newValue) ? change.newValue.join(', ') : String(change.newValue || 'Boş')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Talep Logları</h1>
          <p className="text-gray-600">
            Çalışan talepleri üzerinde yapılan tüm işlemlerin detaylı kayıtları
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Filter size={18} />
          {showFilters ? 'Filtreleri Gizle' : 'Filtrele'}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Kullanıcı</label>
              <select
                value={filters.user_id || ''}
                onChange={(e) => handleFilterChange('user_id', e.target.value)}
                className="form-input"
              >
                <option value="">Tüm Kullanıcılar</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">İşlem Türü</label>
              <select
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="form-input"
              >
                <option value="">Tüm İşlemler</option>
                <option value="employee_request_created">Talep Oluşturma</option>
                <option value="employee_request_updated">Talep Güncelleme</option>
                <option value="employee_request_approved">Talep Onaylama</option>
                <option value="employee_request_rejected">Talep Reddetme</option>
              </select>
            </div>

            <div>
              <label className="form-label">Talep ID</label>
              <input
                type="number"
                value={filters.request_id || ''}
                onChange={(e) => handleFilterChange('request_id', e.target.value)}
                className="form-input"
                placeholder="Talep numarası"
              />
            </div>

            <div>
              <label className="form-label">Başlangıç Tarihi</label>
              <input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Bitiş Tarihi</label>
              <input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="btn btn-secondary"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Toplam Log</p>
              <p className="text-xl font-bold text-gray-900">{total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Aktif Kullanıcı</p>
              <p className="text-xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Bu Sayfa</p>
              <p className="text-xl font-bold text-gray-900">{logs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Eye className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sayfa</p>
              <p className="text-xl font-bold text-gray-900">{page}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="border rounded-lg hover:bg-gray-50">
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => toggleLogExpansion(log.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {expandedLogs.has(log.id) ? (
                            <ChevronDown size={16} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-400" />
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action || '')}`}>
                            {getActionDescription(log.action || '')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {log.user_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({log.user_role})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {log.resource_name || `Talep #${log.resource_id}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{formatDate(log.created_at)}</span>
                        <span>#{log.id}</span>
                      </div>
                    </div>
                  </div>

                  {expandedLogs.has(log.id) && (
                    <div className="px-4 pb-4 border-t bg-gray-50">
                      <div className="pt-4 space-y-3">
                        {log.details && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-1">Açıklama:</h5>
                            <p className="text-sm text-gray-600">{log.details}</p>
                          </div>
                        )}

                        {renderFieldChanges(log.old_values, log.new_values)}

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t text-xs text-gray-500">
                          <div>
                            <span className="font-medium">IP Adresi:</span> {log.ip_address || 'Bilinmiyor'}
                          </div>
                          <div>
                            <span className="font-medium">Kullanıcı Aracı:</span> 
                            <span className="ml-1 truncate block max-w-xs" title={log.user_agent}>
                              {log.user_agent || 'Bilinmiyor'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Henüz log kaydı bulunmuyor</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {total > perPage && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <div className="text-sm text-gray-600">
              {total} kayıttan {((page - 1) * perPage) + 1}-{Math.min(page * perPage, total)} arası gösteriliyor
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Önceki
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page * perPage >= total}
                className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestLogs;
