import React, { useState, useEffect } from 'react';
import { employeeRequestsAPI, EmployeeRequest, EmployeeRequestCreate } from '../../api/employeeRequests';
import { brandsAPI, Brand } from '../../api/brands';
import { rolesAPI, Role } from '../../api/roles'; // Used in modals
// import { auditLogsAPI, AuditActions, ResourceTypes } from '../../api/auditLogs'; // Disabled - endpoint not available
import { useAuth } from '../../hooks/useAuth';
import { Plus, Search, Check, X, Clock, User, Building2, Edit } from 'lucide-react';
import { usePageTexts } from '../../hooks/usePageTexts';
import toast from 'react-hot-toast';

const EmployeeRequests: React.FC = () => {
  const { user: currentUser, loading: authLoading } = useAuth();
  const { getTitle, getDescription, getButtonText, getStatusText } = usePageTexts();
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<EmployeeRequest | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<EmployeeRequest | null>(null);
  const perPage = 10;

  useEffect(() => {
    if (authLoading) return; // Wait for auth to complete
    
    loadRequests();
    loadBrands();
  }, [page, statusFilter, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await employeeRequestsAPI.getEmployeeRequests(page, perPage, statusFilter || undefined);
      setRequests(response.requests);
      setTotal(response.total);
    } catch (error) {
      toast.error('Talepler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async () => {
    try {
      const response = await brandsAPI.getBrands(1, 100);
      setBrands(response.brands);
    } catch (error) {
      // Ignore error for brands
    }
  };


  const handleCreateRequest = async (requestData: EmployeeRequestCreate) => {
    try {
      // Validate role_id before sending
      if (!requestData.role_id || requestData.role_id === 0) {
        toast.error('Rol bilgisi yüklenemedi. Lütfen sayfayı yenileyin.');
        return;
      }
      
      const newRequest = await employeeRequestsAPI.createEmployeeRequest(requestData);
      
      // Audit log disabled - endpoint not available
      /*try {
        await auditLogsAPI.createAuditLog({
          action: AuditActions.EMPLOYEE_REQUEST_CREATED,
          resource_type: ResourceTypes.EMPLOYEE_REQUEST,
          resource_id: newRequest.id,
          details: {
            resource_name: `${requestData.first_name} ${requestData.last_name}`,
            new_values: requestData,
            message: `${requestData.first_name} ${requestData.last_name} için çalışan talebi oluşturuldu`
          }
        });
      } catch (auditError) {
        console.error('Audit log oluşturulamadı:', auditError);
      }*/

      toast.success('Çalışan talebi başarıyla oluşturuldu');
      setShowCreateModal(false);
      loadRequests();
      // Sidebar'daki sayacı güncelle
      window.dispatchEvent(new CustomEvent('employeeRequestUpdated'));
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Talep oluşturulamadı';
      console.error('Employee request creation error:', error);
      
      // Check if it's a foreign key error (database inconsistency)
      if (errorMessage.includes('Geçersiz rol ID') || errorMessage.includes('foreign key')) {
        toast.error('Veritabanı tutarsızlığı tespit edildi. Lütfen sistem yöneticisine başvurun.');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleApproveRequest = async (requestId: number, adminNotes?: string) => {
    try {
      const request = requests.find(r => r.id === requestId);
      const oldStatus = request?.status;
      
      await employeeRequestsAPI.approveEmployeeRequest(requestId, adminNotes);
      
      // Audit log disabled - endpoint not available
      /*try {
        await auditLogsAPI.createAuditLog({
          action: AuditActions.EMPLOYEE_REQUEST_APPROVED,
          resource_type: ResourceTypes.EMPLOYEE_REQUEST,
          resource_id: requestId,
          details: {
            resource_name: request ? `${request.first_name} ${request.last_name}` : `Talep #${requestId}`,
            old_values: { status: oldStatus, admin_notes: request?.admin_notes },
            new_values: { status: 'approved', admin_notes: adminNotes },
            message: `${request?.first_name} ${request?.last_name} için çalışan talebi onaylandı${adminNotes ? ` - Not: ${adminNotes}` : ''}`
          }
        });
      } catch (auditError) {
        console.error('Audit log oluşturulamadı:', auditError);
      }*/

      toast.success('Talep onaylandı ve çalışan oluşturuldu');
      setShowApprovalModal(false);
      setSelectedRequest(null);
      loadRequests();
      // Sidebar'daki sayacı güncelle
      window.dispatchEvent(new CustomEvent('employeeRequestUpdated'));
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Talep onaylanamadı');
    }
  };

  const handleRejectRequest = async (requestId: number, adminNotes: string) => {
    try {
      const request = requests.find(r => r.id === requestId);
      const oldStatus = request?.status;
      
      await employeeRequestsAPI.rejectEmployeeRequest(requestId, adminNotes);
      
      // Audit log disabled - endpoint not available
      /*try {
        await auditLogsAPI.createAuditLog({
          action: AuditActions.EMPLOYEE_REQUEST_REJECTED,
          resource_type: ResourceTypes.EMPLOYEE_REQUEST,
          resource_id: requestId,
          details: {
            resource_name: request ? `${request.first_name} ${request.last_name}` : `Talep #${requestId}`,
            old_values: { status: oldStatus, admin_notes: request?.admin_notes },
            new_values: { status: 'rejected', admin_notes: adminNotes },
            message: `${request?.first_name} ${request?.last_name} için çalışan talebi reddedildi - Sebep: ${adminNotes}`
          }
        });
      } catch (auditError) {
        console.error('Audit log oluşturulamadı:', auditError);
      }*/

      toast.success('Talep reddedildi');
      setShowApprovalModal(false);
      setSelectedRequest(null);
      loadRequests();
      // Sidebar'daki sayacı güncelle
      window.dispatchEvent(new CustomEvent('employeeRequestUpdated'));
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Talep reddedilemedi');
    }
  };

  // Hızlı onaylama (admin notları olmadan)
  // const handleQuickApprove = async (requestId: number) => {
  //   if (!window.confirm('Bu talebi onaylamak istediğinizden emin misiniz? Otomatik olarak kullanıcı oluşturulacak ve şifre gönderilecektir.')) {
  //     return;
  //   }

  //   try {
  //     await employeeRequestsAPI.approveEmployeeRequest(requestId, 'Hızlı onay');
  //     toast.success('Talep onaylandı! Kullanıcı oluşturuldu ve şifre gönderildi.');
  //     loadRequests();
  //     // Sidebar'daki sayacı güncelle
  //     window.dispatchEvent(new CustomEvent('employeeRequestUpdated'));
  //   } catch (error: any) {
  //     toast.error(error.response?.data?.detail || 'Talep onaylanamadı');
  //   }
  // };

  // Talep düzenleme
  const handleEditRequest = (request: EmployeeRequest) => {
    setEditingRequest(request);
    setShowEditModal(true);
  };

  // Talep güncelleme
  const handleUpdateRequest = async (requestData: EmployeeRequestCreate) => {
    if (!editingRequest) return;

    try {
      // Değişiklikleri tespit et
      const changes: Array<{field: string, oldValue: any, newValue: any}> = [];
      
      if (editingRequest.first_name !== requestData.first_name) {
        changes.push({field: 'Ad', oldValue: editingRequest.first_name, newValue: requestData.first_name});
      }
      if (editingRequest.last_name !== requestData.last_name) {
        changes.push({field: 'Soyad', oldValue: editingRequest.last_name, newValue: requestData.last_name});
      }
      if (editingRequest.email !== requestData.email) {
        changes.push({field: 'E-posta', oldValue: editingRequest.email, newValue: requestData.email});
      }
      if (editingRequest.phone_number !== requestData.phone_number) {
        changes.push({field: 'Telefon', oldValue: editingRequest.phone_number || 'Boş', newValue: requestData.phone_number || 'Boş'});
      }
      if (editingRequest.role_id !== requestData.role_id) {
        changes.push({field: 'Rol ID', oldValue: editingRequest.role_id, newValue: requestData.role_id});
      }
      if (JSON.stringify(editingRequest.brand_ids?.sort()) !== JSON.stringify(requestData.brand_ids?.sort())) {
        changes.push({field: 'Markalar', oldValue: editingRequest.brand_ids, newValue: requestData.brand_ids});
      }

      await employeeRequestsAPI.updateEmployeeRequest(editingRequest.id, requestData);
      
      // Audit log disabled - endpoint not available
      /*try {
        await auditLogsAPI.createAuditLog({
          action: AuditActions.EMPLOYEE_REQUEST_UPDATED,
          resource_type: ResourceTypes.EMPLOYEE_REQUEST,
          resource_id: editingRequest.id,
          details: {
            resource_name: `${requestData.first_name} ${requestData.last_name}`,
            old_values: {
              first_name: editingRequest.first_name,
              last_name: editingRequest.last_name,
              email: editingRequest.email,
              phone_number: editingRequest.phone_number,
              role_id: editingRequest.role_id,
              brand_ids: editingRequest.brand_ids
            },
            new_values: requestData,
            message: `${requestData.first_name} ${requestData.last_name} için çalışan talebi güncellendi${changes.length > 0 ? ` - Değişiklikler: ${changes.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join(', ')}` : ''}`
          }
        });
      } catch (auditError) {
        console.error('Audit log oluşturulamadı:', auditError);
      }*/

      toast.success('Talep başarıyla güncellendi');
      setShowEditModal(false);
      setEditingRequest(null);
      loadRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Talep güncellenemedi');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // const getStatusTextLocal = (status: string) => {
  //   return getStatusText(status);
  // };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} />;
      case 'approved':
        return <Check size={16} />;
      case 'rejected':
        return <X size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
{getTitle('employee_requests')}
          </h1>
          <p className="text-gray-600">
            {getDescription('employee_requests')}
          </p>
        </div>
        {currentUser?.permissions?.includes('employee_requests.manage') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Plus size={18} className="mr-2" />
            {getButtonText('add_employee_request')}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Durum</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
            >
              <option value="">Tüm Durumlar</option>
              <option value="pending">Bekleyen</option>
              <option value="approved">Onaylanan</option>
              <option value="rejected">Reddedilen</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setStatusFilter('')}
              className="btn btn-secondary"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Çalışan Bilgileri</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Rol</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Markalar</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Durum</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Talep Eden</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Tarih</th>
                  {(currentUser?.role === 'Super Admin' || currentUser?.role === 'Mağaza Yöneticisi') && (
                    <th className="text-left py-3 px-4 font-medium text-gray-900">İşlemler</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User size={16} className="text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {request.first_name} {request.last_name}
                          </div>
                          <div className="text-sm text-gray-600">{request.email}</div>
                          {request.phone_number && (
                            <div className="text-xs text-gray-500">{request.phone_number}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {request.role_name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {request.brand_names.map(brandName => (
                          <span key={brandName} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs flex items-center gap-1">
                            <Building2 size={12} />
                            {brandName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        {getStatusText(request.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {request.requested_by_name}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {new Date(request.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    {currentUser?.role === 'Super Admin' && (
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {/* Düzenleme butonu her zaman görünür */}
                          <button
                            onClick={() => handleEditRequest(request)}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-xs flex items-center gap-1"
                            title="Talebi düzenle"
                          >
                            <Edit size={12} />
                            Düzenle
                          </button>
                          
                          {/* Detay görüntüleme butonu - onaylama/reddetme detay modal'ında yapılacak */}
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowApprovalModal(true);
                            }}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors text-xs flex items-center gap-1"
                            title="Detayları görüntüle"
                          >
                            <Search size={12} />
                            Detay
                          </button>
                        </div>
                      </td>
                    )}
                    {currentUser?.role === 'Mağaza Yöneticisi' && (
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowApprovalModal(true);
                          }}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors text-xs flex items-center gap-1"
                          title="Detayları görüntüle"
                        >
                          <Search size={12} />
                          Detay
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > perPage && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">
              {total} talepten {((page - 1) * perPage) + 1}-{Math.min(page * perPage, total)} arası gösteriliyor
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

      {/* Create Request Modal */}
      {showCreateModal && (
        <CreateRequestModal
          brands={brands.filter(brand => currentUser?.brand_ids?.includes(brand.id))}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateRequest}
          getButtonText={getButtonText}
        />
      )}

      {/* Edit Request Modal */}
      {showEditModal && editingRequest && (
        <EditRequestModal
          request={editingRequest}
          brands={(() => {
            // Super Admin ise talep sahibinin markalarını göster
            if (currentUser?.role === 'Super Admin') {
              // Talep sahibinin yetkili olduğu markaları filtrele
              const requestorBrands = brands.filter(brand => 
                editingRequest.requested_by_brand_ids?.includes(brand.id) || false
              );
              
              // Eğer talep sahibinin markası bulunamazsa, tüm markaları göster (fallback)
              if (requestorBrands.length === 0) {
                console.warn('Talep sahibinin markası bulunamadı, tüm markalar gösteriliyor');
                return brands;
              }
              
              return requestorBrands;
            }
            // Diğer roller için sadece kendi markalarını göster
            return brands.filter(brand => 
              currentUser?.brand_ids?.includes(brand.id) || false
            );
          })()}
          onClose={() => {
            setShowEditModal(false);
            setEditingRequest(null);
          }}
          onSave={handleUpdateRequest}
          currentUser={currentUser}
        />
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <ApprovalModal
          request={selectedRequest}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedRequest(null);
          }}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
          currentUser={currentUser}
          getStatusText={getStatusText}
        />
      )}

    </div>
  );
};

// Create Request Modal Component
interface CreateRequestModalProps {
  brands: Brand[];
  onClose: () => void;
  onSave: (requestData: EmployeeRequestCreate) => Promise<void>;
  getButtonText: (key: string) => string;
}

const CreateRequestModal: React.FC<CreateRequestModalProps> = ({ brands, onClose, onSave, getButtonText }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    role_id: 0, // Will be set after roles are loaded
    brand_ids: [] as number[],
    request_message: '',
  });
  
  // Load roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await rolesAPI.getRoles();
        setRoles(response.roles);
        
        // Automatically set employee role - try multiple name patterns
        const employeeRole = response.roles.find(r => 
          r.name === 'store_employee' || 
          r.display_name?.includes('Çalışan') ||
          r.display_name?.includes('Employee')
        );
        const defaultRoleId = employeeRole?.id || response.roles[0]?.id || 0;
        
        setFormData(prev => ({
          ...prev,
          role_id: defaultRoleId
        }));
      } catch (error) {
        console.error('Roller yüklenemedi:', error);
        toast.error('Roller yüklenemedi');
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);
  
  // Get employee role for display
  const employeeRole = roles.find(r => 
    r.name === 'store_employee' || 
    r.display_name?.includes('Çalışan') ||
    r.display_name?.includes('Employee')
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'role_id' ? Number(value) : value,
    }));
  };

  const handleBrandChange = (brandId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      brand_ids: checked 
        ? [...prev.brand_ids, brandId]
        : prev.brand_ids.filter(id => id !== brandId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Ad, soyad ve e-posta alanları zorunludur');
      return;
    }
    
    if (formData.brand_ids.length === 0) {
      toast.error('En az bir marka seçilmelidir');
      return;
    }

    await onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Çalışan Talep Et</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Ad</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Soyad</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">E-posta</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Telefon (Opsiyonel)</label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className="form-input"
                placeholder="Örn: +90 555 123 45 67"
              />
            </div>

            {/* Rol otomatik olarak Mağaza Çalışanı atanacak */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800 font-medium">
                  Rol: {employeeRole?.display_name || 'Çalışan'} (Otomatik)
                </span>
              </div>
            </div>

            <div>
              <label className="form-label">
                Markalar <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                {brands.length > 0 ? (
                  brands.map(brand => (
                    <label key={brand.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.brand_ids.includes(brand.id)}
                        onChange={(e) => handleBrandChange(brand.id, e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">{brand.name}</span>
                    </label>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 p-2">
                    Size atanmış marka bulunamadı. Lütfen sistem yöneticisi ile iletişime geçin.
                  </div>
                )}
              </div>
              {formData.brand_ids.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  En az bir marka seçilmelidir.
                </p>
              )}
            </div>

            <div>
              <label className="form-label">Talep Mesajı (Opsiyonel)</label>
              <textarea
                name="request_message"
                value={formData.request_message}
                onChange={handleChange}
                className="form-input"
                rows={3}
                placeholder="Bu çalışan hakkında ek bilgi..."
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button type="submit" className="btn btn-primary flex-1">
    {getButtonText('add_employee_request')}
              </button>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Approval Modal Component
interface ApprovalModalProps {
  request: EmployeeRequest;
  onClose: () => void;
  onApprove: (requestId: number, adminNotes?: string) => Promise<void>;
  onReject: (requestId: number, adminNotes: string) => Promise<void>;
  currentUser: any;
  getStatusText: (key: string) => string;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({ request, onClose, onApprove, onReject, currentUser, getStatusText }) => {
  const [adminNotes, setAdminNotes] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onApprove(request.id, adminNotes);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // const getStatusTextLocal = (status: string) => {
  //   return getStatusText(status);
  // };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} />;
      case 'approved':
        return <Check size={16} />;
      case 'rejected':
        return <X size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Talep İnceleme</h2>
          
          <div className="space-y-4 mb-6">
            <div>
              <h3 className="font-medium text-gray-900">Çalışan Bilgileri</h3>
              <p className="text-sm text-gray-600">
                {request.first_name} {request.last_name} ({request.email})
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">Rol</h3>
              <p className="text-sm text-gray-600">{request.role_name}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">Markalar</h3>
              <p className="text-sm text-gray-600">{request.brand_names.join(', ')}</p>
            </div>
            
            {request.request_message && (
              <div>
                <h3 className="font-medium text-gray-900">Talep Mesajı</h3>
                <p className="text-sm text-gray-600">{request.request_message}</p>
              </div>
            )}
            
            <div>
              <h3 className="font-medium text-gray-900">Talep Eden</h3>
              <p className="text-sm text-gray-600">{request.requested_by_name}</p>
            </div>
            
            {request.admin_notes && (
              <div>
                <h3 className="font-medium text-gray-900">
                  {request.status === 'rejected' ? 'Red Nedeni' : 'Admin Notları'}
                </h3>
                <div className={`text-sm p-3 rounded-lg ${
                  request.status === 'rejected' 
                    ? 'text-red-700 bg-red-50 border border-red-200' 
                    : 'text-gray-600 bg-gray-50'
                }`}>
                  {request.admin_notes}
                </div>
              </div>
            )}
            
            {request.status !== 'pending' && (
              <div>
                <h3 className="font-medium text-gray-900">Durum</h3>
                <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${getStatusColor(request.status)}`}>
                  {getStatusIcon(request.status)}
                  {getStatusText(request.status)}
                </span>
              </div>
            )}
          </div>

          {currentUser?.role === 'Super Admin' ? (
            <div className="space-y-4">
              <div>
                <label className="form-label">Admin Notları</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="form-input"
                  rows={3}
                  placeholder="Onay/red nedeni veya ek notlar..."
                />
              </div>

              <div className="flex gap-2">
                {/* Sadece bekleyen talepler için butonlar göster */}
                {request.status === 'pending' ? (
                  <>
                    <button
                      onClick={handleSubmit}
                      className="btn btn-success flex-1"
                    >
                      <Check size={16} className="mr-2" />
                      Onayla
                    </button>
                    
                    <button
                      onClick={() => {
                        if (adminNotes.trim()) {
                          onReject(request.id, adminNotes);
                        } else {
                          // Admin notları boşsa uyarı ver
                          alert('Reddetme nedeni belirtmelisiniz!');
                        }
                      }}
                      className="btn btn-danger flex-1"
                    >
                      <X size={16} className="mr-2" />
                      Reddet
                    </button>
                  </>
                ) : (
                  <div className="flex-1 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      request.status === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {request.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                    </span>
                  </div>
                )}
                
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  Kapat
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Kapat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Edit Request Modal Component
interface EditRequestModalProps {
  request: EmployeeRequest;
  brands: Brand[];
  onClose: () => void;
  onSave: (requestData: EmployeeRequestCreate) => Promise<void>;
  currentUser: any;
}

const EditRequestModal: React.FC<EditRequestModalProps> = ({ request, brands, onClose, onSave, currentUser }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  
  const [formData, setFormData] = useState({
    email: request.email || '',
    first_name: request.first_name || '',
    last_name: request.last_name || '',
    phone_number: request.phone_number || '',
    role_id: request.role_id || 0, // Use request's role_id, will be updated if needed
    brand_ids: request.brand_ids || [] as number[],
    request_message: request.request_message || '',
  });
  
  // Load roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await rolesAPI.getRoles();
        setRoles(response.roles);
        
        // If role_id is 0 or invalid, set default
        if (!request.role_id || request.role_id === 0) {
          const employeeRole = response.roles.find(r => 
            r.name === 'store_employee' || 
            r.display_name?.includes('Çalışan') ||
            r.display_name?.includes('Employee')
          );
          const defaultRoleId = employeeRole?.id || response.roles[0]?.id || 0;
          
          setFormData(prev => ({
            ...prev,
            role_id: defaultRoleId
          }));
        }
      } catch (error) {
        console.error('Roller yüklenemedi:', error);
        toast.error('Roller yüklenemedi');
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, [request.role_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'role_id' ? Number(value) : value,
    }));
  };

  const handleBrandChange = (brandId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      brand_ids: checked 
        ? [...prev.brand_ids, brandId]
        : prev.brand_ids.filter(id => id !== brandId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Ad, soyad ve e-posta alanları zorunludur');
      return;
    }
    
    if (formData.brand_ids.length === 0) {
      toast.error('En az bir marka seçilmelidir');
      return;
    }

    await onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Talep Düzenle</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Ad</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Soyad</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">E-posta</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Telefon (Opsiyonel)</label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className="form-input"
                placeholder="Örn: +90 555 123 45 67"
              />
            </div>

            <div>
              <label className="form-label">Rol</label>
              <select
                name="role_id"
                value={formData.role_id}
                onChange={handleChange}
                className="form-input"
                required
              >
                {roles.length > 0 ? (
                  roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.display_name}
                    </option>
                  ))
                ) : (
                  <option value="">Rol yükleniyor...</option>
                )}
              </select>
            </div>

            <div>
              <label className="form-label">
                Markalar <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                {brands.length > 0 ? (
                  brands.map(brand => (
                    <label key={brand.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.brand_ids.includes(brand.id)}
                        onChange={(e) => handleBrandChange(brand.id, e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">{brand.name}</span>
                    </label>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 p-2">
                    {(() => {
                      if (currentUser?.role === 'Super Admin') {
                        return 'Talep sahibinin erişebileceği marka bulunamadı. Sistem yöneticisi olarak tüm markalar gösterilmektedir.';
                      }
                      return 'Size atanmış marka bulunamadı. Lütfen sistem yöneticisi ile iletişime geçin.';
                    })()}
                  </div>
                )}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                💡 Sadece talep sahibinin yetkili olduğu markalar gösterilmektedir.
              </p>
            </div>

            <div>
              <label className="form-label">Talep Mesajı (Sadece Görüntüleme)</label>
              <textarea
                name="request_message"
                value={formData.request_message}
                readOnly
                className="form-input bg-gray-50 cursor-not-allowed"
                rows={3}
                placeholder={formData.request_message || "Talep mesajı yok"}
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Bu mesaj mağaza yöneticisi tarafından yazılmıştır ve değiştirilemez.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <button type="submit" className="btn btn-primary flex-1">
                Güncelle
              </button>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


export default EmployeeRequests;
