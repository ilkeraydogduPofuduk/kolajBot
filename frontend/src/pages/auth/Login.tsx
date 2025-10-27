import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
// import { authAPI } from '../../api/auth';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [show2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      toast.error('Lütfen tüm alanları doldurun', { duration: 5000 });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Geçerli bir e-posta adresi girin', { duration: 5000 });
      return;
    }

    // Password length validation
    if (password.length < 8) {
      toast.error('Şifre en az 8 karakter olmalıdır', { duration: 5000 });
      return;
    }

    setLoading(true);
    
    try {
      // Normal login - önce email/şifre doğrulama
      const result = await login(email, password, twoFACode || undefined);
      
      if (result.success && result.user) {
        // Check if user must change password
        if (result.user.must_change_password) {
          navigate('/auth/change-password');
        } else {
          // Successful login, redirect
          const redirect = searchParams.get('redirect');
          navigate(redirect || '/admin/dashboard');
        }
      } else if (result.error) {
        // Login failed - show error message from auth context
        const errorMessage = result.error;
        
        // Show detailed error message with longer duration
        if (errorMessage.includes('pasif durumda')) {
          toast.error('Hesabınız pasif durumda. Lütfen yönetici ile iletişime geçin.', { duration: 6000 });
        } else if (errorMessage.includes('kilitlendi')) {
          toast.error('Hesap geçici olarak kilitlendi. Çok fazla başarısız deneme.', { duration: 6000 });
        } else if (errorMessage.includes('2FA kodu gerekli')) {
          toast.error('İki faktörlü doğrulama kodu gerekli.', { duration: 6000 });
        } else if (errorMessage.includes('Geçersiz 2FA kodu')) {
          toast.error('Geçersiz doğrulama kodu. Lütfen tekrar deneyin.', { duration: 6000 });
        } else if (errorMessage.includes('kayıtlı değil')) {
          toast.error('Bu e-posta adresi sistemde kayıtlı değil.', { duration: 6000 });
        } else if (errorMessage.includes('Şifre hatalı')) {
          toast.error('Şifre hatalı. Lütfen doğru şifreyi girin.', { duration: 6000 });
        } else if (errorMessage.includes('Çok fazla başarısız giriş')) {
          toast.error('Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.', { duration: 6000 });
        } else {
          toast.error(errorMessage, { duration: 6000 });
        }
      }
      
    } catch (error: any) {
      // Fallback error handling
      const errorMessage = error.response?.data?.detail || error.message || 'Giriş başarısız';
      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo ve Başlık */}
        <div className="text-center mb-8">
          <img 
            src="/assets/images/logo.svg" 
            alt="Pofuduk DİJİTAL" 
            className="h-16 w-auto mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hoş Geldiniz</h1>
          <p className="text-gray-600">Hesabınıza giriş yapın</p>
        </div>

        {/* Login Kartı */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-posta
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`input-field ${email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="ornek@email.com"
              />
              {email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                <p className="text-xs text-red-600 mt-1">
                  Geçerli bir e-posta adresi girin
                </p>
              )}
            </div>

            {/* Şifre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`input-field pr-12 ${password.length > 0 && password.length < 8 ? 'border-red-300 focus:ring-red-500' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <p className="text-xs text-red-600 mt-1">
                  Şifre en az 8 karakter olmalıdır ({password.length}/8)
                </p>
              )}
            </div>

            {/* 2FA */}
            {show2FA && (
              <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-blue-900 mb-2">
                  Doğrulama Kodu
                </label>
                <input
                  type="text"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123456"
                  maxLength={6}
                />
                <p className="text-xs text-blue-600 mt-1">
                  Doğrulayıcı uygulamanızdan alın
                </p>
              </div>
            )}

            


            {/* Giriş Butonu */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3 text-base font-semibold disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Giriş yapılıyor...
                </div>
              ) : (
                'Giriş Yap'
              )}
            </button>

          </form>
        </div>

        {/* Alt Bilgi */}
        <p className="text-center text-xs text-gray-500 mt-6">
          © {new Date().getFullYear()} <a href="https://pofudukdijital.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">Pofuduk DİJİTAL</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
