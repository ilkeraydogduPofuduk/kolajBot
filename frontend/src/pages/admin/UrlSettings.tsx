import React, { useState, useEffect } from 'react';
import { useUrlConfig } from '../../hooks/useUrlConfig';
import { settingsAPI } from '../../api/settings';
import { Save, RefreshCw, Globe, Server, Upload, Code } from 'lucide-react';
import toast from 'react-hot-toast';

const UrlSettings: React.FC = () => {
  const { config, loading, error } = useUrlConfig();
  const [editingUrls, setEditingUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setEditingUrls({
        baseUrl: config.baseUrl || '',
        apiUrl: config.apiUrl || '',
        uploadUrl: config.uploadUrl || '',
        imageUrl: config.imageUrl || '',
        frontendUrl: config.frontendUrl || ''
      });
    }
  }, [config]);

  const handleUrlChange = (key: string, value: string) => {
    setEditingUrls(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updates = Object.entries(editingUrls).map(([key, value]) => ({
        key,
        value
      }));

      await settingsAPI.updateSettings(updates);
      
      toast.success('URL ayarları başarıyla güncellendi!');
      
      // Refresh the page to reload URLs
      window.location.reload();
    } catch (error) {
      console.error('Failed to save URL settings:', error);
      toast.error('URL ayarları güncellenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const urlFields = [
    {
      key: 'backend_url',
      label: 'Backend URL',
      description: 'Backend API sunucusunun URL\'si',
      icon: Server,
      placeholder: 'https://api.yourdomain.com'
    },
    {
      key: 'frontend_url', 
      label: 'Frontend URL',
      description: 'Frontend uygulamasının URL\'si',
      icon: Globe,
      placeholder: 'https://yourdomain.com'
    },
    {
      key: 'uploads_url',
      label: 'Uploads URL', 
      description: 'Dosya yüklemelerinin URL\'si',
      icon: Upload,
      placeholder: 'https://api.yourdomain.com/uploads'
    },
    {
      key: 'api_url',
      label: 'API URL',
      description: 'API endpoint\'lerinin URL\'si', 
      icon: Code,
      placeholder: 'https://api.yourdomain.com/api'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">URL ayarları yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Hata</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">URL Ayarları</h1>
          <p className="text-gray-600">Sistem URL'lerini yönetin ve farklı ortamlar için yapılandırın</p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary flex items-center gap-2"
        >
          {saving ? (
            <RefreshCw size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      {/* URL Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {urlFields.map((field) => {
          const Icon = field.icon;
          return (
            <div key={field.key} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Icon size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{field.label}</h3>
                  <p className="text-sm text-gray-600">{field.description}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {field.label}
                </label>
                <input
                  type="url"
                  value={editingUrls[field.key] || ''}
                  onChange={(e) => handleUrlChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Environment Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Ortam Bilgisi</h3>
        <p className="text-blue-800 text-sm">
          Bu ayarlar tüm sistem genelinde kullanılır. Değişiklikler tüm sayfalarda ve API çağrılarında etkili olur.
          Sunucuya yüklerken bu URL'leri production domain'lerinizle güncelleyin.
        </p>
      </div>
    </div>
  );
};

export default UrlSettings;
