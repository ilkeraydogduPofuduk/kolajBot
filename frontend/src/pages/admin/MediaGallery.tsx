import React, { useState, useEffect, useCallback, useRef } from 'react';
import { productsAPI, Product, ProductImage, IncompleteProduct } from '../../api/products';
import { brandsAPI, Brand } from '../../api/brands';
import { settingsAPI } from '../../api/settings';
import { useUrlConfig } from '../../hooks/useUrlConfig';
import MissingFieldsModal from '../../components/modals/MissingFieldsModal';
import { 
  Upload, 
  Image as ImageIcon, 
  Eye, 
  Search,
  Filter,
  Grid,
  List,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  DollarSign,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationService } from '../../services/notificationService';

const MediaGallery: React.FC = () => {
  const { getImageURL } = useUrlConfig();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    product_types: string[];
    colors: string[];
    size_ranges: string[];
  }>({ product_types: [], colors: [], size_ranges: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [pollingActive, setPollingActive] = useState(false);
  const pollingActiveRef = useRef(false);
  
  // Upload recovery system
  const [uploadJobId, setUploadJobId] = useState<string | null>(null);
  const [uploadRecovery, setUploadRecovery] = useState<{
    isRecovering: boolean;
    jobId: string | null;
    progress: number;
  }>({ isRecovering: false, jobId: null, progress: 0 });
  const [uploadLimit, setUploadLimit] = useState<number>(200); // Optimize edildi: 100 -> 200
  const [maxFileSizeMB, setMaxFileSizeMB] = useState<number>(20); // Optimize edildi: 10 -> 20 MB
  const [totalUploadSizeMB, setTotalUploadSizeMB] = useState<number>(1000); // Optimize edildi: 500 -> 1000 MB
  
  
  // State'leri sessionStorage'dan restore et
  const [selectedBrand, setSelectedBrand] = useState<number | null>(() => {
    const saved = sessionStorage.getItem('mediaGallery_selectedBrand');
    return saved ? parseInt(saved) : null;
  });
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('mediaGallery_searchTerm') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = sessionStorage.getItem('mediaGallery_viewMode');
    return (saved as 'grid' | 'list') || 'grid';
  });
  const [page, setPage] = useState(() => {
    const saved = sessionStorage.getItem('mediaGallery_page');
    return saved ? parseInt(saved) : 1;
  });
  
  // Yeni filtreleme state'leri - çoklu seçim için array
  const [filterProductType, setFilterProductType] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('mediaGallery_filterProductType');
    return saved ? JSON.parse(saved) : [];
  });
  const [filterColor, setFilterColor] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('mediaGallery_filterColor');
    return saved ? JSON.parse(saved) : [];
  });
  const [filterSizeRange, setFilterSizeRange] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('mediaGallery_filterSizeRange');
    return saved ? JSON.parse(saved) : [];
  });
  // Price filters removed
  const [filterIncomplete, setFilterIncomplete] = useState(() => sessionStorage.getItem('mediaGallery_filterIncomplete') === 'true');
  const [filterHasSecondProduct, setFilterHasSecondProduct] = useState(() => sessionStorage.getItem('mediaGallery_filterHasSecondProduct') === 'true');
  const [filterComplete, setFilterComplete] = useState(() => sessionStorage.getItem('mediaGallery_filterComplete') === 'true');
  const [showFilters, setShowFilters] = useState(false);
  
  // Date grouping states
  const [groupByDate, setGroupByDate] = useState(() => sessionStorage.getItem('mediaGallery_groupByDate') === 'true');
  const [dateGroups, setDateGroups] = useState<{[key: string]: Product[]}>({});
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [incompleteProducts, setIncompleteProducts] = useState<IncompleteProduct[]>([]);
  const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Debounce için timer ref
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // State değişikliklerini sessionStorage'a kaydet
  useEffect(() => {
    if (selectedBrand) sessionStorage.setItem('mediaGallery_selectedBrand', selectedBrand.toString());
    sessionStorage.setItem('mediaGallery_searchTerm', searchTerm);
    sessionStorage.setItem('mediaGallery_viewMode', viewMode);
    sessionStorage.setItem('mediaGallery_page', page.toString());
    sessionStorage.setItem('mediaGallery_filterProductType', JSON.stringify(filterProductType));
    sessionStorage.setItem('mediaGallery_filterColor', JSON.stringify(filterColor));
    sessionStorage.setItem('mediaGallery_filterSizeRange', JSON.stringify(filterSizeRange));
    // Price filters removed
    sessionStorage.setItem('mediaGallery_filterIncomplete', filterIncomplete.toString());
    sessionStorage.setItem('mediaGallery_filterHasSecondProduct', filterHasSecondProduct.toString());
    sessionStorage.setItem('mediaGallery_filterComplete', filterComplete.toString());
    sessionStorage.setItem('mediaGallery_groupByDate', groupByDate.toString());
  }, [selectedBrand, searchTerm, viewMode, page, filterProductType, filterColor, filterSizeRange, filterIncomplete, filterHasSecondProduct, filterComplete, groupByDate]);

  // Upload settings yükle
  const loadUploadSettings = useCallback(async () => {
    try {
      const settings = await settingsAPI.getSettings();
      
      const maxFileCountSetting = settings.settings.find(s => s.key === 'max_file_count');
      if (maxFileCountSetting) {
        setUploadLimit(parseInt(maxFileCountSetting.value) || 100);
      }
      
      const maxFileSizeSetting = settings.settings.find(s => s.key === 'max_file_size_mb');
      if (maxFileSizeSetting) {
        setMaxFileSizeMB(parseInt(maxFileSizeSetting.value) || 10);
      }
      
      const totalUploadSizeSetting = settings.settings.find(s => s.key === 'total_upload_size_mb');
      if (totalUploadSizeSetting) {
        setTotalUploadSizeMB(parseInt(totalUploadSizeSetting.value) || 500);
      }
    } catch (error) {
      console.error('Upload settings yüklenemedi:', error);
    }
  }, []);

  // Refresh fonksiyonu - manuel yenileme i�in
  const refreshProducts = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (filterProductType.length > 0) filters.product_type = filterProductType;
      if (filterColor.length > 0) filters.color = filterColor;
      if (filterSizeRange.length > 0) filters.size_range = filterSizeRange;
      if (filterIncomplete) filters.incomplete = true;
      if (filterComplete) filters.complete = true;
      if (filterHasSecondProduct) filters.has_second_product = true;

      const response = await productsAPI.getProducts(
        page,
        20,
        selectedBrand || undefined,
        searchTerm || undefined,
        Object.keys(filters).length > 0 ? filters : undefined
      );

      setProducts(response.products);
      setTotalPages(response.total_pages);
      setApiError(null);
      
      // Group by date if enabled
      if (groupByDate) {
        groupProductsByDate(response.products || []);
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const message = detail && typeof detail === 'string' && detail.trim().length > 0
        ? detail
        : 'Urun listesi sunucudan alinirken bir hata olustu (HTTP 500). Lutfen sistem yoneticinize haber verin.';
      setApiError(message);
      toast.error('Urunler yuklenirken hata olustu');
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, [page, selectedBrand, searchTerm, filterProductType, filterColor, filterSizeRange, filterIncomplete, filterHasSecondProduct, groupByDate]);

  // Group products by date
  const groupProductsByDate = useCallback((products: Product[]) => {
    const groups: {[key: string]: Product[]} = {};
    
    products.forEach(product => {
      if (product.created_at) {
        const date = new Date(product.created_at);
        const dateKey = date.toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(product);
      }
    });
    
    // Sort groups by date (newest first)
    const sortedGroups: {[key: string]: Product[]} = {};
    Object.keys(groups)
      .sort((a, b) => {
        const dateA = new Date(groups[a][0].created_at!);
        const dateB = new Date(groups[b][0].created_at!);
        return dateB.getTime() - dateA.getTime();
      })
      .forEach(key => {
        sortedGroups[key] = groups[key];
      });
    
    setDateGroups(sortedGroups);
  }, []);

  const loadBrands = useCallback(async () => {
    try {
      // ✅ Sadece ürünü olan markaları getir
      const response = await brandsAPI.getBrandsWithProducts();
      setBrands(response.brands);
      
      // ✅ Otomatik marka seçme - kullanıcı manuel seçsin
      // İlk yüklemede tüm ürünleri göster
    } catch (error: any) {
      toast.error('Markalar yüklenirken hata oluştu');
      console.error('Error loading brands:', error);
    }
  }, []);

  const loadFilterOptions = useCallback(async () => {
    try {
      const options = await productsAPI.getFilterOptions();
      setFilterOptions(options);
    } catch (error: any) {
      console.error('Error loading filter options:', error);
      setApiError(prev => prev ?? 'Filtre se�enekleri sunucudan alinamadi. Lutfen sistem yoneticinize haber verin.');
    }
  }, []);

  const handleRetry = useCallback(() => {
    setApiError(null);
    loadBrands();
    loadFilterOptions();
    refreshProducts();
  }, [loadBrands, loadFilterOptions, refreshProducts]);

  // Upload settings yükle
  useEffect(() => {
    loadUploadSettings();
    checkForUploadRecovery();
  }, [loadUploadSettings]);

  // Upload recovery system
  const checkForUploadRecovery = useCallback(() => {
    const savedUploadJob = localStorage.getItem('uploadJobId');
    const savedUploadProgress = localStorage.getItem('uploadProgress');
    
    if (savedUploadJob && savedUploadProgress) {
      setUploadRecovery({
        isRecovering: true,
        jobId: savedUploadJob,
        progress: parseInt(savedUploadProgress)
      });
      
      // Resume upload monitoring
      resumeUploadMonitoring(savedUploadJob);
    }
  }, []);

  const resumeUploadMonitoring = useCallback(async (jobId: string) => {
    try {
      setUploading(true);
      setUploadProgress(parseInt(localStorage.getItem('uploadProgress') || '0'));
      setUploadStatus('Yükleme devam ediyor...');
      
      // Start polling for upload status - OPTIMIZED with timeout
      let pollCount = 0;
      const maxPolls = 120; // 10 minutes max (120 * 5s)
      
      const interval = setInterval(async () => {
        pollCount++;
        
        // Timeout after 10 minutes
        if (pollCount > maxPolls) {
          clearInterval(interval);
          setUploading(false);
          setUploadStatus('Yükleme zaman aşımına uğradı');
          toast.error('Yükleme çok uzun sürdü, lütfen sayfayı yenileyin');
          return;
        }
        
        try {
          const response = await fetch(`/api/products/upload-status/${jobId}`);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.status === 'completed') {
            clearInterval(interval);
            setUploading(false);
            setUploadProgress(100);
            setUploadStatus('Yükleme tamamlandı!');
            
            // Clear recovery data
            localStorage.removeItem('uploadJobId');
            localStorage.removeItem('uploadProgress');
            setUploadRecovery({ isRecovering: false, jobId: null, progress: 0 });
            
            // Reload products
            await refreshProducts(); // Better than window.location.reload()
            toast.success('Yükleme başarıyla tamamlandı!');
          } else if (data.status === 'failed' || data.status === 'error') {
            clearInterval(interval);
            setUploading(false);
            setUploadStatus('Yükleme başarısız!');
            
            // Clear recovery data
            localStorage.removeItem('uploadJobId');
            localStorage.removeItem('uploadProgress');
            setUploadRecovery({ isRecovering: false, jobId: null, progress: 0 });
            
            toast.error('Yükleme başarısız oldu!');
          } else if (data.progress !== undefined) {
            // Use backend calculated progress
            setUploadProgress(data.progress);
            localStorage.setItem('uploadProgress', data.progress.toString());
            setUploadStatus(`İşleniyor: ${data.processed_files}/${data.total_files} dosya`);
          }
        } catch (error) {
          console.error('Upload status check error:', error);
          // Don't stop polling on network errors, just log them
        }
      }, 5000); // Poll every 5 seconds
      
      // Store interval ID for cleanup
      setUploadRecovery({ isRecovering: true, jobId, progress: 0 });
      
    } catch (error) {
      console.error('Upload recovery error:', error);
      setUploadRecovery({ isRecovering: false, jobId: null, progress: 0 });
    }
  }, []);

  const cancelUploadRecovery = useCallback(() => {
    localStorage.removeItem('uploadJobId');
    localStorage.removeItem('uploadProgress');
    setUploadRecovery({ isRecovering: false, jobId: null, progress: 0 });
    setUploading(false);
    setUploadProgress(0);
    setUploadStatus('');
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      setPollingActive(false);
      pollingActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        // Filtreleri backend'e g�nder (sadece dolu olanlar�)
        const filters: any = {};
        if (filterProductType.length > 0) filters.product_type = filterProductType;
        if (filterColor.length > 0) filters.color = filterColor;
        if (filterSizeRange.length > 0) filters.size_range = filterSizeRange;
        // Price filters removed
        if (filterIncomplete) filters.incomplete = true;
        if (filterComplete) filters.complete = true;
        if (filterHasSecondProduct) filters.has_second_product = true;

        // Backend'den filtrelenmi� �r�nleri al
        const response = await productsAPI.getProducts(
          page,
          20,
          selectedBrand || undefined,
          searchTerm || undefined,
          Object.keys(filters).length > 0 ? filters : undefined
        );

        // UNKNOWN ve DEFAULT de�erlerini frontend'de de filtrele
        const filteredProducts = response.products.filter(product =>
          product.code !== 'UNKNOWN' &&
          product.code !== 'DEFAULT_CODE' &&
          product.color !== 'UNKNOWN' &&
          product.color !== 'DEFAULT'
        );

        setProducts(filteredProducts);
        setTotalPages(response.total_pages);
        setApiError(null);
      } catch (error: any) {
        const detail = error?.response?.data?.detail;
        const message = detail && typeof detail === 'string'
          ? detail
          : 'Urun listesi sunucudan alinirken bir hata olustu (HTTP 500). Lutfen sistem yoneticinize haber verin.';
        setApiError(message);
        toast.error('Urunler yuklenirken hata olustu');
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Sayfa değişikliklerinde direkt yükle
    if (page !== 1) {
      fetchProducts();
      return;
    }
    
    // Arama veya filtreler için debounce uygula
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      fetchProducts();
    }, 500); // 500ms delay - kullanıcı yazmayı bitirince arama yap
    
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [page, searchTerm, filterProductType, filterColor, filterSizeRange, filterIncomplete, filterHasSecondProduct, selectedBrand]);

  useEffect(() => {
    loadBrands();
    loadFilterOptions();
  }, [loadBrands, loadFilterOptions]);

  const validateFiles = (files: File[]): { valid: boolean; message?: string; validFiles: File[] } => {
    // Dosya sayısı kontrolü
    if (files.length > uploadLimit) {
      return {
        valid: false,
        message: `Maksimum ${uploadLimit} dosya seçebilirsiniz. ${files.length} dosya seçtiniz. İlk ${uploadLimit} dosya kabul edilecek.`,
        validFiles: files.slice(0, uploadLimit)
      };
    }

    // Dosya boyutu kontrolü
    const oversizedFiles: string[] = [];
    const validFiles: File[] = [];
    let totalSizeMB = 0;

    for (const file of files) {
      const fileSizeMB = file.size / (1024 * 1024);
      
      if (fileSizeMB > maxFileSizeMB) {
        oversizedFiles.push(`${file.name} (${fileSizeMB.toFixed(2)} MB)`);
      } else {
        validFiles.push(file);
        totalSizeMB += fileSizeMB;
      }
    }

    if (oversizedFiles.length > 0) {
      return {
        valid: false,
        message: `Bazı dosyalar çok büyük (maksimum ${maxFileSizeMB} MB):\n${oversizedFiles.join('\n')}\n\nBu dosyalar yüklenmeyecek.`,
        validFiles
      };
    }

    // Toplam boyut kontrolü
    if (totalSizeMB > totalUploadSizeMB) {
      return {
        valid: false,
        message: `Toplam dosya boyutu çok büyük: ${totalSizeMB.toFixed(2)} MB. Maksimum: ${totalUploadSizeMB} MB. Lütfen daha az dosya seçin.`,
        validFiles: []
      };
    }

    return { valid: true, validFiles };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    const validation = validateFiles(files);
    
    if (!validation.valid) {
      toast.error(validation.message || 'Dosya seçimi geçersiz');
      if (validation.validFiles.length > 0) {
        setSelectedFiles(validation.validFiles);
        setShowUploadModal(true);
      }
      return;
    }
    
    setSelectedFiles(validation.validFiles);
    setShowUploadModal(true);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      notificationService.error('Lütfen yüklenecek dosyaları seçin');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadStatus(`${selectedFiles.length} dosya yükleniyor...`);
      
      // Start upload and get job ID
      const response = await productsAPI.uploadProductImages(selectedFiles);
      
      if (response.job_id) {
        // Save job ID for recovery
        localStorage.setItem('uploadJobId', response.job_id.toString());
        localStorage.setItem('uploadProgress', '0');
        
        setUploadJobId(response.job_id.toString());
        setPollingActive(true);
        pollingActiveRef.current = true;
        // Poll for progress using job ID - OPTIMIZED
        let pollCount = 0;
        const maxPolls = 120; // 10 minutes max
        
        const pollProgress = async () => {
          // Check polling state at the start of each poll
          if (!pollingActiveRef.current) return; // Stop polling if flag is false
          
          pollCount++;
          if (pollCount > maxPolls) {
            setPollingActive(false);
            pollingActiveRef.current = false;
            setUploading(false);
            toast.error('Yükleme zaman aşımına uğradı');
            return;
          }
          
          try {
            const statusResponse = await productsAPI.getUploadJobStatus(response.job_id!);
            const { status, processed_files, total_files, failed_files, progress } = statusResponse;
            
            // Use backend calculated progress if available, otherwise calculate
            const progressPercent = progress !== undefined ? progress : 
              (total_files > 0 ? Math.round((processed_files / total_files) * 100) : 0);
            setUploadProgress(progressPercent);
            localStorage.setItem('uploadProgress', progressPercent.toString());
            
            if (status === 'completed') {
              setUploadStatus(`Yükleme tamamlandı! ${processed_files} dosya işlendi`);
              setPollingActive(false); // Stop polling
              pollingActiveRef.current = false;
              
              // Clear recovery data
              localStorage.removeItem('uploadJobId');
              localStorage.removeItem('uploadProgress');
              setUploadJobId(null);
              
              // Handle results
              if (response.incomplete_products && response.incomplete_products.length > 0) {
                setIncompleteProducts(response.incomplete_products);
                setShowMissingFieldsModal(true);
                setShowUploadModal(false);
                notificationService.warning(`Kısmi başarı: ${response.products_created} ürün oluşturuldu, ${response.incomplete_products.length} ürün eksik bilgi nedeniyle oluşturulamadı`);
              } else {
                notificationService.success(`${response.products_created} ürün başarıyla oluşturuldu`);
                setSelectedFiles([]);
                setShowUploadModal(false);
                refreshProducts(); // Listeyi yenile
              }
              setUploading(false);
            } else if (status === 'failed' || status === 'error') {
              setUploadStatus('Yükleme başarısız oldu');
              setPollingActive(false); // Stop polling
              pollingActiveRef.current = false;
              
              // Clear recovery data
              localStorage.removeItem('uploadJobId');
              localStorage.removeItem('uploadProgress');
              setUploadJobId(null);
              
              notificationService.error('Yükleme işlemi başarısız oldu');
              setUploading(false);
            } else {
              // Still processing, update status and continue polling
              setUploadStatus(`${processed_files}/${total_files} dosya işlendi (${failed_files} hata)`);
              if (pollingActiveRef.current) {
                setTimeout(pollProgress, 5000); // OPTIMIZED: 2s -> 5s
              }
            }
          } catch (error) {
            console.error('Progress polling error:', error);
            setUploadStatus('Yükleme durumu kontrol edilemiyor');
            if (pollingActiveRef.current) {
              setTimeout(pollProgress, 5000); // Retry after 5 seconds
            }
          }
        };
        
        // Start polling
        pollProgress();
      } else {
        // Fallback for immediate response (no job ID)
        setUploadProgress(100);
        setUploadStatus('Yükleme tamamlandı!');
        
        if (response.success) {
          if (response.incomplete_products && response.incomplete_products.length > 0) {
            setIncompleteProducts(response.incomplete_products);
            setShowMissingFieldsModal(true);
            setShowUploadModal(false);
            notificationService.warning(`Kısmi başarı: ${response.products_created} ürün oluşturuldu, ${response.incomplete_products.length} ürün eksik bilgi nedeniyle oluşturulamadı`);
          } else {
            notificationService.success(`${response.products_created} ürün başarıyla oluşturuldu`);
            setSelectedFiles([]);
            setShowUploadModal(false);
            refreshProducts();
          }
        } else {
          notificationService.error('Bilinmeyen hata oluştu');
        }
        setUploading(false);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Bilinmeyen hata';
      notificationService.custom(errorMsg, 'error' as any, 5000);
      console.error('Upload error:', error);
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
      setPollingActive(false); // Stop polling on error
      pollingActiveRef.current = false;
    }
  };



  const clearAllFilters = () => {
    setFilterProductType([]);
    setFilterColor([]);
    setFilterSizeRange([]);
    setFilterIncomplete(false);
    setFilterComplete(false);
    setFilterHasSecondProduct(false);
    setSearchTerm('');
    setPage(1);
  };


  const handleCompleteMissingFields = async (completionData: Array<{
    product_id: number;
    product_type?: string;
    size_range?: string;
    price?: number;
  }>) => {
    try {
      const response = await productsAPI.completeProductsBulk(completionData);
      if (response.success) {
        toast.success(`${response.updated_count} ürün bilgileri tamamlandı`);
        setShowMissingFieldsModal(false);
        setIncompleteProducts([]);
        refreshProducts(); // Listeyi yenile
      } else {
        toast.error('Bilgi tamamlama başarısız');
      }
    } catch (error: any) {
      toast.error('Bilgi tamamlama sırasında hata oluştu');
      console.error('Complete error:', error);
    }
  };

  const getProductStatusIcon = (product: Product) => {
    if (product.is_processed) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else {
      return null; // No icon for unprocessed products
    }
  };

  const getProductStatusText = (product: Product) => {
    if (product.is_processed) {
      return 'Hazır';
    } else {
      return 'İşleniyor';
    }
  };

  const getCoverImage = (product: Product): ProductImage | null => {
    const images = product.images || [];
    
    // SADECE ETİKET OLMAYAN GÖRSELLERİ AL
    const nonTagImages = images.filter(img => {
      // Etiket görsellerini kesinlikle hariç tut
      if (img.image_type === 'tag' || img.image_type === 'collage') return false;
      
      const filename = img.filename || img.original_filename || '';
      
      // Dosya adında 'tag' veya 'etiket' varsa hariç tut
      if (/tag|etiket/i.test(filename)) return false;
      
      // Dosya adında sayı OLMAYAN dosyalar etiket olabilir - hariç tut
      if (!/\d+\.(jpg|jpeg|png)$/i.test(filename)) return false;
      
      return true;
    });
    
    if (nonTagImages.length === 0) {
      return null;
    }
    
    // EN KÜÇÜK SAYILI GÖRSELİ BUL (COVER OLSUN OLMASIN)
    const sortedByNumber = [...nonTagImages].sort((a, b) => {
      const filenameA = a.filename || a.original_filename || '';
      const filenameB = b.filename || b.original_filename || '';
      
      // Dosya adından sayıyı çıkar
      const matchA = filenameA.match(/(\d+)\.(jpg|jpeg|png)$/i);
      const matchB = filenameB.match(/(\d+)\.(jpg|jpeg|png)$/i);
      
      const numberA = matchA ? parseInt(matchA[1]) : 999999;
      const numberB = matchB ? parseInt(matchB[1]) : 999999;
      
      return numberA - numberB;
    });
    
    // EN KÜÇÜK SAYILI OLANINI DÖN
    return sortedByNumber[0] || null;
  };

  if (apiError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-800">Veriler yuklenemedi</h2>
          <p className="text-gray-600 max-w-xl">{apiError}</p>
        </div>
        <button
          onClick={handleRetry}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Medya galerisi yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Recovery Banner */}
      {uploadRecovery.isRecovering && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-800 mb-1">Yükleme Devam Ediyor</h3>
              <p className="text-blue-700 text-sm mb-3">
                Önceki yükleme işlemi devam ediyor. İşlem tamamlanana kadar bekleyin.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadRecovery.progress}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-blue-800">{uploadRecovery.progress}%</span>
                <button
                  onClick={cancelUploadRecovery}
                  className="btn btn-sm btn-ghost text-blue-600 hover:text-blue-800"
                >
                  İptal Et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bilgilendirme Mesajı - Temiz Modern Tasarım */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-5">
        <div className="flex items-start gap-4">
          {/* İkon */}
          <div className="flex-shrink-0 pt-0.5">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          
          {/* İçerik */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Depolama Bilgisi</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Ürün görselleri ve kolajlar <span className="font-medium text-gray-900">24 saat</span> boyunca ücretsiz olarak saklanmaktadır. Daha uzun süre depolama için premium paketlerimizi inceleyebilirsiniz.
            </p>
          </div>
          
          {/* Buton */}
          <div className="flex-shrink-0">
            <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors duration-200">
              Premium
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ürünler</h1>
          <p className="text-gray-600">Ürün görsellerini yönetin ve AI ile işleyin</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => document.getElementById('file-upload')?.click()}
            className="btn btn-primary flex items-center gap-2"
          >
            <Upload size={18} />
            Görsel Yükle
          </button>
          
          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Arama & Filtreleme</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter size={16} />
              {showFilters ? 'Filtreleri Gizle' : 'Gelişmiş Filtreler'}
            </button>
            {(filterProductType.length > 0 || filterColor.length > 0 || filterSizeRange.length > 0 || filterIncomplete || filterComplete || filterHasSecondProduct) && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                <X size={16} />
                Tümünü Temizle
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search - Ürün Kodu ve Ürün Adı */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Ürün ara..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Brand Filter */}
          <select
            value={selectedBrand || ''}
            onChange={(e) => { setSelectedBrand(Number(e.target.value) || null); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tüm Markalar</option>
            {brands.map(brand => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>

          {/* View Mode & Options Combined */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Grid görünüm"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Liste görünüm"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setGroupByDate(!groupByDate)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                groupByDate 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Tarihe göre grupla"
            >
              📅 {groupByDate ? 'Gruplu' : 'Grup'}
            </button>
            <button
              onClick={refreshProducts}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              title="Yenile"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        
        {/* Gelişmiş Filtreler */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Ürün Tipi */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ürün Tipi</label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1">
                  {filterOptions.product_types.map(type => (
                    <label key={type} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filterProductType.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterProductType([...filterProductType, type]);
                          } else {
                            setFilterProductType(filterProductType.filter(t => t !== type));
                          }
                          setPage(1);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Renk */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Renk</label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1">
                  {filterOptions.colors.map(color => (
                    <label key={color} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filterColor.includes(color)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterColor([...filterColor, color]);
                          } else {
                            setFilterColor(filterColor.filter(c => c !== color));
                          }
                          setPage(1);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{color}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Beden */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Beden</label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1">
                  {filterOptions.size_ranges.map(size => (
                    <label key={size} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filterSizeRange.includes(size)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterSizeRange([...filterSizeRange, size]);
                          } else {
                            setFilterSizeRange(filterSizeRange.filter(s => s !== size));
                          }
                          setPage(1);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{size}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Price filters removed */}
              
              {/* Özel Filtreler */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterIncomplete}
                    onChange={(e) => { setFilterIncomplete(e.target.checked); setPage(1); }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Eksik Bilgiler</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterComplete}
                    onChange={(e) => { setFilterComplete(e.target.checked); setPage(1); }}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>Tam Bilgiler</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterHasSecondProduct}
                    onChange={(e) => { setFilterHasSecondProduct(e.target.checked); setPage(1); }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Çift Ürün</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products Grid/List */}
      {products.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz ürün yok</h3>
          <p className="text-gray-600 mb-4">İlk ürün görsellerinizi yükleyerek başlayın</p>
          <button
            onClick={() => document.getElementById('file-upload')?.click()}
            className="btn btn-primary"
          >
            <Plus size={18} className="mr-2" />
            Görsel Yükle
          </button>
        </div>
      ) : groupByDate && Object.keys(dateGroups).length > 0 ? (
        // Date grouped view
        <div className="space-y-8">
          {Object.entries(dateGroups).map(([date, dateProducts]) => (
            <div key={date} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Date Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">📅 {date}</h3>
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                    {dateProducts.length} ürün
                  </span>
                </div>
              </div>
              
              {/* Products in this date group */}
              <div className="p-6">
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6' : 'space-y-4'}>
                  {dateProducts.map((product) => {
            const coverImage = getCoverImage(product);
            
            return (
              <div
                key={product.id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
              >
                {/* Product Image */}
                <div className={`${viewMode === 'list' ? 'w-48 h-48 flex-shrink-0' : 'h-64'} bg-gray-100 relative overflow-hidden`}>
                  {coverImage ? (
                    <img
                      src={getImageURL(coverImage.file_path)}
                      alt={product.name}
                      className="w-full h-full object-contain bg-white"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      {/* Marka Adı */}
                      <p className="text-xs font-semibold text-blue-600 mb-1 truncate" title={product.brand_name || product.brand?.name}>
                        {product.brand_name || product.brand?.name || 'Marka Yok'}
                      </p>
                      {/* Ürün Kodu */}
                      <h3 className="font-medium text-gray-900 truncate" title={product.code}>
                        {product.code.length > 20 ? `${product.code.substring(0, 20)}...` : product.code}
                      </h3>
                      {/* Renk */}
                      <p className="text-sm text-gray-600 truncate" title={product.color}>
                        {product.color && product.color.length > 15 ? `${product.color.substring(0, 15)}...` : product.color}
                      </p>
                    </div>
                    {getProductStatusIcon(product)}
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>{(product.images || []).length} görsel</span>
                    <span>{getProductStatusText(product)}</span>
                  </div>

                  {/* VIEW MODE */}
                  <div className="space-y-1.5 mb-3">
                    <div className={`text-sm ${!product.product_type ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                      <span className="font-medium text-gray-700">Tip:</span> {product.product_type || '❌ Eksik'}
                    </div>
                    <div className={`text-sm ${!product.size_range ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                      <span className="font-medium text-gray-700">Beden:</span> {product.size_range || '❌ Eksik'}
                    </div>
                    <div className={`text-sm ${!product.price ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                      <span className="font-medium text-gray-700">Fiyat:</span> {product.price ? `$${product.price}` : '❌ Eksik'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.location.href = `/admin/products/${product.id}`}
                      className="btn btn-sm btn-secondary flex items-center gap-1"
                    >
                      <Eye size={14} />
                      Detay
                    </button>
                  </div>
                </div>
              </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Regular view (non-grouped)
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6' : 'space-y-4'}>
          {products.map((product) => {
            const coverImage = getCoverImage(product);
            
            return (
              <div
                key={product.id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
              >
                {/* Product Image */}
                <div className={`${viewMode === 'list' ? 'w-48 h-48 flex-shrink-0' : 'h-64'} bg-gray-100 relative overflow-hidden`}>
                  {coverImage ? (
                    <img
                      src={getImageURL(coverImage.file_path)}
                      alt={product.name}
                      className="w-full h-full object-contain bg-white"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <ImageIcon size={48} className="text-gray-400" />
                    </div>
                  )}
                  
                  {/* Image count badge */}
                  <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-full">
                    {product.images?.length || 0} görsel
                  </div>
                  
                  {/* Status badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {(!product.product_type || !product.color || !product.size_range || !product.price) && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        ❌ Eksik
                      </span>
                    )}
                    {product.product_type && product.color && product.size_range && product.price && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        ✅ Tam
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Info */}
                <div className={`p-4 ${viewMode === 'list' ? 'flex-1 flex flex-col justify-between' : ''}`}>
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">{product.code}</h3>
                    <p className="text-gray-600 text-sm mb-2">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.brand_name}</p>
                  </div>

                  {/* Product Details */}
                  <div className="space-y-1 mb-4">
                    <div className={`text-sm ${!product.product_type ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                      <span className="font-medium text-gray-700">Tip:</span> {product.product_type || '❌ Eksik'}
                    </div>
                    <div className={`text-sm ${!product.color ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                      <span className="font-medium text-gray-700">Renk:</span> {product.color || '❌ Eksik'}
                    </div>
                    <div className={`text-sm ${!product.size_range ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                      <span className="font-medium text-gray-700">Beden:</span> {product.size_range || '❌ Eksik'}
                    </div>
                    <div className={`text-sm ${!product.price ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                      <span className="font-medium text-gray-700">Fiyat:</span> {product.price ? `$${product.price}` : '❌ Eksik'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.location.href = `/admin/products/${product.id}`}
                      className="btn btn-sm btn-secondary flex items-center gap-1"
                    >
                      <Eye size={14} />
                      Detay
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn btn-sm btn-secondary"
            >
              Önceki
            </button>
            
            <span className="text-sm text-gray-600">
              Sayfa {page} / {totalPages}
            </span>
            
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn btn-sm btn-secondary"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Görsel Yükle</h3>
            
            {/* Limit Bilgileri */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Yükleme Limitleri:</h4>
              <div className="text-xs text-blue-700 space-y-1">
                <div>• Maksimum dosya sayısı: {uploadLimit} <span className="text-green-600">⚡</span></div>
                <div>• Maksimum dosya boyutu: {maxFileSizeMB} MB <span className="text-green-600">⚡</span></div>
                <div>• Toplam yükleme boyutu: {totalUploadSizeMB} MB <span className="text-green-600">⚡</span></div>
                <div className="text-green-600 font-medium mt-2">🚀 Optimize edilmiş performans!</div>
              </div>
            </div>
            
            {/* Marka seçimi kaldırıldı - otomatik tespit edilecek */}
            <div className="mb-4 p-3 bg-green-50 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="text-green-600">ℹ️</div>
                <div className="text-sm text-green-800">
                  <p className="font-medium">Otomatik Marka Tespiti</p>
                  <p className="mt-1">
                    Marka bilgisi etiketlerden otomatik olarak tespit edilecek. 
                    Sadece yetkili olduğunuz markalar yüklenecek.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                {selectedFiles.length} dosya seçildi
                {(() => {
                  const totalSizeMB = selectedFiles.reduce((sum, file) => sum + file.size / (1024 * 1024), 0);
                  return (
                    <span className="text-gray-500">
                      {' '}(Toplam: {totalSizeMB.toFixed(2)} MB)
                    </span>
                  );
                })()}
              </p>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {selectedFiles.slice(0, 10).map((file, index) => {
                  const fileSizeMB = file.size / (1024 * 1024);
                  const isOversized = fileSizeMB > maxFileSizeMB;
                  return (
                    <div key={index} className={`text-xs truncate ${isOversized ? 'text-red-600' : 'text-gray-500'}`}>
                      {file.name} ({fileSizeMB.toFixed(2)} MB)
                      {isOversized && <span className="text-red-600 font-medium"> - ÇOK BÜYÜK!</span>}
                    </div>
                  );
                })}
                {selectedFiles.length > 10 && (
                  <div className="text-xs text-gray-400 italic">
                    ... ve {selectedFiles.length - 10} dosya daha
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{uploadStatus}</span>
                  <span className="text-sm font-medium text-blue-600">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="btn btn-secondary"
                disabled={uploading}
              >
                İptal
              </button>
              <button
                onClick={handleUpload}
                className="btn btn-primary"
                disabled={uploading || selectedFiles.length > uploadLimit}
              >
                {uploading ? 'Yükleniyor...' : 'Yükle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missing Fields Modal */}
      {showMissingFieldsModal && (
        <MissingFieldsModal
          incompleteProducts={incompleteProducts}
          onComplete={handleCompleteMissingFields}
          onCancel={() => {
            setShowMissingFieldsModal(false);
            setIncompleteProducts([]);
          }}
        />
      )}

    </div>
  );
};

export default MediaGallery;
















