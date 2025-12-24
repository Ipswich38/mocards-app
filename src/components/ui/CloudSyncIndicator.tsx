import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, WifiOff } from 'lucide-react';
import { useSyncStatus, type SyncStatus } from '../../lib/cloudSync';

interface CloudSyncIndicatorProps {
  compact?: boolean;
  showText?: boolean;
  className?: string;
}

export const CloudSyncIndicator: React.FC<CloudSyncIndicatorProps> = ({
  compact = false,
  showText = true,
  className = ''
}) => {
  const { status, lastSync, forceSync } = useSyncStatus();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const getStatusConfig = (currentStatus: SyncStatus, online: boolean) => {
    if (!online) {
      return {
        icon: WifiOff,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        text: 'Offline',
        description: 'Working offline. Will sync when connection is restored.'
      };
    }

    switch (currentStatus) {
      case 'synced':
        return {
          icon: Cloud,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          text: 'Synced',
          description: 'All data is synced across devices'
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          text: 'Syncing...',
          description: 'Syncing data across devices',
          animate: 'animate-spin'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          text: 'Sync Error',
          description: 'Failed to sync. Click to retry.'
        };
      case 'offline':
        return {
          icon: CloudOff,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          text: 'Offline',
          description: 'Working offline'
        };
      default:
        return {
          icon: Cloud,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          text: 'Unknown',
          description: 'Sync status unknown'
        };
    }
  };

  const config = getStatusConfig(status, isOnline);
  const Icon = config.icon;

  const handleClick = async () => {
    if (status === 'error' || (!isOnline && isOnline)) {
      await forceSync();
    }
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Never synced';
    const now = new Date();
    const diff = now.getTime() - lastSync.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return lastSync.toLocaleDateString();
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center space-x-1 px-2 py-1 rounded-md ${config.bgColor} hover:opacity-80 transition-opacity ${className}`}
        title={`${config.description}. Last sync: ${formatLastSync()}`}
      >
        <Icon className={`h-3 w-3 ${config.color} ${config.animate || ''}`} />
        {showText && (
          <span className={`text-xs font-medium ${config.color}`}>
            {config.text}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg ${config.bgColor} ${className}`}>
      <div className={`p-2 rounded-full bg-white`}>
        <Icon className={`h-4 w-4 ${config.color} ${config.animate || ''}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className={`text-sm font-semibold ${config.color}`}>
            Cloud Sync {config.text}
          </h4>
          {status === 'error' && (
            <button
              onClick={handleClick}
              className="text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Retry
            </button>
          )}
        </div>

        <p className="text-xs text-gray-600 mt-1">
          {config.description}
        </p>

        {lastSync && (
          <p className="text-xs text-gray-500 mt-1">
            Last sync: {formatLastSync()}
          </p>
        )}
      </div>

      {!isOnline && (
        <div className="flex items-center space-x-1 text-gray-500">
          <WifiOff className="h-3 w-3" />
          <span className="text-xs">Offline</span>
        </div>
      )}
    </div>
  );
};

export default CloudSyncIndicator;