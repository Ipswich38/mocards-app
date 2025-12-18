import { useState, useCallback } from 'react';
import { ReportGenerator } from '../lib/reportGenerator';
import { useToast } from './useToast';
import { toastInfo, toastError, toastSuccess } from '../lib/toast';

interface ReportConfig {
  title: string;
  subtitle?: string;
  dateRange: { start: Date; end: Date };
  includeCharts: boolean;
  includeMetrics: boolean;
  includeBreakdown: boolean;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  template: 'executive' | 'detailed' | 'financial' | 'operational';
}

interface ReportProgress {
  stage: string;
  progress: number;
  message: string;
}

interface ReportGenerationState {
  isGenerating: boolean;
  progress: ReportProgress | null;
  currentToastId: string | null;
}

export const useReportGenerator = () => {
  const [state, setState] = useState<ReportGenerationState>({
    isGenerating: false,
    progress: null,
    currentToastId: null
  });

  const { addToast, removeToast } = useToast();
  const reportGenerator = ReportGenerator.getInstance();

  const generateReport = useCallback(async (
    config: ReportConfig,
    data: any
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    setState(prev => ({ ...prev, isGenerating: true, progress: null }));

    // Show initial loading toast
    const loadingToastId = addToast({
      type: 'loading',
      title: 'Generating Report',
      message: 'Preparing your analytics report...',
      duration: 0 // Persistent until removed
    });

    setState(prev => ({ ...prev, currentToastId: loadingToastId }));

    try {
      const result = await reportGenerator.generateReport(
        config,
        data,
        (progress: ReportProgress) => {
          setState(prev => ({ ...prev, progress }));

          // Update loading toast with progress
          if (loadingToastId) {
            removeToast(loadingToastId);
            const updatedToastId = addToast({
              type: 'loading',
              title: progress.stage === 'complete' ? 'Report Ready!' : 'Generating Report',
              message: `${progress.message} (${progress.progress}%)`,
              duration: progress.stage === 'complete' ? 3000 : 0
            });
            setState(prev => ({ ...prev, currentToastId: updatedToastId }));
          }
        }
      );

      // Remove loading toast
      if (state.currentToastId) {
        removeToast(state.currentToastId);
      }

      if (result.success) {
        addToast(toastSuccess(
          'Report Generated Successfully',
          `Your ${config.format.toUpperCase()} report has been downloaded`,
          {
            label: 'Generate Another',
            onClick: () => {}
          }
        ));
      } else {
        throw new Error(result.error || 'Report generation failed');
      }

      setState(prev => ({
        ...prev,
        isGenerating: false,
        progress: null,
        currentToastId: null
      }));

      return result;

    } catch (error) {
      // Remove loading toast
      if (state.currentToastId) {
        removeToast(state.currentToastId);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      addToast(toastError(
        'Report Generation Failed',
        errorMessage,
        {
          label: 'Retry',
          onClick: () => generateReport(config, data)
        }
      ));

      setState(prev => ({
        ...prev,
        isGenerating: false,
        progress: null,
        currentToastId: null
      }));

      return { success: false, error: errorMessage };
    }
  }, [addToast, removeToast, reportGenerator, state.currentToastId]);

  const quickExportMetrics = useCallback(async (metrics: any): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isGenerating: true }));

      const toastId = addToast(toastInfo(
        'Exporting Metrics',
        'Creating quick CSV export...'
      ));

      await ReportGenerator.quickExportMetrics(metrics);

      removeToast(toastId);
      addToast(toastSuccess(
        'Export Complete',
        'Metrics exported as CSV file'
      ));

    } catch (error) {
      addToast(toastError(
        'Export Failed',
        'Failed to export metrics data'
      ));
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  }, [addToast, removeToast]);

  const quickExportJSON = useCallback(async (data: any, filename?: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isGenerating: true }));

      const toastId = addToast(toastInfo(
        'Exporting Data',
        'Creating JSON export...'
      ));

      await ReportGenerator.quickExportJSON(data, filename);

      removeToast(toastId);
      addToast(toastSuccess(
        'Export Complete',
        'Data exported as JSON file'
      ));

    } catch (error) {
      addToast(toastError(
        'Export Failed',
        'Failed to export JSON data'
      ));
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  }, [addToast, removeToast]);

  const generateQuickReport = useCallback(async (
    template: 'executive' | 'detailed' | 'financial' | 'operational',
    format: 'pdf' | 'excel' | 'csv' | 'json',
    data: any
  ): Promise<void> => {
    const quickConfig: ReportConfig = {
      title: `MOCARDS ${template.charAt(0).toUpperCase() + template.slice(1)} Report`,
      subtitle: 'Generated from Business Intelligence Dashboard',
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        end: new Date()
      },
      includeCharts: template === 'detailed' || template === 'executive',
      includeMetrics: true,
      includeBreakdown: template === 'detailed' || template === 'financial',
      format,
      template
    };

    await generateReport(quickConfig, data);
  }, [generateReport]);

  const getReportTemplates = useCallback((): Array<{
    id: string;
    name: string;
    description: string;
    features: string[];
    recommendedFormat: string;
  }> => {
    return [
      {
        id: 'executive',
        name: 'Executive Summary',
        description: 'High-level overview for leadership and stakeholders',
        features: ['Key Metrics', 'Performance Trends', 'Strategic Insights'],
        recommendedFormat: 'pdf'
      },
      {
        id: 'detailed',
        name: 'Detailed Analysis',
        description: 'Comprehensive report with full analytics breakdown',
        features: ['Complete Metrics', 'Charts & Visualizations', 'Detailed Tables', 'Recommendations'],
        recommendedFormat: 'excel'
      },
      {
        id: 'financial',
        name: 'Financial Report',
        description: 'Focus on revenue, costs, and financial performance',
        features: ['Revenue Analysis', 'Financial Projections', 'Cost Breakdown', 'ROI Metrics'],
        recommendedFormat: 'excel'
      },
      {
        id: 'operational',
        name: 'Operational Metrics',
        description: 'Day-to-day operational performance and efficiency',
        features: ['Usage Statistics', 'Performance Metrics', 'Operational Insights'],
        recommendedFormat: 'csv'
      }
    ];
  }, []);

  const getSupportedFormats = useCallback((): Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    features: string[];
  }> => {
    return [
      {
        id: 'pdf',
        name: 'PDF Document',
        description: 'Professional formatted document for sharing and printing',
        icon: '📄',
        features: ['Professional Layout', 'Print Ready', 'Shareable']
      },
      {
        id: 'excel',
        name: 'Excel Spreadsheet',
        description: 'Structured data for further analysis and manipulation',
        icon: '📊',
        features: ['Data Analysis', 'Charts & Graphs', 'Pivot Tables']
      },
      {
        id: 'csv',
        name: 'CSV Data',
        description: 'Raw data export for use in other systems',
        icon: '📋',
        features: ['Universal Format', 'Database Import', 'Quick Analysis']
      },
      {
        id: 'json',
        name: 'JSON Data',
        description: 'Structured data for developers and API integration',
        icon: '⚙️',
        features: ['API Ready', 'Structured Format', 'Developer Friendly']
      }
    ];
  }, []);

  return {
    // State
    isGenerating: state.isGenerating,
    progress: state.progress,

    // Core functions
    generateReport,
    generateQuickReport,

    // Quick export functions
    quickExportMetrics,
    quickExportJSON,

    // Utility functions
    getReportTemplates,
    getSupportedFormats,

    // Progress utilities
    getProgressPercentage: () => state.progress?.progress || 0,
    getProgressMessage: () => state.progress?.message || '',
    getProgressStage: () => state.progress?.stage || 'idle'
  };
};