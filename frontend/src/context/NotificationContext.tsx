import React, { createContext, useContext, ReactNode } from 'react';
import toast, { Toaster, Toast } from 'react-hot-toast';
import { CheckCircle, XCircle, Info, AlertTriangle, Loader } from 'lucide-react';

interface NotificationContextType {
  success: (message: string, options?: Partial<Toast>) => void;
  error: (message: string, options?: Partial<Toast>) => void;
  info: (message: string, options?: Partial<Toast>) => void;
  warning: (message: string, options?: Partial<Toast>) => void;
  loading: (message: string, options?: Partial<Toast>) => string;
  dismiss: (toastId?: string) => void;
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => Promise<T>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const success = (message: string, options?: Partial<Toast>) => {
    toast.success(message, {
      duration: 4000,
      icon: <CheckCircle className="text-green-500" size={20} />,
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
      ...options
    });
  };

  const error = (message: string, options?: Partial<Toast>) => {
    toast.error(message, {
      duration: 5000,
      icon: <XCircle className="text-red-500" size={20} />,
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
      ...options
    });
  };

  const info = (message: string, options?: Partial<Toast>) => {
    toast(message, {
      duration: 4000,
      icon: <Info className="text-blue-500" size={20} />,
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
      ...options
    });
  };

  const warning = (message: string, options?: Partial<Toast>) => {
    toast(message, {
      duration: 4000,
      icon: <AlertTriangle className="text-yellow-500" size={20} />,
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
      ...options
    });
  };

  const loading = (message: string, options?: Partial<Toast>): string => {
    return toast.loading(message, {
      icon: <Loader className="text-blue-500 animate-spin" size={20} />,
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
      ...options
    });
  };

  const dismiss = (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  };

  const promiseNotification = async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ): Promise<T> => {
    return toast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
        success: {
          icon: <CheckCircle className="text-green-500" size={20} />,
        },
        error: {
          icon: <XCircle className="text-red-500" size={20} />,
        },
        loading: {
          icon: <Loader className="text-blue-500 animate-spin" size={20} />,
        },
      }
    );
  };

  return (
    <NotificationContext.Provider
      value={{
        success,
        error,
        info,
        warning,
        loading,
        dismiss,
        promise: promiseNotification,
      }}
    >
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          className: '',
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </NotificationContext.Provider>
  );
};

