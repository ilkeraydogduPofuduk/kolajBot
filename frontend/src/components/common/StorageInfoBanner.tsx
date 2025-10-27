import React from 'react';

interface StorageInfoBannerProps {
  onUpgradeClick?: () => void;
}

const StorageInfoBanner: React.FC<StorageInfoBannerProps> = ({ onUpgradeClick }) => {
  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      // Varsayılan davranış - paketler sayfasına yönlendir
      window.location.href = '/admin/packages';
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/60 rounded-xl p-6 shadow-sm">
      {/* Dekoratif arka plan deseni */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -mr-16 -mt-16 blur-2xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-100/30 rounded-full -ml-12 -mb-12 blur-2xl"></div>
      
      <div className="relative flex items-start gap-4">
        {/* İkon */}
        <div className="flex-shrink-0">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        {/* İçerik */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💾</span>
            <h3 className="text-lg font-bold text-gray-900">Depolama Bilgisi</h3>
          </div>
          
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            Ürün görselleri ve kolajlar{' '}
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold text-xs">
              24 saat
            </span>{' '}
            boyunca ücretsiz olarak saklanmaktadır. 
            Daha uzun süre depolama ve gelişmiş özellikler için premium paketlerimizi inceleyebilirsiniz.
          </p>
          
          {/* Buton */}
          <button 
            onClick={handleUpgrade}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Premium'a Geç
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StorageInfoBanner;
