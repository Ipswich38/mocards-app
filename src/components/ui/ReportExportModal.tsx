import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Calendar, Settings, Zap, Check, AlertCircle } from 'lucide-react';
import { useReportGenerator } from '../../hooks/useReportGenerator';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analyticsData: any;
  title?: string;
}

interface ReportConfigForm {
  title: string;
  subtitle: string;
  dateRange: { start: string; end: string };
  includeCharts: boolean;
  includeMetrics: boolean;
  includeBreakdown: boolean;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  template: 'executive' | 'detailed' | 'financial' | 'operational';
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  analyticsData,
  title = 'Export Analytics Report'
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'custom'>('quick');
  const [config, setConfig] = useState<ReportConfigForm>({
    title: 'MOCARDS Analytics Report',
    subtitle: 'Business Intelligence Dashboard Export',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    includeCharts: true,
    includeMetrics: true,
    includeBreakdown: true,
    format: 'pdf',
    template: 'executive'
  });

  const {
    isGenerating,
    generateReport,
    generateQuickReport,
    quickExportMetrics,
    quickExportJSON,
    getReportTemplates,
    getSupportedFormats,
    getProgressPercentage,
    getProgressMessage
  } = useReportGenerator();

  const templates = getReportTemplates();
  const formats = getSupportedFormats();

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('quick');
    }
  }, [isOpen]);

  const handleQuickExport = async (
    template: 'executive' | 'detailed' | 'financial' | 'operational',
    format: 'pdf' | 'excel' | 'csv' | 'json'
  ) => {
    await generateQuickReport(template, format, analyticsData);
  };

  const handleCustomExport = async () => {
    const reportConfig = {
      ...config,
      dateRange: {
        start: new Date(config.dateRange.start),
        end: new Date(config.dateRange.end)
      }
    };

    await generateReport(reportConfig, analyticsData);
  };

  const handleQuickMetricsExport = async () => {
    await quickExportMetrics(analyticsData?.businessMetrics);
  };

  const handleQuickJSONExport = async () => {
    await quickExportJSON(analyticsData, 'mocards-analytics-export.json');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500">Generate professional reports and exports</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isGenerating}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">
                    {getProgressMessage()}
                  </span>
                  <span className="text-sm text-blue-700">{getProgressPercentage()}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('quick')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'quick'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            disabled={isGenerating}
          >
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Quick Export</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'custom'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            disabled={isGenerating}
          >
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Custom Report</span>
            </div>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'quick' ? (
            <div className="p-6">
              {/* Quick Export Options */}
              <div className="space-y-6">
                {/* Instant Exports */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Instant Exports</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={handleQuickMetricsExport}
                      disabled={isGenerating}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">📊</div>
                        <div>
                          <h4 className="font-medium text-gray-900">Quick Metrics CSV</h4>
                          <p className="text-sm text-gray-500">Export current metrics as CSV</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={handleQuickJSONExport}
                      disabled={isGenerating}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">⚙️</div>
                        <div>
                          <h4 className="font-medium text-gray-900">Raw Data JSON</h4>
                          <p className="text-sm text-gray-500">Export all analytics data</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Report Templates */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Templates</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {templates.map((template) => (
                      <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
                          <p className="text-sm text-gray-600 mb-3">{template.description}</p>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {template.features.map((feature) => (
                              <span
                                key={feature}
                                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {formats.map((format) => (
                            <button
                              key={format.id}
                              onClick={() => handleQuickExport(template.id as any, format.id as any)}
                              disabled={isGenerating}
                              className="flex items-center space-x-2 p-2 text-sm border border-gray-200 rounded hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="text-lg">{format.icon}</span>
                              <span className="font-medium">{format.name.split(' ')[0]}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* Custom Report Configuration */}
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Report Title
                      </label>
                      <input
                        type="text"
                        value={config.title}
                        onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isGenerating}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subtitle (Optional)
                      </label>
                      <input
                        type="text"
                        value={config.subtitle}
                        onChange={(e) => setConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isGenerating}
                      />
                    </div>
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Date Range
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={config.dateRange.start}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isGenerating}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={config.dateRange.end}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isGenerating}
                      />
                    </div>
                  </div>
                </div>

                {/* Template Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Template</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setConfig(prev => ({ ...prev, template: template.id as any }))}
                        disabled={isGenerating}
                        className={`p-4 border rounded-lg text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          config.template === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                          {config.template === template.id && (
                            <Check className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        <div className="text-xs text-blue-600">
                          Recommended: {template.recommendedFormat.toUpperCase()}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Format</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {formats.map((format) => (
                      <button
                        key={format.id}
                        onClick={() => setConfig(prev => ({ ...prev, format: format.id as any }))}
                        disabled={isGenerating}
                        className={`p-3 border rounded-lg text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          config.format === format.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">{format.icon}</div>
                        <div className="font-medium text-sm text-gray-900 mb-1">{format.name}</div>
                        <div className="text-xs text-gray-500">{format.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Options */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Options</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.includeMetrics}
                        onChange={(e) => setConfig(prev => ({ ...prev, includeMetrics: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={isGenerating}
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">Include Key Metrics</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.includeCharts}
                        onChange={(e) => setConfig(prev => ({ ...prev, includeCharts: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={isGenerating}
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">Include Charts & Visualizations</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.includeBreakdown}
                        onChange={(e) => setConfig(prev => ({ ...prev, includeBreakdown: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={isGenerating}
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">Include Detailed Breakdown</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <AlertCircle className="h-4 w-4" />
            <span>Reports may take a few moments to generate</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            {activeTab === 'custom' && (
              <button
                onClick={handleCustomExport}
                disabled={isGenerating || !config.title.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                <span>{isGenerating ? 'Generating...' : 'Generate Report'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};