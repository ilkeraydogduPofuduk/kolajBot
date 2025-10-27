import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onSubmit: (email: string, password: string, twoFACode?: string) => void;
  loading: boolean;
  show2FA: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, loading, show2FA }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password, twoFACode || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="form-label">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-input"
          placeholder="Enter your email"
        />
      </div>
      
      <div>
        <label htmlFor="password" className="form-label">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input pr-10"
            placeholder="Enter your password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {show2FA && (
        <div>
          <label htmlFor="twoFACode" className="form-label">
            Two-Factor Authentication Code
          </label>
          <input
            id="twoFACode"
            name="twoFACode"
            type="text"
            value={twoFACode}
            onChange={(e) => setTwoFACode(e.target.value)}
            className="form-input"
            placeholder="Enter 6-digit code"
            maxLength={6}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the code from your authenticator app
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="spinner"></div>
            Signing in...
          </div>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  );
};

export default LoginForm;
