import React, { useState } from 'react';
import {
  TrendingUp, DollarSign, Users, CreditCard, Gift,
  BarChart3, PieChart, Download, RefreshCw, Target,
  AlertCircle, CheckCircle, ExternalLink, Filter, FileText
} from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { DashboardSkeleton } from './LoadingSkeletons';
import { ReportExportModal } from './ReportExportModal';

export const BusinessIntelligenceDashboard: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'customers' | 'insights'>('overview');
  const [showReportModal, setShowReportModal] = useState(false);

  const {
    analyticsState,
    isLoading,
    refreshAnalytics,
    formatMetric,
    getMetricTrendColor,
    getMetricTrendIcon,
    exportAnalyticsData,
    setDimensions
  } = useAnalytics({ timeRange: selectedTimeRange });

  const handleTimeRangeChange = (range: '7d' | '30d' | '90d' | '1y') => {
    setSelectedTimeRange(range);
    setDimensions({ timeRange: range });
  };

  const handleRefresh = () => {
    refreshAnalytics();
  };

  if (isLoading && !analyticsState.businessMetrics) {
    return <DashboardSkeleton />;
  }

  const { businessMetrics, businessInsights, customerSegmentation, revenueProjection } = analyticsState;

  // Metric Card Component
  const MetricCard: React.FC<{
    title: string;
    metric: any;
    icon: React.ComponentType<any>;
    isPositive?: boolean;
  }> = ({ title, metric, icon: Icon, isPositive = true }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 card-hover">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatMetric(metric?.value || 0, metric?.format || 'number')}
            </span>
            {metric?.change && (
              <span className={`text-sm flex items-center ${getMetricTrendColor(metric.trend, isPositive)}`}>
                {getMetricTrendIcon(metric.trend)} {Math.abs(metric.change)}%
              </span>
            )}
          </div>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
    </div>
  );

  // Insights Component
  const InsightsSection: React.FC = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Target className="h-5 w-5 mr-2" />
        Business Insights
      </h3>

      {businessInsights?.insights && (
        <div className="space-y-4 mb-6">
          {businessInsights.insights.map((insight: any, index: number) => (
            <div key={index} className={`p-4 rounded-lg border ${
              insight.type === 'success'
                ? 'bg-green-50 border-green-200'
                : insight.type === 'warning'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start">
                {insight.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3" />}
                {insight.type === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3" />}
                {insight.type === 'opportunity' && <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{insight.message}</p>
                  <span className={`text-xs px-2 py-1 rounded mt-2 inline-block ${
                    insight.impact === 'high'
                      ? 'bg-red-100 text-red-700'
                      : insight.impact === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {insight.impact.toUpperCase()} IMPACT
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {businessInsights?.recommendations && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Recommended Actions</h4>
          <div className="space-y-3">
            {businessInsights.recommendations.map((rec: any, index: number) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{rec.action}</p>
                    <p className="text-xs text-gray-600 mt-1">{rec.expectedImpact}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    rec.priority === 'high'
                      ? 'bg-red-100 text-red-700'
                      : rec.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {rec.priority.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Customer Segmentation Component
  const CustomerSegmentationSection: React.FC = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <PieChart className="h-5 w-5 mr-2" />
        Customer Segmentation
      </h3>

      {customerSegmentation && (
        <div className="space-y-4">
          {customerSegmentation.map((segment: any, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{segment.segment}</h4>
                <span className="text-sm font-medium text-blue-600">
                  {segment.count} customers
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Average Value</p>
                  <p className="font-semibold">{formatMetric(segment.value, 'currency')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Value</p>
                  <p className="font-semibold">
                    {formatMetric(segment.count * segment.value, 'currency')}
                  </p>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">Characteristics</p>
                <div className="flex flex-wrap gap-1">
                  {segment.characteristics.map((char: string, idx: number) => (
                    <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {char}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Recommendations</p>
                <div className="space-y-1">
                  {segment.recommendations.map((rec: string, idx: number) => (
                    <p key={idx} className="text-xs text-gray-700 flex items-center">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {rec}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Revenue Projection Component
  const RevenueProjectionSection: React.FC = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <BarChart3 className="h-5 w-5 mr-2" />
        Revenue Projections
      </h3>

      {revenueProjection && (
        <div className="space-y-3">
          {revenueProjection.slice(0, 6).map((projection: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{projection.period}</p>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-xs text-gray-500">
                    Conservative: {formatMetric(projection.conservative, 'currency')}
                  </span>
                  <span className="text-xs text-gray-500">
                    Optimistic: {formatMetric(projection.optimistic, 'currency')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-blue-600">
                  {formatMetric(projection.projected, 'currency')}
                </p>
                <p className="text-xs text-gray-500">{projection.confidence}% confidence</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Intelligence</h1>
          <p className="text-gray-600">Comprehensive analytics and insights dashboard</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Time Range Selector */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            {(['7d', '30d', '90d', '1y'] as const).map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedTimeRange === range
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Generate Professional Report"
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Export Report</span>
            </button>
            <button
              onClick={() => exportAnalyticsData('json')}
              className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              title="Quick Export as JSON"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={() => exportAnalyticsData('csv')}
              className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              title="Quick Export as CSV"
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'revenue', label: 'Revenue', icon: DollarSign },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'insights', label: 'Insights', icon: Target }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          {businessMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Revenue"
                metric={businessMetrics.totalRevenue}
                icon={DollarSign}
              />
              <MetricCard
                title="Active Cards"
                metric={businessMetrics.activeCards}
                icon={CreditCard}
              />
              <MetricCard
                title="Card Utilization"
                metric={businessMetrics.cardUtilizationRate}
                icon={TrendingUp}
              />
              <MetricCard
                title="Perk Redemption Rate"
                metric={businessMetrics.perkRedemptionRate}
                icon={Gift}
              />
            </div>
          )}

          {/* Insights */}
          <InsightsSection />
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {businessMetrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricCard
                  title="Total Revenue"
                  metric={businessMetrics.totalRevenue}
                  icon={DollarSign}
                />
                <MetricCard
                  title="Avg Transaction Value"
                  metric={businessMetrics.averageTransactionValue}
                  icon={TrendingUp}
                />
                <MetricCard
                  title="Customer LTV"
                  metric={businessMetrics.customerLifetimeValue}
                  icon={Users}
                />
                <MetricCard
                  title="Acquisition Cost"
                  metric={businessMetrics.customerAcquisitionCost}
                  icon={Target}
                  isPositive={false}
                />
              </div>
            </div>
          )}
          <RevenueProjectionSection />
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {businessMetrics && (
            <div className="lg:col-span-1 space-y-6">
              <MetricCard
                title="Daily Active Users"
                metric={businessMetrics.dailyActiveUsers}
                icon={Users}
              />
              <MetricCard
                title="Retention Rate"
                metric={businessMetrics.retentionRate}
                icon={TrendingUp}
              />
              <MetricCard
                title="Monthly Growth"
                metric={businessMetrics.monthlyGrowthRate}
                icon={BarChart3}
              />
            </div>
          )}
          <div className="lg:col-span-2">
            <CustomerSegmentationSection />
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-6">
          <InsightsSection />

          {/* Additional Insights Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Highlights</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-800">Best Performing Perk</span>
                  <span className="font-medium text-green-900">
                    {businessMetrics?.mostPopularPerk || 'Dental Cleaning'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-800">Security Score</span>
                  <span className="font-medium text-blue-900">98/100</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm text-purple-800">System Uptime</span>
                  <span className="font-medium text-purple-900">99.9%</span>
                </div>
              </div>
            </div>

            <RevenueProjectionSection />
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-gray-900">Updating analytics data...</span>
          </div>
        </div>
      )}

      {/* Report Export Modal */}
      <ReportExportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        analyticsData={analyticsState}
        title="Export MOCARDS Analytics Report"
      />
    </div>
  );
};