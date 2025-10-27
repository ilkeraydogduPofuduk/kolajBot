import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../api/auth';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ChangePassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Redirect if user doesn't need to change password
  useEffect(() => {
    if (user && !user.must_change_password) {
      navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  // Password validation
  const validatePassword = (password: string) => {
    const hasMinLength = password.length >= 8;
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return {
      isValid: hasMinLength && hasLetter && hasNumber,
      hasMinLength,
      hasLetter,
      hasNumber
    };
  };

  const passwordValidation = validatePassword(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newPassword || !confirmPassword) {
      toast.error('Lütfen tüm alanları doldurun', { duration: 5000 });
      return;
    }

    if (!passwordValidation.isValid) {
      toast.error('Şifre gereksinimleri karşılanmıyor', { duration: 5000 });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor', { duration: 5000 });
      return;
    }

    setLoading(true);
    
    try {
      await authAPI.forceChangePassword(newPassword);
      toast.success('Şifreniz başarıyla değiştirildi!', { duration: 5000 });
      
      // Refresh user data
      await refreshUser();
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 1000);
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Şifre değiştirme başarısız';
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Şifrenizi Değiştirin</h1>
          <p className="text-gray-600">Güvenliğiniz için yeni bir şifre oluşturun</p>
        </div>

        {/* Bilgilendirme */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Önemli:</strong> İlk giriş yaptığınız için güvenlik amacıyla şifrenizi değiştirmeniz gerekmektedir.
          </p>
        </div>

        {/* Form Kartı */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Yeni Şifre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yeni Şifre
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Şifre Gereksinimleri */}
            {newPassword && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-xs font-medium text-gray-700 mb-2">Şifre Gereksinimleri:</p>
                <div className="space-y-1">
                  <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasMinLength ? 'text-green-600' : 'text-gray-500'}`}>
                    <CheckCircle size={14} className={passwordValidation.hasMinLength ? 'text-green-600' : 'text-gray-400'} />
                    En az 8 karakter
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasLetter ? 'text-green-600' : 'text-gray-500'}`}>
                    <CheckCircle size={14} className={passwordValidation.hasLetter ? 'text-green-600' : 'text-gray-400'} />
                    En az bir harf
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                    <CheckCircle size={14} className={passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-400'} />
                    En az bir rakam
                  </div>
                </div>
              </div>
            )}

            {/* Şifre Tekrar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yeni Şifre (Tekrar)
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`input-field pr-12 ${confirmPassword && newPassword !== confirmPassword ? 'border-red-300 focus:ring-red-500' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1">
                  Şifreler eşleşmiyor
                </p>
              )}
            </div>

            {/* Değiştir Butonu */}
            <button
              type="submit"
              disabled={loading || !passwordValidation.isValid || newPassword !== confirmPassword}
              className="w-full btn btn-primary py-3 text-base font-semibold disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Değiştiriliyor...
                </div>
              ) : (
                'Şifreyi Değiştir'
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

export default ChangePassword;
