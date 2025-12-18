export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
}

export interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
  clearAllToasts: () => void;
}

export const generateToastId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createToast = (
  type: ToastType,
  title: string,
  message?: string,
  options?: Partial<Pick<Toast, 'duration' | 'action' | 'persistent'>>
): Omit<Toast, 'id'> => ({
  type,
  title,
  message,
  duration: options?.duration ?? (type === 'loading' ? undefined : 5000),
  action: options?.action,
  persistent: options?.persistent ?? type === 'loading',
});

// Pre-configured toast creators
export const toastSuccess = (title: string, message?: string, action?: Toast['action']) =>
  createToast('success', title, message, { action });

export const toastError = (title: string, message?: string, action?: Toast['action']) =>
  createToast('error', title, message, { action, duration: 7000 });

export const toastWarning = (title: string, message?: string, action?: Toast['action']) =>
  createToast('warning', title, message, { action });

export const toastInfo = (title: string, message?: string, action?: Toast['action']) =>
  createToast('info', title, message, { action });

export const toastLoading = (title: string, message?: string) =>
  createToast('loading', title, message, { persistent: true });