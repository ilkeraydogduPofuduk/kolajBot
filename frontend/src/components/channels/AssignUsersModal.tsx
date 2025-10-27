import React, { useState, useEffect, useCallback } from 'react';
import { X, Users, Check } from 'lucide-react';
import { socialMediaChannelsAPI } from '../../api/socialMediaChannels';
import { usersAPI } from '../../api/users';
import toast from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  brand_ids?: number[];
}

interface AssignUsersModalProps {
  channelId: number;
  channelName: string;
  brandId: number;
  currentAssignedUserIds: number[];
  currentUserId: number; // Mevcut kullanıcıyı hariç tutmak için
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignUsersModal: React.FC<AssignUsersModalProps> = ({
  channelId,
  channelName,
  brandId,
  currentAssignedUserIds,
  currentUserId,
  onClose,
  onSuccess
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>(currentAssignedUserIds);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getUsers(1, 100);
      
      // Filter users who have access to this brand and are employees
      // Exclude current user (yönetici kendini atayamaz)
      const filteredUsers = response.users.filter((user: User) => 
        user.is_active && 
        user.id !== currentUserId && // Mevcut kullanıcıyı hariç tut
        (user.role === 'Mağaza Çalışanı' || user.role === 'Mağaza Yöneticisi') &&
        user.brand_ids && 
        user.brand_ids.includes(brandId)
      );
      
      setUsers(filteredUsers);
    } catch (error) {
      toast.error('Kullanıcılar yüklenemedi');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, [brandId, currentUserId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleUser = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await socialMediaChannelsAPI.assignUsersToChannel(channelId, selectedUserIds);
      toast.success(`${selectedUserIds.length} kullanıcı atandı`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Kullanıcı atama başarısız');
      console.error('Error assigning users:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Kullanıcı Yönetimi</h2>
            <p className="text-sm text-gray-600 mt-1">{channelName}</p>
            <p className="text-xs text-gray-500 mt-1">Çalışan veya yönetici atayabilirsiniz</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">Bu markaya atanmış kullanıcı bulunamadı</p>
              <p className="text-sm text-gray-500 mt-2">Çalışan veya yönetici bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedUserIds.includes(user.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedUserIds.includes(user.id) ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Users size={20} className={selectedUserIds.includes(user.id) ? 'text-blue-600' : 'text-gray-600'} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'Mağaza Yöneticisi' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user.role === 'Mağaza Yöneticisi' ? 'Yönetici' : 'Çalışan'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                  {selectedUserIds.includes(user.id) && (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check size={16} className="text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedUserIds.length} kullanıcı seçildi
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Atanıyor...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Kaydet
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

