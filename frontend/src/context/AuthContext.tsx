import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authAPI, User } from '../api/auth';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, twoFACode?: string) => Promise<{success: boolean, error?: string, user?: User}>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on app start
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const userData = await authAPI.getCurrentUser();
          setUser(userData);
        } catch (error: any) {
          // Token is invalid, clear it
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, twoFACode?: string): Promise<{success: boolean, error?: string, user?: User}> => {
    try {
      setLoading(true);
      const response = await authAPI.login({
        email,
        password,
        two_fa_code: twoFACode,
      });

      // Store tokens
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);

      // Set user data
      setUser(response.user);

      toast.success('Giriş başarılı!');

      return {
        success: true,
        user: response.user
      };
    } catch (error: any) {
      // Return error message to calling component
      const errorMessage = error.response?.data?.detail || error.message || 'Giriş başarısız';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };


  const logout = () => {
    // Clear tokens and user data
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    
    // Call logout API (optional)
    authAPI.logout().catch(() => {
      // Ignore errors on logout
    });
    
    toast.success('Başarıyla çıkış yapıldı');
  };

  const refreshUser = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
    } catch (error: any) {
      // If refresh fails, user might be logged out
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
