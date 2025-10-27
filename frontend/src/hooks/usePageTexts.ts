/**
 * usePageTexts Hook
 * Sayfa metinlerini yöneten hook
 */

import { useState, useEffect, useCallback } from 'react';

interface PageTexts {
  [key: string]: string;
}

const defaultTexts: PageTexts = {
  // Common texts
  'loading': 'Yükleniyor...',
  'error': 'Hata oluştu',
  'success': 'Başarılı',
  'save': 'Kaydet',
  'cancel': 'İptal',
  'delete': 'Sil',
  'edit': 'Düzenle',
  'add': 'Ekle',
  'search': 'Ara',
  'filter': 'Filtrele',
  'clear': 'Temizle',
  
  // Employee management
  'employees': 'Çalışanlar',
  'addEmployee': 'Çalışan Ekle',
  'editEmployee': 'Çalışan Düzenle',
  'deleteEmployee': 'Çalışan Sil',
  'employeeName': 'Çalışan Adı',
  'employeeEmail': 'E-posta',
  'employeePhone': 'Telefon',
  'employeeRole': 'Rol',
  'employeeStatus': 'Durum',
  'active': 'Aktif',
  'inactive': 'Pasif',
  
  // Product management
  'products': 'Ürünler',
  'addProduct': 'Ürün Ekle',
  'editProduct': 'Ürün Düzenle',
  'deleteProduct': 'Ürün Sil',
  'productName': 'Ürün Adı',
  'productCode': 'Ürün Kodu',
  'productPrice': 'Fiyat',
  'productStock': 'Stok',
  'productCategory': 'Kategori',
  
  // Brand management
  'brands': 'Markalar',
  'addBrand': 'Marka Ekle',
  'editBrand': 'Marka Düzenle',
  'deleteBrand': 'Marka Sil',
  'brandName': 'Marka Adı',
  'brandDescription': 'Açıklama',
  
  // Settings
  'settings': 'Ayarlar',
  'generalSettings': 'Genel Ayarlar',
  'urlSettings': 'URL Ayarları',
  'saveSettings': 'Ayarları Kaydet',
  'resetSettings': 'Ayarları Sıfırla',
  
  // Media gallery
  'mediaGallery': 'Medya Galerisi',
  'uploadImage': 'Resim Yükle',
  'selectImage': 'Resim Seç',
  'imagePreview': 'Resim Önizleme',
  
  // Social media
  'socialMedia': 'Sosyal Medya',
  'channels': 'Kanallar',
  'addChannel': 'Kanal Ekle',
  'editChannel': 'Kanal Düzenle',
  'deleteChannel': 'Kanal Sil',
  'channelName': 'Kanal Adı',
  'channelType': 'Kanal Türü',
  'channelStatus': 'Durum',
  
  // Employee requests
  'employee_requests': 'Çalışan Talepleri',
  'add_employee_request': 'Çalışan Talebi Oluştur',
  
  // My employees
  'my_employees': 'Çalışanlarım',
  'my_employees_description': 'Markalarınıza bağlı çalışanları görüntüleyin ve yönetin',
  
  // Request logs
  'requestLogs': 'İstek Kayıtları',
  'auditLogs': 'Denetim Kayıtları',
  'logDetails': 'Kayıt Detayları',
  'filterLogs': 'Kayıtları Filtrele',
  'exportLogs': 'Kayıtları Dışa Aktar'
};

export const usePageTexts = (pageKey?: string) => {
  const [texts, setTexts] = useState<PageTexts>(defaultTexts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load page-specific texts if pageKey is provided
    if (pageKey) {
      loadPageTexts(pageKey);
    }
  }, [pageKey]);

  const loadPageTexts = async (page: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real app, this would fetch from an API
      // For now, we'll use the default texts
      const pageTexts = getPageSpecificTexts(page);
      setTexts(prevTexts => ({ ...prevTexts, ...pageTexts }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load texts');
    } finally {
      setLoading(false);
    }
  };

  const getPageSpecificTexts = (page: string): PageTexts => {
    const pageTexts: { [key: string]: PageTexts } = {
      'employees': {
        'pageTitle': 'Çalışan Yönetimi',
        'pageDescription': 'Çalışanları yönetin ve düzenleyin',
        'noEmployees': 'Henüz çalışan bulunmuyor',
        'addNewEmployee': 'Yeni Çalışan Ekle'
      },
      'products': {
        'pageTitle': 'Ürün Yönetimi',
        'pageDescription': 'Ürünleri yönetin ve düzenleyin',
        'noProducts': 'Henüz ürün bulunmuyor',
        'addNewProduct': 'Yeni Ürün Ekle'
      },
      'brands': {
        'pageTitle': 'Marka Yönetimi',
        'pageDescription': 'Markaları yönetin ve düzenleyin',
        'noBrands': 'Henüz marka bulunmuyor',
        'addNewBrand': 'Yeni Marka Ekle'
      },
      'settings': {
        'pageTitle': 'Sistem Ayarları',
        'pageDescription': 'Sistem ayarlarını yönetin',
        'saveSuccess': 'Ayarlar başarıyla kaydedildi',
        'saveError': 'Ayarlar kaydedilirken hata oluştu'
      },
      'media': {
        'pageTitle': 'Medya Galerisi',
        'pageDescription': 'Medya dosyalarını yönetin',
        'noMedia': 'Henüz medya dosyası bulunmuyor',
        'uploadNewMedia': 'Yeni Medya Yükle'
      },
      'socialMedia': {
        'pageTitle': 'Sosyal Medya Kanalları',
        'pageDescription': 'Sosyal medya kanallarını yönetin',
        'noChannels': 'Henüz kanal bulunmuyor',
        'addNewChannel': 'Yeni Kanal Ekle'
      },
      'logs': {
        'pageTitle': 'Sistem Kayıtları',
        'pageDescription': 'Sistem kayıtlarını görüntüleyin',
        'noLogs': 'Henüz kayıt bulunmuyor',
        'exportSuccess': 'Kayıtlar başarıyla dışa aktarıldı'
      }
    };

    return pageTexts[page] || {};
  };

  const getText = (key: string, fallback?: string): string => {
    return texts[key] || fallback || key;
  };

  const updateText = (key: string, value: string) => {
    setTexts(prevTexts => ({ ...prevTexts, [key]: value }));
  };

  const updateTexts = (newTexts: PageTexts) => {
    setTexts(prevTexts => ({ ...prevTexts, ...newTexts }));
  };

  const resetTexts = () => {
    setTexts(defaultTexts);
  };

  const getTitle = useCallback((key: string = 'title', fallback?: string) => {
    return getText(key, fallback);
  }, [getText]);

  const getDescription = useCallback((key: string = 'description', fallback?: string) => {
    return getText(key, fallback);
  }, [getText]);

  const getButtonText = useCallback((key: string = 'button', fallback?: string) => {
    return getText(key, fallback);
  }, [getText]);

  const getStatusText = useCallback((key: string = 'status', fallback?: string) => {
    return getText(key, fallback);
  }, [getText]);

  return {
    texts,
    loading,
    error,
    getText,
    getTitle,
    getDescription,
    getButtonText,
    getStatusText,
    updateText,
    updateTexts,
    resetTexts,
    loadPageTexts
  };
};
