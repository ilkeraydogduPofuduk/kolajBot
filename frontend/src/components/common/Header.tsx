import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, User } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const [logoUrl] = useState<string>('https://pofudukdijital.com/wp-content/uploads/2023/11/logo1.svg');

  // Logo loading removed - using default logo

  // Don't render header while loading user data
  if (loading || !user) return null;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 relative z-10">
      <div className="px-6 py-4 ml-64">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <User size={16} />
                <span className="font-medium">{user.first_name} {user.last_name}</span>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {user.role}
              </span>
            </div>
            
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              Çıkış
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
