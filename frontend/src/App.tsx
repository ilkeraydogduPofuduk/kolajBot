import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import { Toaster } from 'react-hot-toast';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { useAuth } from './context/AuthContext';
import { settingsAPI } from './api/settings';
import Login from './pages/auth/Login';
import ChangePassword from './pages/auth/ChangePassword';

// Optimized pages
import Dashboard from './pages/admin/Dashboard';
import SocialMediaChannelsOptimized from './pages/admin/SocialMediaChannelsOptimized';
import ChannelDetailOptimized from './pages/admin/ChannelDetailOptimized';
import TelegramBots from './pages/admin/TelegramBots';
import TelegramBotDetail from './pages/admin/TelegramBotDetail';

// Legacy pages (will be optimized)
import Users from './pages/admin/Users';
import Brands from './pages/admin/Brands';
import BrandDetail from './pages/admin/BrandDetail';
import EmployeeRequests from './pages/admin/EmployeeRequests';
import Roles from './pages/admin/Roles';
import Settings from './pages/admin/Settings';
import MyEmployees from './pages/admin/MyEmployees';
import MediaGallery from './pages/admin/MediaGallery';
import ProductDetail from './pages/admin/ProductDetail';
import Collages from './pages/admin/Collages';

// Brand Manager specific pages
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
// import { RequirePermission } from './components/common/PermissionRoute';

// Protected Route Component
// DİNAMİK: Permission bazlı route koruması
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  requiredPermissions?: string[];
  requireAll?: boolean; // true ise tüm permissions gerekli, false ise herhangi biri yeterli
  allowPasswordChange?: boolean; // true ise şifre değiştirme zorunluluğu kontrolü yapılmaz
}> = ({ 
  children, 
  requiredPermissions = [],
  requireAll = false,
  allowPasswordChange = false
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Şifre değiştirme zorunluluğu kontrolü
  // Eğer kullanıcı şifre değiştirmek zorundaysa ve bu sayfa şifre değiştirme sayfası değilse, yönlendir
  if (!allowPasswordChange && user.must_change_password) {
    return <Navigate to="/auth/change-password" replace />;
  }

  // DİNAMİK: Permission kontrolü
  if (requiredPermissions.length > 0) {
    const userPermissions = user.permissions || [];
    
    const hasPermission = requireAll
      ? requiredPermissions.every(perm => userPermissions.includes(perm))
      : requiredPermissions.some(perm => userPermissions.includes(perm));
    
    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Erişim Reddedildi</h1>
            <p className="text-gray-600">Bu sayfaya erişim izniniz yok.</p>
            <p className="text-sm text-gray-500 mt-2">
              Gerekli yetki: {requiredPermissions.join(', ')}
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

// Main Layout Component
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading spinner while user data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Şifre değiştirme zorunluluğu kontrolü
  if (user && user.must_change_password) {
    return <Navigate to="/auth/change-password" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 ml-64">
          {children}
        </main>
      </div>
    </div>
  );
};

// App Content Component (AuthProvider içinde)
const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [pageTitle, setPageTitle] = useState('AI - Pofuduk DİJİTAL');
  const [metaDescription, setMetaDescription] = useState('Pofuduk DİJİTAL - AI destekli dijital marka yönetim platformu');
  const [metaKeywords, setMetaKeywords] = useState('dijital marka, AI, yapay zeka, marka yönetimi');

  useEffect(() => {
    const loadPageSettings = async () => {
      // Sadece login olmuş kullanıcılar için settings yükle
      if (!user) return;
      
      try {
        const settings = await settingsAPI.getSettings();
        
        const titleSetting = settings.settings.find(s => s.key === 'index_title');
        if (titleSetting && titleSetting.value) {
          setPageTitle(titleSetting.value);
        }
        
        const descSetting = settings.settings.find(s => s.key === 'meta_description');
        if (descSetting && descSetting.value) {
          setMetaDescription(descSetting.value);
        }
        
        const keywordsSetting = settings.settings.find(s => s.key === 'meta_keywords');
        if (keywordsSetting && keywordsSetting.value) {
          setMetaKeywords(keywordsSetting.value);
        }
      } catch (error) {
        console.error('Sayfa ayarları yüklenirken hata:', error);
      }
    };

    loadPageSettings();
  }, [user]);

  return (
    <HelmetProvider>
      <NotificationProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="App">
            <Helmet>
              <title>{pageTitle}</title>
              <meta name="description" content={metaDescription} />
              <meta name="keywords" content={metaKeywords} />
            </Helmet>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Auth Routes - Require authentication but no layout */}
            <Route 
              path="/auth/change-password" 
              element={
                <ProtectedRoute allowPasswordChange={true}>
                  <ChangePassword />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/admin/dashboard" 
              element={
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute requiredPermissions={['users.manage']}>
                  <MainLayout>
                    <Users />
                  </MainLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/my-employees" 
              element={
                <MainLayout>
                  <MyEmployees />
                </MainLayout>
              } 
            />
            <Route 
              path="/admin/employee-requests" 
              element={
                <MainLayout>
                  <EmployeeRequests />
                </MainLayout>
              } 
            />
            {/* YENİ TELEGRAM YAPISINA YÖNLENDİRME */}
            <Route 
              path="/admin/social-media/channels" 
              element={
                <MainLayout>
                  <SocialMediaChannelsOptimized />
                </MainLayout>
              } 
            />
            <Route 
              path="/admin/social-media/channels/:channelId" 
              element={
                <MainLayout>
                  <ChannelDetailOptimized />
                </MainLayout>
              } 
            />
            
            {/* YENİ TELEGRAM YAPISI */}
            <Route 
              path="/admin/telegram/bots" 
              element={
                <MainLayout>
                  <TelegramBots />
                </MainLayout>
              } 
            />
            <Route 
              path="/admin/telegram/bots/:botId" 
              element={
                <MainLayout>
                  <TelegramBotDetail />
                </MainLayout>
              } 
            />
            <Route 
              path="/admin/telegram/channels" 
              element={
                <MainLayout>
                  <SocialMediaChannelsOptimized />
                </MainLayout>
              } 
            />
            <Route 
              path="/admin/telegram/channels/:channelId" 
              element={
                <MainLayout>
                  <ChannelDetailOptimized />
                </MainLayout>
              } 
            />
            <Route 
              path="/admin/brands" 
              element={
                <MainLayout>
                  <Brands />
                </MainLayout>
              } 
            />
            <Route 
              path="/admin/brands/:id" 
              element={
                <MainLayout>
                  <BrandDetail />
                </MainLayout>
              } 
            />
            <Route 
              path="/admin/roles" 
              element={
                <ProtectedRoute requiredPermissions={['roles.manage']}>
                  <MainLayout>
                    <Roles />
                  </MainLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/media-gallery" 
              element={
                <ProtectedRoute requiredPermissions={['products.manage']}>
                  <MainLayout>
                    <MediaGallery />
                  </MainLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/products/:productId" 
              element={
                <ProtectedRoute requiredPermissions={['products.manage']}>
                  <MainLayout>
                    <ProductDetail />
                  </MainLayout>
                </ProtectedRoute>
              } 
            />
            {/* Template routes removed - only auto-collage system remains */}
            <Route 
              path="/admin/collages" 
              element={
                <ProtectedRoute requiredPermissions={['products.manage']}>
                  <MainLayout>
                    <Collages />
                  </MainLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/settings" 
              element={
                <ProtectedRoute requiredPermissions={['settings.manage']}>
                  <MainLayout>
                    <Settings />
                  </MainLayout>
                </ProtectedRoute>
              } 
            />

            {/* Raporlar ve sistem logları sayfaları kaldırıldı */}
            
            {/* Default Route */}
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            </div>
          </Router>
        </NotificationProvider>
      </HelmetProvider>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
