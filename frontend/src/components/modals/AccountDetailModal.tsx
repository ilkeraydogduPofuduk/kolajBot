import React from 'react';
import { X } from 'lucide-react';

interface AccountDetailModalProps {
  account: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (account: any) => void;
  onDelete: (accountId: number, platform: string) => void;
  onStatusChange: (accountId: number, platform: string, status: string) => void;
}

const AccountDetailModal: React.FC<AccountDetailModalProps> = ({
  account,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onStatusChange
}) => {
  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Hesap Detayları</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="text-center py-8">
          <p className="text-gray-600">
            Bu özellik yeni sistemde artık kullanılmamaktadır.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Lütfen "Sosyal Medya Yönetimi" sayfasındaki "Ayarlar" sekmesini kullanın.
          </p>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountDetailModal;