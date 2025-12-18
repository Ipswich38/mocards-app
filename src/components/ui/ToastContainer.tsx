import React from 'react';
import { useToast } from '../../hooks/useToast';
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react';
import { Toast } from '../../lib/toast';

const ToastIcon: React.FC<{ type: Toast['type'] }> = ({ type }) => {
  const iconProps = { size: 20 };

  switch (type) {
    case 'success':
      return <CheckCircle2 {...iconProps} className="text-green-500" />;
    case 'error':
      return <XCircle {...iconProps} className="text-red-500" />;
    case 'warning':
      return <AlertTriangle {...iconProps} className="text-yellow-500" />;
    case 'info':
      return <Info {...iconProps} className="text-blue-500" />;
    case 'loading':
      return <Loader2 {...iconProps} className="text-blue-500 animate-spin" />;
    default:
      return <Info {...iconProps} className="text-gray-500" />;
  }
};

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const { removeToast } = useToast();

  const bgColor = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
    loading: 'bg-blue-50 border-blue-200',
  };

  const textColor = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
    loading: 'text-blue-800',
  };

  return (
    <div
      className={`
        max-w-sm w-full ${bgColor[toast.type]} border rounded-lg shadow-lg p-4
        transform transition-all duration-300 ease-in-out
        hover:shadow-xl animate-in slide-in-from-right-full
      `}
    >
      <div className="flex items-start gap-3">
        <ToastIcon type={toast.type} />
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${textColor[toast.type]} text-sm`}>
            {toast.title}
          </h4>
          {toast.message && (
            <p className={`mt-1 text-sm ${textColor[toast.type]} opacity-90`}>
              {toast.message}
            </p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className={`
                mt-2 text-sm font-medium ${textColor[toast.type]}
                hover:underline focus:outline-none focus:underline
              `}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className={`
            ${textColor[toast.type]} opacity-60 hover:opacity-100
            transition-opacity focus:outline-none
          `}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-h-screen overflow-y-auto">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
};