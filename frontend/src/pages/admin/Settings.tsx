import React, { useState, useEffect, useRef } from 'react';
import { settingsAPI, Setting } from '../../api/settings';
import { Settings as SettingsIcon, Database, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';


const Settings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  // const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'email' | 'general' | 'ocr' | 'upload'>('ocr');
  // const [scrollPosition, setScrollPosition] = useState(0);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSettings();
    
    // Scroll position'ı restore et
    const savedScrollPosition = sessionStorage.getItem('settings-scroll-position');
    if (savedScrollPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition));
      }, 100);
    }
    
    // Scroll event listener ekle
    const handleScroll = () => {
      // setScrollPosition(window.scrollY);
      sessionStorage.setItem('settings-scroll-position', window.scrollY.toString());
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getSettings();
      setSettings(response.settings);
      
      // Form data'yı başlat
      const initialData: Record<string, string> = {};
      response.settings.forEach(setting => {
        initialData[setting.key] = setting.value;
      });
      setFormData(initialData);
    } catch (error) {
      toast.error('Ayarlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Debounce için timer'ları sakla
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Önceki timer'ı temizle
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    
    // Yeni timer başlat - 2 saniye sonra kaydet
    debounceTimers.current[key] = setTimeout(() => {
      handleAutoSave(key, value);
    }, 2000);
  };


  const handleAutoSave = async (settingKey: string, newValue: string) => {
    try {
      // setSaving(true);
      
      // Eski değerle aynıysa kaydetme
      const originalSetting = settings.find(s => s.key === settingKey);
      if (originalSetting && newValue === originalSetting.value) {
        return;
      }

      // Category'yi bul
      const category = originalSetting?.category || 'general';
      
      await settingsAPI.updateSetting(settingKey, newValue, category);
      
      // Sadece ilgili setting'i güncelle (tüm sayfayı yenileme)
      setSettings(prev => prev.map(s => 
        s.key === settingKey ? { ...s, value: newValue } : s
      ));
      
      // FormData'yı güncelle
      setFormData(prev => ({ ...prev, [settingKey]: newValue }));
      
      // Scroll position'ı koru
      const currentScrollPosition = window.scrollY;
      sessionStorage.setItem('settings-scroll-position', currentScrollPosition.toString());
      
      toast.success(`${settingKey.replace(/_/g, ' ')} güncellendi`, { duration: 2000 });
      
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ayar kaydedilemedi');
    } finally {
      // setSaving(false);
    }
  };


  // const getSettingIcon = (key: string) => {
  //   if (key.includes('email') || key.includes('notification')) return Mail;
  //   if (key.includes('site') || key.includes('url')) return Globe;
  //   if (key.includes('session') || key.includes('timeout') || key.includes('expire')) return Clock;
  //   if (key.includes('login') || key.includes('security') || key.includes('password')) return SettingsIcon;
  //   if (key.includes('user') || key.includes('employee')) return Users;
  //   if (key.includes('backup') || key.includes('database')) return Database;
  //   return SettingsIcon;
  // };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Mağaza Yöneticisi için görülebilir ayarları filtrele
  const getVisibleSettings = (settings: Setting[]) => {
    if (!user) return settings;
    
    if (user.role === 'Super Admin') {
      return settings; // Super Admin tüm ayarları görebilir
    }
    
    if (user.role === 'Mağaza Yöneticisi') {
      // Mağaza Yöneticisi sadece belirli ayarları görebilir
      return settings.filter(setting => {
        const allowedCategories = ['email', 'general'];
        const allowedKeys = [
          'from_email', 'from_name', 'company_name', 'support_email', 'support_phone',
          'smtp_server', 'smtp_port', 'smtp_username', 'smtp_password', 'smtp_use_ssl', 'smtp_use_tls',
          'site_name', 'site_description', 'site_url'
        ];
        
        return allowedCategories.includes(setting.category) && 
               allowedKeys.includes(setting.key);
      });
    }
    
    return []; // Diğer roller ayarları göremez
  };

  // const getCategoryIcon = (category: string) => {
  //   switch (category) {
  //     case 'E-posta Ayarları':
  //       return <Mail className="h-5 w-5 text-blue-600" />;
  //     case 'Güvenlik':
  //       return <SettingsIcon className="h-5 w-5 text-red-600" />;
  //     case 'Sistem':
  //       return <Database className="h-5 w-5 text-orange-600" />;
  //     case 'Genel Ayarlar':
  //       return <Globe className="h-5 w-5 text-indigo-600" />;
  //     default:
  //       return <SettingsIcon className="h-5 w-5 text-gray-600" />;
  //   }
  // };

  // Kategori sıralama düzeni
  // const categoryOrder = [
  //   'Genel Ayarlar',
  //   'E-posta Ayarları', 
  //   'Güvenlik',
  //   'Sistem',
  //   'Diğer'
  // ];

  const renderSettingInput = (setting: Setting) => {
    const value = formData[setting.key] || '';
    
    // Boolean settings
    if (setting.value === 'true' || setting.value === 'false') {
      return (
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => handleInputChange(setting.key, e.target.checked ? 'true' : 'false')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <span className="text-sm font-medium text-gray-700">
            {value === 'true' ? 'Aktif' : 'Pasif'}
          </span>
        </div>
      );
    }
    
    // Select options for specific settings
    if (setting.key === 'backup_frequency') {
      return (
        <select
          value={value}
          onChange={(e) => handleInputChange(setting.key, e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
        >
          <option value="hourly">🕐 Saatlik</option>
          <option value="daily">📅 Günlük</option>
          <option value="weekly">📆 Haftalık</option>
          <option value="monthly">🗓️ Aylık</option>
        </select>
      );
    }
    
    // SMTP Port select
    if (setting.key === 'smtp_port') {
      return (
        <select
          value={value}
          onChange={(e) => handleInputChange(setting.key, e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
        >
          <option value="25">🔌 25 (SMTP)</option>
          <option value="587">🔒 587 (TLS)</option>
          <option value="465">🔐 465 (SSL)</option>
          <option value="2525">🔧 2525 (Alternatif)</option>
        </select>
      );
    }
    
    // SSL/TLS boolean settings
    if (setting.key === 'smtp_use_ssl' || setting.key === 'smtp_use_tls' || setting.key === 'enabled') {
      return (
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => handleInputChange(setting.key, e.target.checked ? 'true' : 'false')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <span className="text-sm font-medium text-gray-700">
            {value === 'true' ? 'Aktif' : 'Pasif'}
          </span>
        </div>
      );
    }
    
    // Password fields
    if (setting.key.includes('password')) {
      const isPasswordVisible = showPasswords[setting.key] || false;
      return (
        <div className="relative">
          <input
            type={isPasswordVisible ? "text" : "password"}
            value={value}
            onChange={(e) => handleInputChange(setting.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200 pr-10"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility(setting.key)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
          >
            {isPasswordVisible ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
      );
    }
    
    // Number inputs
    if (setting.key.includes('max_') || setting.key.includes('timeout') || setting.key.includes('expire')) {
      return (
        <div className="relative">
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(setting.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
            min="0"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <span className="text-gray-400 text-sm">🔢</span>
          </div>
        </div>
      );
    }
    
    // Text area for long descriptions
    if (setting.key.includes('description') || setting.key.includes('message')) {
      return (
        <textarea
          value={value}
          onChange={(e) => handleInputChange(setting.key, e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200 resize-none"
          rows={3}
          placeholder="Açıklama giriniz..."
        />
      );
    }
    
    // Email inputs
    if (setting.key.includes('email')) {
      return (
        <div className="relative">
          <input
            type="email"
            value={value}
            onChange={(e) => handleInputChange(setting.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200 pr-10"
            placeholder="ornek@email.com"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <span className="text-gray-400 text-sm">📧</span>
          </div>
        </div>
      );
    }
    
    // Default text input
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(setting.key, e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
        placeholder="Değer giriniz..."
      />
    );
  };



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Ayarlar yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sistem Ayarları</h1>
          <p className="text-gray-600">Sistem geneli ayarlarını yönetin</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(() => {
            const allTabs = [
              { id: 'ocr', name: 'OCR / AI Ayarları', icon: Eye },
              { id: 'upload', name: 'Yükleme Ayarları', icon: Database },
              { id: 'email', name: 'E-posta Ayarları', icon: Mail },
              { id: 'general', name: 'Genel Ayarlar', icon: SettingsIcon }
            ];
            
            // DİNAMİK: settings.manage yetkisi yoksa sadece belirli tab'ları göster
            if (!user?.permissions?.includes('settings.manage')) {
              return allTabs.filter(tab => ['email', 'general'].includes(tab.id));
            }
            
            return allTabs;
          })().map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>


      {/* Tab Content */}

      {/* Email Settings Tab */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Mail className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">E-posta Ayarları</h2>
                    <p className="text-sm text-gray-500">
                      {getVisibleSettings(settings).filter(s => s.category === 'email').length} ayar
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {getVisibleSettings(settings)
                  .filter(s => s.category === 'email')
                  .sort((a, b) => a.key.localeCompare(b.key))
                  .map((setting) => (
                    <div key={setting.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100">
                          <Mail className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-2">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h3>
                            <p className="text-xs text-gray-500">{setting.description}</p>
                          </div>
                          <div>
                            {renderSettingInput(setting)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* OCR / AI Settings Tab */}
      {activeTab === 'ocr' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Eye className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">OCR / AI Ayarları</h2>
                  <p className="text-sm text-gray-500">
                    Google AI Vision API ve OCR işleme ayarları
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {getVisibleSettings(settings)
                  .filter(s => s.category === 'ocr')
                  .sort((a, b) => a.key.localeCompare(b.key))
                  .map((setting) => (
                    <div key={setting.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 p-2 rounded-lg bg-purple-100">
                          <Eye className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-2">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {setting.description || setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {setting.key === 'google_ai_api_key' && 'Google Cloud Console\'dan alınabilir'}
                              {setting.key === 'parallel_workers' && 'Aynı anda kaç görsel işlenebilir (önerilen: 10)'}
                              {setting.key === 'ocr_timeout' && 'Her bir OCR işlemi için maksimum bekleme süresi'}
                              {setting.key === 'ocr_retry_count' && 'Hata durumunda yeniden deneme sayısı'}
                            </p>
                          </div>
                          <div>
                            {renderSettingInput(setting)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              
              {/* Warning Box */}
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Önemli Notlar</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Google AI API Key değişikliğinden sonra sistemi yeniden başlatın</li>
                        <li>Parallel workers sayısını artırmak daha fazla Google API isteği yapar (maliyet artışı)</li>
                        <li>OCR timeout değerini çok düşük tutmayın (minimum 20 saniye önerilir)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Settings Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Database className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Dosya Yükleme Ayarları</h2>
                  <p className="text-sm text-gray-500">
                    Dosya yükleme limitleri ve kısıtlamaları
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {getVisibleSettings(settings)
                  .filter(s => s.category === 'upload')
                  .sort((a, b) => a.key.localeCompare(b.key))
                  .map((setting) => (
                    <div key={setting.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 p-2 rounded-lg bg-green-100">
                          <Database className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-2">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {setting.description || setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {setting.key === 'max_file_count' && 'Tek seferde yüklenebilecek maksimum dosya sayısı'}
                              {setting.key === 'max_file_size_mb' && 'Her bir dosya için maksimum boyut (MB cinsinden)'}
                              {setting.key === 'allowed_extensions' && 'İzin verilen dosya uzantıları (virgülle ayırın)'}
                              {setting.key === 'total_upload_size_mb' && 'Toplam yükleme boyutu limiti (MB cinsinden)'}
                              {setting.key === 'storage_path' && 'Dosyaların kaydedileceği klasör yolu'}
                            </p>
                          </div>
                          <div>
                            {renderSettingInput(setting)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              
              {/* Info Box */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">Bilgi</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Dosya sayısı ve boyut limitleri anlık olarak uygulanır</li>
                        <li>İzin verilen uzantıları değiştirirken dikkatli olun (örn: jpg,jpeg,png,webp)</li>
                        <li>Toplam upload boyutu = (Dosya sayısı × Ortalama dosya boyutu) için yeterli olmalı</li>
                        <li>Önerilen: 500 dosya × 2 MB = 1000 MB toplam limit</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <SettingsIcon className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Genel Ayarlar</h2>
                  <p className="text-sm text-gray-500">
                    {getVisibleSettings(settings).filter(s => s.category === 'general').length} ayar
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {getVisibleSettings(settings)
                  .filter(s => s.category === 'general')
                  .sort((a, b) => a.key.localeCompare(b.key))
                  .map((setting) => (
                    <div key={setting.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100">
                          <SettingsIcon className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-2">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h3>
                            <p className="text-xs text-gray-500">{setting.description}</p>
                          </div>
                          <div>
                            {renderSettingInput(setting)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
