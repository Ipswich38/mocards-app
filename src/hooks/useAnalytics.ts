import { useState, useEffect, useCallback } from 'react';
import { AnalyticsEngine } from '../lib/analytics';
import { useAsyncOperation } from './useAsyncOperation';
import { useToast } from './useToast';
import { toastInfo, toastError } from '../lib/toast';

interface AnalyticsDimensions {
  timeRange: '7d' | '30d' | '90d' | '1y' | 'all';
  clinicFilter?: string[];
  locationFilter?: string[];
  perkTypeFilter?: string[];
}

interface AnalyticsState {
  businessMetrics: any | null;
  revenueProjection: any[] | null;
  customerSegmentation: any[] | null;
  timeSeriesData: Record<string, any[]>;
  businessInsights: any | null;
  anomalies: any | null;
}

export const useAnalytics = (initialDimensions: AnalyticsDimensions = { timeRange: '30d' }) => {
  const [dimensions, setDimensions] = useState<AnalyticsDimensions>(initialDimensions);
  const [analyticsState, setAnalyticsState] = useState<AnalyticsState>({
    businessMetrics: null,
    revenueProjection: null,
    customerSegmentation: null,
    timeSeriesData: {},
    businessInsights: null,
    anomalies: null
  });

  const { addToast } = useToast();
  const { isLoading: metricsLoading, execute: executeMetrics } = useAsyncOperation();
  const { isLoading: projectionsLoading, execute: executeProjections } = useAsyncOperation();
  const { isLoading: segmentationLoading, execute: executeSegmentation } = useAsyncOperation();
  const { isLoading: insightsLoading, execute: executeInsights } = useAsyncOperation();

  const analytics = AnalyticsEngine.getInstance();

  // Load business metrics
  const loadBusinessMetrics = useCallback(async (dims = dimensions) => {
    const result = await executeMetrics(
      async () => {
        const data = await analytics.getBusinessMetrics(dims);
        return data;
      },
      {
        loadingMessage: 'Loading business metrics...',
        errorMessage: 'Failed to load business metrics',
        showSuccessToast: false,
        onSuccess: (data) => {
          setAnalyticsState(prev => ({ ...prev, businessMetrics: data }));
        },
        onError: (_error) => {
          addToast(toastError(
            'Analytics Error',
            'Failed to load business metrics. Using cached data.',
            {
              label: 'Retry',
              onClick: () => loadBusinessMetrics(dims)
            }
          ));
        }
      }
    );

    return result;
  }, [dimensions, executeMetrics, analytics, addToast]);

  // Load revenue projections
  const loadRevenueProjections = useCallback(async (dims = dimensions) => {
    const result = await executeProjections(
      async () => {
        const data = await analytics.getRevenueProjection(dims);
        return data;
      },
      {
        loadingMessage: 'Calculating revenue projections...',
        errorMessage: 'Failed to load revenue projections',
        showSuccessToast: false,
        onSuccess: (data) => {
          setAnalyticsState(prev => ({ ...prev, revenueProjection: data }));
        }
      }
    );

    return result;
  }, [dimensions, executeProjections, analytics]);

  // Load customer segmentation
  const loadCustomerSegmentation = useCallback(async () => {
    const result = await executeSegmentation(
      async () => {
        const data = await analytics.getCustomerSegmentation();
        return data;
      },
      {
        loadingMessage: 'Analyzing customer segments...',
        errorMessage: 'Failed to load customer segmentation',
        showSuccessToast: false,
        onSuccess: (data) => {
          setAnalyticsState(prev => ({ ...prev, customerSegmentation: data }));
        }
      }
    );

    return result;
  }, [executeSegmentation, analytics]);

  // Load business insights
  const loadBusinessInsights = useCallback(async () => {
    const result = await executeInsights(
      async () => {
        const data = await analytics.getBusinessInsights();
        return data;
      },
      {
        loadingMessage: 'Generating business insights...',
        errorMessage: 'Failed to load business insights',
        showSuccessToast: false,
        onSuccess: (data) => {
          setAnalyticsState(prev => ({ ...prev, businessInsights: data }));

          // Show important insights as toasts
          if (data.insights?.length > 0) {
            const highImpactInsights = data.insights.filter((i: any) => i.impact === 'high');
            if (highImpactInsights.length > 0) {
              addToast(toastInfo(
                'New Business Insight',
                highImpactInsights[0].message,
                {
                  label: 'View All',
                  onClick: () => {}
                }
              ));
            }
          }
        }
      }
    );

    return result;
  }, [executeInsights, analytics, addToast]);

  // Load time series data for specific metric
  const loadTimeSeriesData = useCallback(async (metric: string, dims = dimensions) => {
    try {
      const data = await analytics.getTimeSeriesData(metric, dims);
      setAnalyticsState(prev => ({
        ...prev,
        timeSeriesData: {
          ...prev.timeSeriesData,
          [metric]: data
        }
      }));
      return data;
    } catch (error) {
      addToast(toastError(
        'Data Loading Error',
        `Failed to load ${metric} data`,
        {
          label: 'Retry',
          onClick: () => loadTimeSeriesData(metric, dims)
        }
      ));
      return null;
    }
  }, [dimensions, analytics, addToast]);

  // Load anomaly detection
  const loadAnomalyDetection = useCallback(async (metric: string) => {
    try {
      const data = await analytics.getAnomalyDetection(metric);
      setAnalyticsState(prev => ({ ...prev, anomalies: data }));

      // Alert for high severity anomalies
      if (data.anomalies?.some((a: any) => a.severity === 'high')) {
        addToast(toastError(
          'Anomaly Detected',
          'High severity anomaly detected in your metrics',
          {
            label: 'Investigate',
            onClick: () => {}
          }
        ));
      }

      return data;
    } catch (error) {
      console.error('Failed to load anomaly detection:', error);
      return null;
    }
  }, [analytics, addToast]);

  // Refresh all analytics data
  const refreshAnalytics = useCallback(async (newDimensions?: AnalyticsDimensions) => {
    const dims = newDimensions || dimensions;
    if (newDimensions) {
      setDimensions(newDimensions);
    }

    // Clear cache for fresh data
    analytics.clearCache();

    // Load all data in parallel
    await Promise.allSettled([
      loadBusinessMetrics(dims),
      loadRevenueProjections(dims),
      loadCustomerSegmentation(),
      loadBusinessInsights(),
    ]);

    addToast(toastInfo(
      'Analytics Updated',
      'All metrics have been refreshed with the latest data'
    ));
  }, [
    dimensions,
    analytics,
    loadBusinessMetrics,
    loadRevenueProjections,
    loadCustomerSegmentation,
    loadBusinessInsights,
    addToast
  ]);

  // Auto-refresh analytics data
  useEffect(() => {
    loadBusinessMetrics();
    loadRevenueProjections();
    loadCustomerSegmentation();
    loadBusinessInsights();

    // Set up auto-refresh interval (every 5 minutes)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadBusinessMetrics();
        loadBusinessInsights();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [dimensions]);

  // Utility functions
  const formatMetric = useCallback((value: number, format: 'number' | 'currency' | 'percentage'): string => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'number':
        return new Intl.NumberFormat('en-US').format(Math.round(value));
      default:
        return value.toString();
    }
  }, []);

  const getMetricTrendIcon = useCallback((trend: 'up' | 'down' | 'stable'): string => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  }, []);

  const getMetricTrendColor = useCallback((trend: 'up' | 'down' | 'stable', isPositive: boolean = true): string => {
    const positiveUp = isPositive;

    switch (trend) {
      case 'up': return positiveUp ? 'text-green-400' : 'text-red-400';
      case 'down': return positiveUp ? 'text-red-400' : 'text-green-400';
      case 'stable': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  }, []);

  // Export functions
  const exportAnalyticsData = useCallback(async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const data = {
        businessMetrics: analyticsState.businessMetrics,
        revenueProjection: analyticsState.revenueProjection,
        customerSegmentation: analyticsState.customerSegmentation,
        generatedAt: new Date().toISOString(),
        dimensions
      };

      switch (format) {
        case 'json':
          const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const jsonUrl = URL.createObjectURL(jsonBlob);
          const jsonLink = document.createElement('a');
          jsonLink.href = jsonUrl;
          jsonLink.download = `mocards-analytics-${Date.now()}.json`;
          jsonLink.click();
          break;

        case 'csv':
          // Convert metrics to CSV format
          const csvData = convertMetricsToCSV(data.businessMetrics);
          const csvBlob = new Blob([csvData], { type: 'text/csv' });
          const csvUrl = URL.createObjectURL(csvBlob);
          const csvLink = document.createElement('a');
          csvLink.href = csvUrl;
          csvLink.download = `mocards-analytics-${Date.now()}.csv`;
          csvLink.click();
          break;

        case 'pdf':
          addToast(toastInfo(
            'PDF Export',
            'PDF export feature coming soon!'
          ));
          break;
      }

      addToast(toastInfo(
        'Export Complete',
        `Analytics data exported as ${format.toUpperCase()}`
      ));

    } catch (error) {
      addToast(toastError(
        'Export Failed',
        'Failed to export analytics data'
      ));
    }
  }, [analyticsState, dimensions, addToast]);

  // Return analytics interface
  return {
    // State
    dimensions,
    analyticsState,

    // Loading states
    isLoading: metricsLoading || projectionsLoading || segmentationLoading || insightsLoading,
    metricsLoading,
    projectionsLoading,
    segmentationLoading,
    insightsLoading,

    // Data loading functions
    loadBusinessMetrics,
    loadRevenueProjections,
    loadCustomerSegmentation,
    loadBusinessInsights,
    loadTimeSeriesData,
    loadAnomalyDetection,

    // Actions
    refreshAnalytics,
    setDimensions,
    exportAnalyticsData,

    // Utilities
    formatMetric,
    getMetricTrendIcon,
    getMetricTrendColor,

    // Cache management
    clearCache: () => analytics.clearCache(),
    getCacheStats: () => analytics.getCacheStats()
  };
};

// Utility function for CSV conversion
function convertMetricsToCSV(metrics: any): string {
  if (!metrics) return '';

  const rows = ['Metric,Value,Change,Trend'];

  Object.entries(metrics).forEach(([key, value]: [string, any]) => {
    if (typeof value === 'object' && value.value !== undefined) {
      rows.push(`${key},${value.value},${value.change || 0},${value.trend || 'stable'}`);
    }
  });

  return rows.join('\n');
}